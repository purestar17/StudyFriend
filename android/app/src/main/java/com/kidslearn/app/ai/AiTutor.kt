package com.kidslearn.app.ai

import com.kidslearn.app.data.AiProvider

/**
 * AI 튜터 연결 지점 (3단계에서 구현).
 *
 * 앱은 API 키를 갖지 않는다. 관리자가 설정한 중계 서버 주소로 요청을 보내고,
 * 중계 서버가 선택된 제공자(Claude 또는 OpenAI)의 API 키를 붙여 호출한다.
 * 아이 이름 대신 별칭과 정답률 요약만 보낸다.
 */
interface AiTutor {
    val provider: AiProvider

    /** 최근 학습 기록 요약을 보고 과목별 추천 레벨과 한 줄 조언을 돌려준다. */
    suspend fun assessLevel(summary: String): String

    /** 초등학생용 안전 지침이 적용된 대화 한 턴. */
    suspend fun chat(history: List<Pair<String, String>>, userText: String): String
}
