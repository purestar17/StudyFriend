package com.kidslearn.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.math.BigInteger
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.ServerSocket
import java.net.URL
import java.net.URLDecoder
import java.net.URLEncoder
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PublicKey
import java.security.SecureRandom
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import java.security.spec.RSAPublicKeySpec
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * ChatGPT 계정으로 로그인(OpenAI 'Sign in with ChatGPT' 토큰 공유).
 * API 키 없이 관리자의 ChatGPT 정액제(Go·Plus·Pro) 사용량으로 AI를 쓴다.
 * 브라우저에서 로그인하면 이 기기의 127.0.0.1로 돌아온다(OAuth + PKCE).
 * https://developers.openai.com/siwc/token-sharing-open-source/sign-in
 * (사용자의 HaniClinicApp chatgpt.ts와 같은 흐름)
 */
class AiError(message: String) : Exception(message)

data class ChatGptAuth(
    val clientId: String,
    val email: String,
    val idToken: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long,
    val scopes: List<String>,
) {
    fun toJson(): String = JSONObject()
        .put("clientId", clientId).put("email", email).put("idToken", idToken)
        .put("accessToken", accessToken).put("refreshToken", refreshToken)
        .put("expiresAt", expiresAt).put("scopes", JSONArray(scopes)).toString()

    companion object {
        fun fromJson(s: String): ChatGptAuth {
            val o = JSONObject(s)
            val sc = o.optJSONArray("scopes") ?: JSONArray()
            return ChatGptAuth(
                o.getString("clientId"), o.optString("email"), o.optString("idToken"),
                o.getString("accessToken"), o.optString("refreshToken"), o.getLong("expiresAt"),
                (0 until sc.length()).map { sc.getString(it) },
            )
        }
    }
}

/** 기기와 상관없는 부분 (단위 검사 대상) */
object ChatGptCore {
    const val ISSUER = "https://auth.openai.com"
    const val AUTHORIZE_URL = "$ISSUER/api/accounts/authorize"
    const val TOKEN_URL = "$ISSUER/api/accounts/oauth/token"
    const val CONFIG_URL = "$ISSUER/.well-known/openid-configuration"
    const val RESOURCE = "https://api.openai.com/v1"
    const val PLAN_SCOPE = "chatgpt.tokens.use.direct"
    const val SCOPES = "openid profile email offline_access resource.invoke $PLAN_SCOPE"
    const val FIRST_CLIENT = "dynamic_agent_client"
    const val AGENT_NAME = "공부 친구"
    const val CALLBACK_PATH = "/auth/callback"
    const val PREFERRED_PORT = 1455

    val SIGNED_OUT = "ChatGPT 로그인이 끝났어요. 관리자 → AI 설정에서 다시 로그인해 주세요."

    /** 정액제로 쓸 때 OpenAI가 알려 주는 까닭 */
    val PLAN_ERRORS = mapOf(
        "subscription_sharing_usage_limit_exceeded" to "ChatGPT 정액제 사용 한도에 닿았어요. ChatGPT 설정 › 사용량에서 확인해 주세요.",
        "subscription_sharing_usage_unavailable" to "ChatGPT 정액제를 지금 쓸 수 없어요. 잠시 뒤 다시 해 주세요.",
        "subscription_sharing_user_unavailable" to "ChatGPT 정액제를 지금 쓸 수 없어요. 잠시 뒤 다시 해 주세요.",
        "subscription_sharing_user_not_eligible" to "이 ChatGPT 계정은 다른 앱에서 정액제를 쓸 수 없어요(Go·Plus·Pro만 돼요).",
        "subscription_sharing_unsupported_capability" to "ChatGPT 계정으로는 이 모델을 쓸 수 없어요. 다른 모델을 골라 주세요.",
        "subscription_sharing_invalid_user" to SIGNED_OUT,
        "subscription_sharing_route_not_supported" to "ChatGPT 계정으로는 이 기능을 쓸 수 없어요.",
        "chatpass_v2_scope_not_authorized" to "ChatGPT 정액제 사용을 허락받지 못했어요. 다시 로그인해 주세요.",
        "chatpass_v2_invalid_authorization_context" to "ChatGPT 정액제 사용을 허락받지 못했어요. 다시 로그인해 주세요.",
    )

