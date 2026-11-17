package com.kidslearn.app

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.security.interfaces.RSAPublicKey

class ChatGptTest {
    private fun b64(b: ByteArray) = ChatGptCore.b64url(b)
    private fun unsigned(x: java.math.BigInteger, n: Int): ByteArray {
        val b = x.toByteArray().dropWhile { it == 0.toByte() }.toByteArray()
        return ByteArray(n - b.size) + b
    }

    @Test fun pkceChallengeMatchesRfc() {
        // RFC 7636 부록 B 예시
        assertEquals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", ChatGptCore.challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"))
    }

    @Test fun authorizeUrlHasEverything() {
        val u = ChatGptCore.authorizeUrl(ChatGptCore.FIRST_CLIENT, "urn:uuid:1", "http://127.0.0.1:1455/auth/callback", "st", "no", "ch", null, null)
        val q = ChatGptCore.query(u.substringAfter('?'))
        assertEquals("http://127.0.0.1:1455/auth/callback", q["redirect_uri"])
        assertEquals(ChatGptCore.SCOPES, q["scope"])
        assertEquals("S256", q["code_challenge_method"])
        assertEquals("공부 친구", q["agent_name_hint"])
        assertNull(q["login_hint"])
    }

    @Test fun rs256AndEs256Verify() {
        val data = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0"
        val rsa = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.genKeyPair()
        val rs = Signature.getInstance("SHA256withRSA").apply { initSign(rsa.private); update(data.toByteArray()) }.sign()
        val pub = rsa.public as RSAPublicKey
        val jwk = JSONObject().put("n", b64(pub.modulus.toByteArray())).put("e", b64(pub.publicExponent.toByteArray()))
        val parts = data.split(".") + b64(rs)
        assertTrue(ChatGptCore.verifyJwt(parts, "RS256", jwk))
        assertFalse(ChatGptCore.verifyJwt(listOf(parts[0], "eyJzdWIiOiIyIn0", parts[2]), "RS256", jwk))

        val ec = KeyPairGenerator.getInstance("EC").apply { initialize(java.security.spec.ECGenParameterSpec("secp256r1")) }.genKeyPair()
        val der = Signature.getInstance("SHA256withECDSA").apply { initSign(ec.private); update(data.toByteArray()) }.sign()
        // DER → r||s (JWT 형식)
        var i = 3
        val rLen = der[i].toInt(); val r = der.copyOfRange(i + 1, i + 1 + rLen); i += 1 + rLen + 1
        val sLen = der[i].toInt(); val sv = der.copyOfRange(i + 1, i + 1 + sLen)
        val raw = unsigned(java.math.BigInteger(1, r), 32) + unsigned(java.math.BigInteger(1, sv), 32)
        val ep = (ec.public as ECPublicKey).w
        val ejwk = JSONObject().put("x", b64(unsigned(ep.affineX, 32))).put("y", b64(unsigned(ep.affineY, 32)))
        assertTrue(ChatGptCore.verifyJwt(data.split(".") + b64(raw), "ES256", ejwk))
        assertFalse(ChatGptCore.verifyJwt(data.split(".") + b64(raw), "none", ejwk))
    }

    @Test fun claims() {
        val now = 1_700_000_000_000L
        val ok = JSONObject().put("iss", ChatGptCore.ISSUER).put("aud", "cid").put("exp", now / 1000 + 60).put("nonce", "n").put("sub", "u").put("email", "a@b.c")
        assertEquals("a@b.c", ChatGptCore.checkClaims(ok, "cid", "n", now))
        assertNull(ChatGptCore.checkClaims(ok, "other", "n", now))
        assertNull(ChatGptCore.checkClaims(ok, "cid", "x", now))
        assertNull(ChatGptCore.checkClaims(JSONObject(ok.toString()).put("exp", now / 1000 - 1), "cid", "n", now))
    }

    @Test fun tokensAndRefreshKeepOldValues() {
        val first = ChatGptCore.fromTokens(JSONObject("""{"access_token":"a","refresh_token":"r","expires_in":3600,"scope":"openid chatgpt.tokens.use.direct"}"""), "cid", "e", "id", 0)
        assertEquals(3_600_000L, first.expiresAt)
        assertTrue(ChatGptCore.PLAN_SCOPE in first.scopes)
        val next = ChatGptCore.fromTokens(JSONObject("""{"access_token":"b"}"""), "cid", "e", "id", 10, first)
        assertEquals("r", next.refreshToken)
        assertEquals(first.scopes, next.scopes)
        assertEquals(next, ChatGptAuth.fromJson(next.toJson()))
    }

    @Test fun streamReading() {
        val ok = sequenceOf(
            "event: response.output_text.delta", "data: {\"type\":\"response.output_text.delta\",\"delta\":\"안녕\"}", "",
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"하세요\"}", "data: {\"type\":\"response.completed\"}",
        )
        assertEquals("안녕하세요", ChatGptCore.readStream(ok))
        try {
            ChatGptCore.readStream(sequenceOf("data: {\"type\":\"response.failed\",\"response\":{\"error\":{\"code\":\"subscription_sharing_usage_limit_exceeded\"}}}"))
            fail()
        } catch (e: AiError) { assertTrue(e.message!!.contains("한도")) }
        try { ChatGptCore.readStream(sequenceOf("data: {\"type\":\"response.output_text.delta\",\"delta\":\"x\"}")); fail() } catch (e: AiError) { }
    }

    @Test fun modelsAndErrors() {
        val m = ChatGptCore.parseModels("""{"models":[{"slug":"gpt-a","display_name":"A","visibility":"list"},{"slug":"hidden","visibility":"hide"}]}""")
        assertEquals(1, m.length())
        assertEquals("gpt-a", m.getJSONObject(0).getString("id"))
        assertEquals(ChatGptCore.SIGNED_OUT, ChatGptCore.httpError(401, ""))
        assertTrue(ChatGptCore.httpError(429, """{"error":{"code":"subscription_sharing_user_not_eligible"}}""").contains("Go·Plus·Pro"))
    }
}
