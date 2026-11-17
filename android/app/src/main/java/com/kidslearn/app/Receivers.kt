package com.kidslearn.app

import android.app.admin.DeviceAdminReceiver
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 시간 칸이 시작하거나 끝날 때 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = Lock.onWake(context)
}

/** 기기를 켰을 때, 앱을 업데이트했을 때, 시계를 바꿨을 때 알람을 다시 맞춘다 */
class BootReceiver : BroadcastReceiver() {
    private val actions = setOf(
        Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED, "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in actions) Lock.onWake(context)
    }
}

/** 기기 관리자(Device Owner). adb로 한 번 지정하면 잠금(Lock Task)을 쓸 수 있다 */
class LockAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Lock.allowLockTask(context)
        Lock.reschedule(context)
    }
}