    fun b64url(b: ByteArray): String = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(b)
    fun unb64url(s: String): ByteArray = java.util.Base64.getUrlDecoder().decode(s.trimEnd('='))

    fun challengeOf(verifier: String): String =
        b64url(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII)))

    fun form(map: Map<String, String>): String =
        map.entries.joinToString("&") { "${URLEncoder.encode(it.key, "UTF-8")}=${URLEncoder.encode(it.value, "UTF-8")}" }

    fun query(q: String?): Map<String, String> =
        (q ?: "").split("&").filter { it.isNotEmpty() }.associate {
            val i = it.indexOf('=')
            if (i < 0) URLDecoder.decode(it, "UTF-8") to ""
            else URLDecoder.decode(it.substring(0, i), "UTF-8") to URLDecoder.decode(it.substring(i + 1), "UTF-8")
        }

    fun authorizeUrl(
        clientId: String, hostId: String, redirectUri: String, state: String, nonce: String, challenge: String,
        prevIdToken: String?, prevEmail: String?,
    ): String {
        val p = linkedMapOf(
            "client_id" to clientId, "ext_agent_host_id" to hostId, "response_type" to "code",
            "redirect_uri" to redirectUri, "scope" to SCOPES, "resource" to RESOURCE, "state" to state,
            "nonce" to nonce, "code_challenge_method" to "S256", "code_challenge" to challenge,
        )
        if (clientId == FIRST_CLIENT) p["agent_name_hint"] = AGENT_NAME
        if (!prevIdToken.isNullOrEmpty()) p["id_token_hint"] = prevIdToken
        if (!prevEmail.isNullOrEmpty()) p["login_hint"] = prevEmail
        return "$AUTHORIZE_URL?${form(p)}"
    }

    /** 토큰 응답 → 로그인 정보 */
    fun fromTokens(body: JSONObject, clientId: String, email: String, idToken: String, now: Long, prev: ChatGptAuth? = null): ChatGptAuth {
        val exp = body.optLong("expires_in", 3600).let { if (it > 0) it else 3600 }
        val scopes = body.optString("scope", "").split(Regex("\\s+")).filter { it.isNotEmpty() }
        return ChatGptAuth(
            clientId, email, body.optString("id_token", "").ifEmpty { idToken },
            body.optString("access_token", ""), body.optString("refresh_token", "").ifEmpty { prev?.refreshToken ?: "" },
            now + exp * 1000, scopes.ifEmpty { prev?.scopes ?: emptyList() },
        )
    }

    /** JWT 서명 확인 (RS256, ES256) */
    fun verifyJwt(parts: List<String>, alg: String, jwk: JSONObject): Boolean = try {
        val data = "${parts[0]}.${parts[1]}".toByteArray(Charsets.US_ASCII)
        val sig = unb64url(parts[2])
        when (alg) {
            "RS256" -> Signature.getInstance("SHA256withRSA").run {
                initVerify(rsaKey(jwk)); update(data); verify(sig)
            }
            "ES256" -> Signature.getInstance("SHA256withECDSA").run {
                initVerify(ecKey(jwk)); update(data); verify(p1363ToDer(sig))
            }
            else -> false
        }
    } catch (e: Exception) {
        false
    }

    private fun rsaKey(jwk: JSONObject): PublicKey = KeyFactory.getInstance("RSA").generatePublic(
        RSAPublicKeySpec(BigInteger(1, unb64url(jwk.getString("n"))), BigInteger(1, unb64url(jwk.getString("e")))),
    )

    private fun ecKey(jwk: JSONObject): PublicKey {
        val params = AlgorithmParameters.getInstance("EC").apply { init(ECGenParameterSpec("secp256r1")) }
            .getParameterSpec(ECParameterSpec::class.java)
        val point = ECPoint(BigInteger(1, unb64url(jwk.getString("x"))), BigInteger(1, unb64url(jwk.getString("y"))))
        return KeyFactory.getInstance("EC").generatePublic(ECPublicKeySpec(point, params))
    }

    /** ES256 서명(r||s 64바이트)을 Java가 읽는 DER로 바꾼다 */
    fun p1363ToDer(sig: ByteArray): ByteArray {
        require(sig.size == 64)
        fun int(b: ByteArray): ByteArray {
            var v = b.dropWhile { it == 0.toByte() }.toByteArray()
            if (v.isEmpty()) v = byteArrayOf(0)
            if (v[0] < 0) v = byteArrayOf(0) + v
            return byteArrayOf(0x02, v.size.toByte()) + v
        }
        val body = int(sig.copyOfRange(0, 32)) + int(sig.copyOfRange(32, 64))
        return byteArrayOf(0x30, body.size.toByte()) + body
    }

    /** ID 토큰의 내용 확인(서명 제외): 발급자·받는 쪽·기한·nonce. 맞으면 email */
    fun checkClaims(claims: JSONObject, clientId: String, nonce: String, now: Long): String? {
        val aud = claims.opt("aud")
        val auds = if (aud is JSONArray) (0 until aud.length()).map { aud.getString(it) } else listOf(aud?.toString())
        if (claims.optString("iss") != ISSUER || clientId !in auds) return null
        if (claims.optLong("exp") * 1000 <= now || claims.optString("nonce") != nonce || claims.optString("sub").isEmpty()) return null
        return claims.optString("email", "")
    }

    /** Responses API 흘려 받기(SSE)에서 글을 모은다 */
    fun readStream(lines: Sequence<String>): String {
        val text = StringBuilder()
        for (line in lines) {
            if (!line.startsWith("data:")) continue
            val data = line.removePrefix("data:").trim()
            if (data.isEmpty() || data == "[DONE]") continue
            val ev = try { JSONObject(data) } catch (_: Exception) { continue }
            when (ev.optString("type")) {
                "response.output_text.delta" -> text.append(ev.optString("delta"))
                "response.completed" -> return text.toString()
                "response.incomplete" -> throw AiError("AI가 답을 다 쓰지 못하고 멈췄어요. 다시 해 주세요.")
                "response.failed", "error" -> {
                    val err = ev.optJSONObject("response")?.optJSONObject("error") ?: ev.optJSONObject("error") ?: ev
                    throw AiError(PLAN_ERRORS[err.optString("code")] ?: "AI가 답하지 못했어요. 잠시 뒤 다시 해 주세요.")
                }
            }
        }
        throw AiError("AI 답이 중간에 끊겼어요. 다시 해 주세요.")
    }

    /** HTTP 오류 → 알기 쉬운 문장 */
    fun httpError(status: Int, body: String): String {
        val code = try { JSONObject(body).optJSONObject("error")?.optString("code") ?: JSONObject(body).optString("error") } catch (_: Exception) { "" }
        PLAN_ERRORS[code]?.let { return it }
        return when {
            status == 401 -> SIGNED_OUT
            status == 403 -> "이 계정으로는 이 기능을 쓸 수 없어요."
            status == 404 -> "모델을 찾지 못했어요. AI 설정에서 모델을 다시 골라 주세요."
            status == 429 -> "사용 한도를 넘었거나 요청이 너무 많아요. 잠시 뒤 다시 해 주세요."
            status >= 500 -> "ChatGPT 쪽에 문제가 있어요. 잠시 뒤 다시 해 주세요."
            else -> "AI가 요청을 받지 않았어요. 모델을 다시 골라 보세요."
        }
    }

    /** 고를 수 있는 모델 목록 */
    fun parseModels(body: String): JSONArray {
        val out = JSONArray()
        val arr = JSONObject(body).optJSONArray("models") ?: return out
        for (i in 0 until arr.length()) {
            val m = arr.getJSONObject(i)
            val slug = m.optString("slug")
            if (m.optString("visibility") == "list" && slug.isNotEmpty()) {
                out.put(JSONObject().put("id", slug).put("label", m.optString("display_name").ifEmpty { slug }))
            }
        }
        return out
    }
}

