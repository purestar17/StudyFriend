package com.kidslearn.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import java.time.LocalDateTime
import java.time.ZoneId

/** 시간표 저장, 알람 맞추기, 기기 관리자(Device Owner) 설정을 한곳에 모은다 */
object Lock {
    const val CHATGPT = "com.openai.chatgpt"
    const val ACTION_CHECK = "com.kidslearn.app.CHECK_LOCK"
    private const val PREFS = "lock"
    private const val CHANNEL = "study_time"

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun schedule(ctx: Context): Schedule = Schedule.parse(prefs(ctx).getString("schedule", null))

    fun saveSchedule(ctx: Context, json: String) {
        prefs(ctx).edit().putString("schedule", json).apply()
        reschedule(ctx)
    }

    fun doneKeys(ctx: Context): Set<String> = prefs(ctx).getStringSet("done", emptySet()) ?: emptySet()

    /** 이 시간 칸을 끝냄(과제 완료 또는 관리자 해제). 오래된 기록은 지운다 */
    fun markDone(ctx: Context, key: String) {
        val today = LocalDateTime.now().toLocalDate().minusDays(7).toString()
        val keep = doneKeys(ctx).filter { it.substringBefore('#') >= today }.toMutableSet()
        keep += key
        prefs(ctx).edit().putStringSet("done", keep).apply()
    }

    /** 관리자가 '다시 잠그기'를 누르면 이 시간 칸을 끝내지 않은 것으로 되돌린다 */
    fun unmarkDone(ctx: Context, key: String) {
        prefs(ctx).edit().putStringSet("done", doneKeys(ctx) - key).apply()
    }

    fun activeKey(ctx: Context): String? = schedule(ctx).activeKey(LocalDateTime.now())

    fun shouldLockNow(ctx: Context): Boolean = shouldLock(schedule(ctx), LocalDateTime.now(), doneKeys(ctx))

