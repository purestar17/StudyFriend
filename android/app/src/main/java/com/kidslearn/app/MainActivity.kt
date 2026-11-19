package com.kidslearn.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File
import java.util.Locale

/**
 * 웹 버전(assets/web)을 그대로 보여 주는 화면.
 * 학습 시간표에 따라 화면을 잠그고(Lock Task), 오늘의 과제를 끝내면 푼다.
 */
class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var cameraUri: Uri? = null
    private var pinPromptedKey: String? = null
    private val ai by lazy { ChatGpt(applicationContext) }
    private val aiWork = java.util.concurrent.Executors.newCachedThreadPool()

    private val pickFile = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val cb = fileCallback ?: return@registerForActivityResult
        fileCallback = null
        val picked = r.data?.data
        val shot = cameraUri?.takeIf { r.resultCode == RESULT_OK && picked == null && photoFile().length() > 0 }
        cb.onReceiveValue(
            when {
                r.resultCode != RESULT_OK -> null
                picked != null -> arrayOf(picked)
                shot != null -> arrayOf(shot)
                else -> null
            },
        )
    }

    private val checkReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = evaluateLock()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US
                tts?.setSpeechRate(0.85f)
                ttsReady = true
            }
        }

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            addJavascriptInterface(Bridge(), "StudyFriendApp")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == HOST) return false
                    openExternal(request.url.toString())
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    return choosePhoto(params)
                }
            }
        }
        setContentView(web)
        // 화면 가장자리(상태 표시줄, 키보드)를 피해서 보여 준다
        ViewCompat.setOnApplyWindowInsetsListener(web) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            WindowInsetsCompat.CONSUMED
        }
        if (savedInstanceState == null) web.loadUrl("https://$HOST/assets/web/index.html")
        else web.restoreState(savedInstanceState)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // 웹 화면에서 한 단계 뒤로. 처음 화면이면 앱을 닫는다(잠금 중에는 닫지 않음)
                web.evaluateJavascript("window.sfBack ? sfBack() : false") { r ->
                    if (r != "true" && !inLockTask()) finish()
                }
            }
        })
        ContextCompat.registerReceiver(this, checkReceiver, IntentFilter(Lock.ACTION_CHECK), ContextCompat.RECEIVER_NOT_EXPORTED)
        Lock.allowLockTask(this)
        Lock.reschedule(this)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        evaluateLock()
    }

    override fun onPause() {
        // 앱을 닫거나 다른 앱으로 갈 때 연습장을 그림으로 저장
        web.evaluateJavascript("window.Notepad && Notepad.saveNow()", null)
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        unregisterReceiver(checkReceiver)
        tts?.shutdown()
        web.destroy()
        super.onDestroy()
    }

    private fun inLockTask(): Boolean =
        getSystemService(ActivityManager::class.java).lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE

    /** 지금 잠가야 하는지 보고 잠그거나 푼다. 웹 화면에도 알려서 학습 카드를 새로 그린다 */
    private fun evaluateLock() {
        val lock = Lock.shouldLockNow(this)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(lock)
            setTurnScreenOn(lock)
        }
        if (lock) {
            Lock.allowLockTask(this)
            Lock.setStudyHome(this, true)
            if (!inLockTask()) {
                // 기기 관리자가 아니면 '화면 고정' 확인 창이 뜬다. 같은 시간 칸에는 한 번만 묻는다
                val key = Lock.activeKey(this)
                if (Lock.isDeviceOwner(this) || pinPromptedKey != key) {
                    pinPromptedKey = key
                    try { startLockTask() } catch (_: Exception) { }
                }
            }
        } else {
            Lock.setStudyHome(this, false)
            if (inLockTask()) try { stopLockTask() } catch (_: Exception) { }
        }
        if (::web.isInitialized) web.evaluateJavascript("window.onStudyLock && onStudyLock()", null)
    }

    private fun openExternal(url: String) {
        val uri = Uri.parse(url)
        val view = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        // ChatGPT 주소는 ChatGPT 앱으로 연다 (잠금 중에도 열 수 있는 앱)
        val isChat = uri.host?.endsWith("chatgpt.com") == true || uri.host == "chat.openai.com"
        // ChatGPT 로그인 창은 꼭 브라우저로 연다 (앱으로 열리면 로그인이 돌아오지 않는다)
        if (uri.host == "auth.openai.com") {
            val browser = packageManager.resolveActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com")), PackageManager.MATCH_DEFAULT_ONLY)
                ?.activityInfo?.packageName?.takeIf { it != "android" }
            try { startActivity(Intent(view).apply { if (browser != null) setPackage(browser) }); return } catch (_: Exception) { }
        }
        if (isChat && Lock.chatGptInstalled(this)) {
            try { startActivity(Intent(view).setPackage(Lock.CHATGPT)); return } catch (_: Exception) { }
        }
        try {
            startActivity(view)
        } catch (_: Exception) {
            Toast.makeText(this, if (inLockTask()) "학습 시간에는 열 수 없어요" else "열 수 있는 앱이 없어요", Toast.LENGTH_SHORT).show()
        }
    }

    private fun photoFile() = File(cacheDir, "photos/word-list.jpg")

    /** 단어장 사진: 앨범에서 고르거나 카메라로 찍기 */
    private fun choosePhoto(params: WebChromeClient.FileChooserParams): Boolean {
        val pick = params.createIntent()
        val extra = mutableListOf<Intent>()
        try {
            val f = photoFile()
            f.parentFile?.mkdirs()
            f.delete()
            val uri = FileProvider.getUriForFile(this, "$packageName.files", f)
            cameraUri = uri
            extra += Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (_: Exception) {
            cameraUri = null
        }
        val chooser = Intent.createChooser(pick, "단어장 사진").putExtra(Intent.EXTRA_INITIAL_INTENTS, extra.toTypedArray())
        return try {
            pickFile.launch(chooser); true
        } catch (_: Exception) {
            fileCallback = null; false
        }
    }

    /** 웹 화면에서 부르는 기능. window.StudyFriendApp.xxx() */
    inner class Bridge {
        @JavascriptInterface
        fun speak(text: String) {
            if (ttsReady) tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "say")
        }

        @JavascriptInterface
        fun copy(text: String) = runOnUiThread {
            getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("공부 친구", text))
        }

        @JavascriptInterface
        fun getStatus(): String = JSONObject()
            .put("app", true)
            .put("version", BuildConfigVersion)
            .put("deviceOwner", Lock.isDeviceOwner(this@MainActivity))
            .put("locked", inLockTask())
            .put("pinned", getSystemService(ActivityManager::class.java).lockTaskModeState == ActivityManager.LOCK_TASK_MODE_PINNED)
            .put("shouldLock", Lock.shouldLockNow(this@MainActivity))
            .put("activeKey", Lock.activeKey(this@MainActivity) ?: JSONObject.NULL)
            .put("released", Lock.activeKey(this@MainActivity)?.let { it in Lock.doneKeys(this@MainActivity) } ?: false)
            .put("exactAlarm", Lock.canExactAlarm(this@MainActivity))
            .put("chatgpt", Lock.chatGptInstalled(this@MainActivity))
            .toString()

        /** 관리자가 시간표를 저장할 때, 앱을 켤 때 */
        @JavascriptInterface
        fun setSchedule(json: String) = runOnUiThread {
            Lock.saveSchedule(this@MainActivity, json)
            if (Schedule.parse(json).enabled && !Lock.isDeviceOwner(this@MainActivity) && Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
            evaluateLock()
        }

        /** 오늘의 과제를 다 했을 때. 지금 시간 칸의 열쇠가 맞을 때만 푼다 */
        @JavascriptInterface
        fun studyComplete(key: String): Boolean {
            if (Lock.activeKey(this@MainActivity) != key) return false
            Lock.markDone(this@MainActivity, key)
            runOnUiThread { evaluateLock() }
            return true
        }

        /** 관리자 비밀번호를 넣고 '지금 잠금 풀기' */
        @JavascriptInterface
        fun adminRelease(): Boolean {
            val key = Lock.activeKey(this@MainActivity) ?: return false
            Lock.markDone(this@MainActivity, key)
            runOnUiThread { evaluateLock() }
            return true
        }

        /** 풀어 둔 이번 학습 시간을 다시 잠근다 */
        @JavascriptInterface
        fun adminRelock(): Boolean {
            val key = Lock.activeKey(this@MainActivity) ?: return false
            Lock.unmarkDone(this@MainActivity, key)
            runOnUiThread { evaluateLock() }
            return true
        }

        /** 연습장 그림을 갤러리 '공부친구' 앨범에 저장 (같은 이름이면 덮어씀). Android 10 이상 */
        @JavascriptInterface
        fun saveImage(name: String, base64: String): Boolean {
            if (Build.VERSION.SDK_INT < 29) return false
            return try {
                val bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
                val r = contentResolver
                val col = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                val dir = "Pictures/공부친구/"
                val existing = r.query(col, arrayOf(MediaStore.Images.Media._ID),
                    "${MediaStore.Images.Media.DISPLAY_NAME}=? AND ${MediaStore.Images.Media.RELATIVE_PATH}=?", arrayOf(name, dir), null,
                )?.use { c -> if (c.moveToFirst()) android.content.ContentUris.withAppendedId(col, c.getLong(0)) else null }
                val uri = existing ?: r.insert(col, android.content.ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, name)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                    put(MediaStore.Images.Media.RELATIVE_PATH, dir)
                }) ?: return false
                r.openOutputStream(uri, "wt")?.use { it.write(bytes) } ?: return false
                true
            } catch (_: Exception) {
                false
            }
        }

        // ---- AI (ChatGPT 계정). 오래 걸리는 일은 뒤에서 하고 window.__aiDone(id, ok, 값)으로 돌려준다 ----
        @JavascriptInterface
        fun aiStatus(): String = ai.status().toString()

        @JavascriptInterface
        fun aiSignIn(id: String) = aiJob(id) {
            if (inLockTask()) throw AiError("학습 시간 잠금 중에는 로그인할 수 없어요. 잠금을 푼 뒤 해 주세요.")
            ai.signIn { url -> runOnUiThread { openExternal(url) } }
            // 로그인 창(브라우저)에서 앱으로 돌아오기
            runOnUiThread {
                try { startActivity(Intent(this@MainActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)) } catch (_: Exception) { }
            }
            ai.status().toString()
        }

        @JavascriptInterface
        fun aiCancel() = ai.cancel()

        @JavascriptInterface
        fun aiSignOut(id: String) = aiJob(id) { ai.signOut(); ai.status().toString() }

        @JavascriptInterface
        fun aiModels(id: String) = aiJob(id) { ai.models().toString() }

        @JavascriptInterface
        fun aiChat(id: String, model: String, system: String, user: String) = aiJob(id) { ai.chat(model, system, user) }

        @JavascriptInterface
        fun openExternal(url: String) = runOnUiThread { this@MainActivity.openExternal(url) }

        @JavascriptInterface
        fun openAlarmSettings() = runOnUiThread {
            if (Build.VERSION.SDK_INT >= 31) try {
                startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
            } catch (_: Exception) { }
        }

        @JavascriptInterface
        fun clearDeviceOwner() = runOnUiThread {
            if (inLockTask()) try { stopLockTask() } catch (_: Exception) { }
            Lock.clearDeviceOwner(this@MainActivity)
            evaluateLock()
        }
    }

    private fun aiJob(id: String, work: () -> String) {
        aiWork.execute {
            val (ok, value) = try { true to work() } catch (e: AiError) { false to (e.message ?: "AI 오류") } catch (e: Exception) { false to "AI를 쓰지 못했어요. 다시 해 주세요." }
            runOnUiThread {
                if (::web.isInitialized) web.evaluateJavascript("window.__aiDone && __aiDone(${JSONObject.quote(id)}, $ok, ${JSONObject.quote(value)})", null)
            }
        }
    }

    companion object {
        const val HOST = "appassets.androidplatform.net"
        const val BuildConfigVersion = "0.4.0"
    }
}