/** 기기에서 로그인·토큰 보관·요청 */
class ChatGpt(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("ai", Context.MODE_PRIVATE)
    private val rnd = SecureRandom()
    @Volatile private var server: ServerSocket? = null
    private val lock = Any()

    private fun random(n: Int) = ChatGptCore.b64url(ByteArray(n).also { rnd.nextBytes(it) })

    val hostId: String
        get() = prefs.getString("hostId", null) ?: "urn:uuid:${UUID.randomUUID()}".also { prefs.edit().putString("hostId", it).apply() }

    // ---- 토큰을 기기 보안 저장소의 열쇠로 잠가 보관 ----
    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(
                KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build(),
            )
        }.generateKey()
    }

    fun load(): ChatGptAuth? = try {
        val s = prefs.getString("auth", null)
        if (s == null) null else {
            val raw = Base64.decode(s, Base64.NO_WRAP)
            val c = Cipher.getInstance("AES/GCM/NoPadding")
            c.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, raw.copyOfRange(0, 12)))
            ChatGptAuth.fromJson(String(c.doFinal(raw.copyOfRange(12, raw.size)), Charsets.UTF_8))
        }
    } catch (_: Exception) {
        null
    }

    private fun save(auth: ChatGptAuth?) {
        if (auth == null) { prefs.edit().remove("auth").apply(); return }
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, key())
        val enc = c.iv + c.doFinal(auth.toJson().toByteArray(Charsets.UTF_8))
        // 다음 로그인 때 같은 등록을 쓰도록 clientId·email은 따로 남긴다
        prefs.edit().putString("auth", Base64.encodeToString(enc, Base64.NO_WRAP))
            .putString("clientId", auth.clientId).putString("email", auth.email).apply()
    }

    fun status(): JSONObject {
        val a = load()
        return JSONObject().put("signedIn", a != null).put("email", a?.email ?: prefs.getString("email", "") ?: "")
    }

    fun cancel() {
        try { server?.close() } catch (_: Exception) { }
        server = null
    }

    /**
     * 브라우저로 로그인한다. openBrowser(url)로 로그인 창을 열고, 끝날 때까지(최대 5분) 기다린다.
     * 오래 걸리므로 뒤쪽 스레드에서 부른다.
     */
    fun signIn(openBrowser: (String) -> Unit): ChatGptAuth {
        cancel()
        val prevClient = prefs.getString("clientId", null)
        val prevEmail = prefs.getString("email", null)
        val clientId = prevClient ?: ChatGptCore.FIRST_CLIENT
        val verifier = random(32)
        val state = random(16)
        val nonce = random(16)
        val loop = InetAddress.getByName("127.0.0.1")
        val ss = try { ServerSocket(ChatGptCore.PREFERRED_PORT, 4, loop) } catch (_: Exception) { ServerSocket(0, 4, loop) }
        server = ss
        ss.soTimeout = 5 * 60_000
        val redirectUri = "http://127.0.0.1:${ss.localPort}${ChatGptCore.CALLBACK_PATH}"
        try {
            openBrowser(ChatGptCore.authorizeUrl(clientId, hostId, redirectUri, state, nonce, ChatGptCore.challengeOf(verifier), load()?.idToken, prevEmail))
            while (true) {
                val sock = try { ss.accept() } catch (e: java.net.SocketTimeoutException) {
                    throw AiError("ChatGPT 로그인을 기다리다 멈췄어요. 다시 해 주세요.")
                } catch (e: java.net.SocketException) {
                    throw AiError("ChatGPT 로그인을 멈췄어요.")
                }
                sock.use { s ->
                    val first = BufferedReader(InputStreamReader(s.getInputStream())).readLine() ?: return@use
                    val target = first.split(" ").getOrNull(1) ?: ""
                    val path = target.substringBefore('?')
                    val q = ChatGptCore.query(target.substringAfter('?', ""))
                    fun reply(msg: String) {
                        val html = "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>공부 친구</title>" +
                            "<body style=\"font-family:sans-serif;display:grid;place-items:center;height:90vh;margin:0;padding:20px\"><p style=\"font-size:20px;text-align:center\">$msg</p></body>"
                        val bytes = html.toByteArray(Charsets.UTF_8)
                        s.getOutputStream().write(("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n").toByteArray() + bytes)
                        s.getOutputStream().flush()
                    }
                    if (path != ChatGptCore.CALLBACK_PATH) {
                        s.getOutputStream().write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray())
                        return@use
                    }
                    if (q["state"] != state) { reply("로그인 확인이 맞지 않아요. 공부 친구에서 다시 해 주세요."); return@use }
                    q["error"]?.let {
                        reply("로그인을 취소했어요. 이 창을 닫아도 돼요.")
                        throw AiError(if (it == "access_denied") "ChatGPT 로그인을 취소했어요." else "ChatGPT 로그인에 실패했어요. 다시 해 주세요.")
                    }
                    val code = q["code"]
                    val issued = q["client_id"] ?: if (clientId == ChatGptCore.FIRST_CLIENT) "" else clientId
                    if (code.isNullOrEmpty() || issued.isEmpty() || (clientId != ChatGptCore.FIRST_CLIENT && issued != clientId)) {
                        reply("로그인 정보를 받지 못했어요. 공부 친구에서 다시 해 주세요.")
                        throw AiError("ChatGPT 로그인 정보를 받지 못했어요. 다시 해 주세요.")
                    }
                    reply("로그인됐어요. 이 창을 닫고 공부 친구로 돌아가 주세요.")
                    return exchange(code, issued, redirectUri, verifier, nonce).also { save(it) }
                }
            }
        } finally {
            try { ss.close() } catch (_: Exception) { }
            if (server === ss) server = null
        }
    }

    private fun exchange(code: String, clientId: String, redirectUri: String, verifier: String, nonce: String): ChatGptAuth {
        val (status, text) = post(
            ChatGptCore.TOKEN_URL,
            ChatGptCore.form(mapOf("grant_type" to "authorization_code", "client_id" to clientId, "code" to code, "code_verifier" to verifier, "redirect_uri" to redirectUri, "resource" to ChatGptCore.RESOURCE)),
        )
        if (status !in 200..299) throw AiError("ChatGPT 로그인을 마치지 못했어요. 다시 해 주세요.")
        val body = JSONObject(text)
        val idToken = body.optString("id_token")
        val email = checkIdToken(idToken, clientId, nonce) ?: throw AiError("ChatGPT 로그인 정보를 확인하지 못했어요. 다시 해 주세요.")
        val auth = ChatGptCore.fromTokens(body, clientId, email, idToken, System.currentTimeMillis())
        if (ChatGptCore.PLAN_SCOPE !in auth.scopes) throw AiError("로그인은 됐지만 정액제 사용을 허락하지 않았어요. 다시 로그인하면서 사용을 허락해 주세요.")
        return auth
    }

    private fun checkIdToken(token: String, clientId: String, nonce: String): String? {
        val parts = token.split(".")
        if (parts.size != 3) return null
        return try {
            val header = JSONObject(String(ChatGptCore.unb64url(parts[0])))
            val claims = JSONObject(String(ChatGptCore.unb64url(parts[1])))
            val conf = JSONObject(get(ChatGptCore.CONFIG_URL, null).second)
            val keys = JSONObject(get(conf.getString("jwks_uri"), null).second).getJSONArray("keys")
            val all = (0 until keys.length()).map { keys.getJSONObject(it) }
            val jwk = all.firstOrNull { it.optString("kid") == header.optString("kid") } ?: all.singleOrNull() ?: return null
            if (!ChatGptCore.verifyJwt(parts, header.optString("alg"), jwk)) return null
            ChatGptCore.checkClaims(claims, clientId, nonce, System.currentTimeMillis())
        } catch (_: Exception) {
            null
        }
    }

    /** 곧 끝나는 토큰이면 새로 받는다 (한 번에 하나씩) */
    private fun fresh(): ChatGptAuth = synchronized(lock) {
        val a = load() ?: throw AiError(ChatGptCore.SIGNED_OUT)
        if (a.expiresAt - 2 * 60_000 > System.currentTimeMillis()) return a
        if (a.refreshToken.isEmpty()) throw AiError(ChatGptCore.SIGNED_OUT)
        val (status, text) = post(
            ChatGptCore.TOKEN_URL,
            ChatGptCore.form(mapOf("grant_type" to "refresh_token", "client_id" to a.clientId, "refresh_token" to a.refreshToken, "resource" to ChatGptCore.RESOURCE)),
        )
        if (status !in 200..299) {
            if (status >= 500) throw AiError("ChatGPT 쪽에 문제가 있어요. 잠시 뒤 다시 해 주세요.")
            save(null)
            throw AiError(ChatGptCore.SIGNED_OUT)
        }
        return ChatGptCore.fromTokens(JSONObject(text), a.clientId, a.email, a.idToken, System.currentTimeMillis(), a).also { save(it) }
    }

    /** 로그아웃: OpenAI 쪽 로그인도 끊는다 */
    fun signOut() {
        val a = load()
        save(null)
        if (a?.refreshToken.isNullOrEmpty()) return
        try {
            val conf = JSONObject(get(ChatGptCore.CONFIG_URL, null).second)
            val end = conf.optString("revocation_endpoint")
            if (end.isNotEmpty()) post(end, ChatGptCore.form(mapOf("token" to a!!.refreshToken, "token_type_hint" to "refresh_token", "client_id" to a.clientId)))
        } catch (_: Exception) { }
    }

    fun models(): JSONArray {
        val (status, text) = get("${ChatGptCore.RESOURCE}/models", fresh().accessToken)
        if (status !in 200..299) throw AiError(ChatGptCore.httpError(status, text))
        return ChatGptCore.parseModels(text)
    }

    /** 물어보고 답 받기: Responses API, 저장 안 함, 흘려 받기 */
    fun chat(model: String, system: String, user: String): String {
        val token = fresh().accessToken
        val body = JSONObject().put("model", model).put("instructions", system)
            .put("input", JSONArray().put(JSONObject().put("role", "user").put("content", user)))
            .put("store", false).put("stream", true).toString()
        val c = (URL("${ChatGptCore.RESOURCE}/responses").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; doOutput = true; connectTimeout = 20_000; readTimeout = 120_000
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "text/event-stream")
        }
        try {
            c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val status = c.responseCode
            if (status !in 200..299) throw AiError(ChatGptCore.httpError(status, c.errorStream?.bufferedReader()?.readText() ?: ""))
            return c.inputStream.bufferedReader(Charsets.UTF_8).useLines { ChatGptCore.readStream(it) }
        } catch (e: AiError) {
            throw e
        } catch (e: java.net.SocketTimeoutException) {
            throw AiError("AI가 너무 오래 답하지 않았어요. 다시 해 주세요.")
        } catch (e: java.io.IOException) {
            throw AiError("인터넷에 연결하지 못했어요.")
        } finally {
            c.disconnect()
        }
    }

    private fun get(url: String, token: String?): Pair<Int, String> {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000; readTimeout = 30_000
            if (token != null) setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            val s = c.responseCode
            return s to ((if (s in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.readText() ?: "")
        } catch (e: java.io.IOException) {
            throw AiError("인터넷에 연결하지 못했어요.")
        } finally { c.disconnect() }
    }

    private fun post(url: String, form: String): Pair<Int, String> {
        val c = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; doOutput = true; connectTimeout = 20_000; readTimeout = 30_000
            setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        }
        try {
            c.outputStream.use { it.write(form.toByteArray(Charsets.UTF_8)) }
            val s = c.responseCode
            return s to ((if (s in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.readText() ?: "")
        } catch (e: java.io.IOException) {
            throw AiError("인터넷에 연결하지 못했어요.")
        } finally { c.disconnect() }
    }

    companion object {
        private const val KEY_ALIAS = "studyfriend_ai"
    }
}