    // ---- 알람: 다음 시작·끝 시각에 한 번씩 깨운다 ----
    private fun alarmIntent(ctx: Context): PendingIntent = PendingIntent.getBroadcast(
        ctx, 1, Intent(ctx, AlarmReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    fun canExactAlarm(ctx: Context): Boolean {
        val am = ctx.getSystemService(AlarmManager::class.java)
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
    }

    fun reschedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pi = alarmIntent(ctx)
        am.cancel(pi)
        val next = schedule(ctx).nextBoundary(LocalDateTime.now()) ?: return
        val at = next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() + 1000
        try {
            if (canExactAlarm(ctx)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } catch (e: SecurityException) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    /** 알람·부팅 때 호출: 잠글 시간이면 앱을 앞으로 띄우고, 끝났으면 열려 있는 앱에 다시 확인하라고 알린다 */
    fun onWake(ctx: Context) {
        reschedule(ctx)
        if (shouldLockNow(ctx)) {
            setStudyHome(ctx, true)
            launch(ctx)
        } else {
            // 잠금 중이면 열려 있는 앱이 먼저 잠금을 풀고 홈 설정을 되돌린다 (순서가 바뀌면 상단바·홈이 꼬인다)
            if (inLockTask(ctx)) endLockTask(ctx)
            if (!inLockTask(ctx)) setStudyHome(ctx, false)
            ctx.sendBroadcast(Intent(ACTION_CHECK).setPackage(ctx.packageName))
        }
    }

    private fun launch(ctx: Context) {
        val open = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        // 기기 관리자 앱은 뒤에서도 화면을 띄울 수 있다. 아니면 알림으로 연다.
        if (isDeviceOwner(ctx)) {
            try { ctx.startActivity(open); return } catch (_: Exception) { }
        }
        notifyStudyTime(ctx, open)
    }

    private fun notifyStudyTime(ctx: Context, open: Intent) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "학습 시간", NotificationManager.IMPORTANCE_HIGH))
        val pi = PendingIntent.getActivity(ctx, 2, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = android.app.Notification.Builder(ctx, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_edit)
            .setContentTitle("공부할 시간이에요")
            .setContentText("눌러서 오늘의 과제를 시작해요")
            .setCategory(android.app.Notification.CATEGORY_REMINDER)
            .setContentIntent(pi)
            .setAutoCancel(true)
        // 화면이 켜져 있을 때만 바로 띄운다 (꺼진 화면을 깨우지 않게)
        if (ctx.getSystemService(android.os.PowerManager::class.java).isInteractive) n.setFullScreenIntent(pi, true)
        try { nm.notify(1, n.build()) } catch (_: SecurityException) { }
    }

    // ---- 기기 관리자 ----
    fun admin(ctx: Context) = ComponentName(ctx, LockAdminReceiver::class.java)
    private fun dpm(ctx: Context) = ctx.getSystemService(DevicePolicyManager::class.java)
    fun isDeviceOwner(ctx: Context) = dpm(ctx).isDeviceOwnerApp(ctx.packageName)

    fun chatGptInstalled(ctx: Context) = try {
        ctx.packageManager.getPackageInfo(CHATGPT, 0); true
    } catch (_: PackageManager.NameNotFoundException) { false }

    /** 잠금 중 열 수 있는 앱(이 앱 + ChatGPT)과 잠금 중 쓸 수 있는 기능을 정한다 */
    fun allowLockTask(ctx: Context) {
        if (!isDeviceOwner(ctx)) return
        val d = dpm(ctx)
        d.setLockTaskPackages(admin(ctx), arrayOf(ctx.packageName, CHATGPT))
        if (Build.VERSION.SDK_INT >= 28) {
            d.setLockTaskFeatures(
                admin(ctx),
                DevicePolicyManager.LOCK_TASK_FEATURE_GLOBAL_ACTIONS or // 전원 메뉴
                    DevicePolicyManager.LOCK_TASK_FEATURE_HOME or // 홈 버튼 → 이 앱
                    DevicePolicyManager.LOCK_TASK_FEATURE_KEYGUARD, // 화면 잠금(비밀번호)은 그대로
            )
        }
    }

    fun inLockTask(ctx: Context) =
        ctx.getSystemService(android.app.ActivityManager::class.java).lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE

    /**
     * 잠금(Lock Task)을 확실히 끝낸다. 화면의 stopLockTask()만으로는 삼성 기기에서 잠금이 남는 일이 있어서,
     * 기기 관리자 권한으로 '잠금 중 허용 앱' 목록을 비운다. 목록에서 빠진 앱의 잠금은 시스템이 바로 끝낸다.
     * 다음 학습 시간에 잠글 때 allowLockTask()가 목록을 다시 채운다.
     */
    fun endLockTask(ctx: Context) {
        if (!isDeviceOwner(ctx)) return
        try { dpm(ctx).setLockTaskPackages(admin(ctx), arrayOf()) } catch (e: Exception) { android.util.Log.w("StudyFriend", "endLockTask", e) }
    }

    /** 학습 시간 동안 이 앱을 기본 홈 화면으로: 홈 버튼을 눌러도, 화면을 다시 켜도 이 앱이 나온다.
     *  이미 그 상태면 아무것도 바꾸지 않는다 (바꿀 때마다 시스템과 홈 앱이 앱 목록을 다시 읽어 버벅인다) */
    fun setStudyHome(ctx: Context, on: Boolean) {
        val p = prefs(ctx)
        val alias = ComponentName(ctx, "${ctx.packageName}.StudyHome")
        val want = if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        val owner = isDeviceOwner(ctx)
        if (ctx.packageManager.getComponentEnabledSetting(alias) == want && p.getBoolean("homeSet", false) == (on && owner)) return
        ctx.packageManager.setComponentEnabledSetting(alias, want, PackageManager.DONT_KILL_APP)
        p.edit().putBoolean("homeSet", on && owner).apply()
        if (!owner) return
        val d = dpm(ctx)
        d.clearPackagePersistentPreferredActivities(admin(ctx), ctx.packageName)
        if (on) {
            val filter = IntentFilter(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME); addCategory(Intent.CATEGORY_DEFAULT)
            }
            d.addPersistentPreferredActivity(admin(ctx), filter, alias)
        }
    }

    /** 관리자가 기기 관리자 지정을 없앤다 (앱을 지우려면 먼저 해야 함) */
    @Suppress("DEPRECATION")
    fun clearDeviceOwner(ctx: Context) {
        if (!isDeviceOwner(ctx)) return
        setStudyHome(ctx, false)
        dpm(ctx).setLockTaskPackages(admin(ctx), arrayOf())
        dpm(ctx).clearDeviceOwnerApp(ctx.packageName)
    }
}
