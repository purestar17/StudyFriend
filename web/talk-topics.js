// 영어 회화 "오늘의 대화" 주제. 관리자가 고르거나 직접 쓸 수 있다.
// phrases: 대화 전에 미리 보는 표현 [영어, 뜻]
const TALK_TOPICS = [
  { id: "me", ko: "나를 소개해요", en: "Introducing myself", phrases: [["My name is ...", "제 이름은 …예요"], ["I am ten years old.", "저는 열 살이에요"], ["I like ...", "저는 …을 좋아해요"], ["Nice to meet you.", "만나서 반가워요"]] },
  { id: "family", ko: "우리 가족", en: "My family", phrases: [["There are four people in my family.", "우리 가족은 네 명이에요"], ["This is my mom.", "이분은 우리 엄마예요"], ["I have a brother.", "저는 남동생(형/오빠)이 있어요"], ["We like to ...", "우리는 …하는 걸 좋아해요"]] },
  { id: "food", ko: "좋아하는 음식", en: "My favorite food", phrases: [["What's your favorite food?", "가장 좋아하는 음식이 뭐예요?"], ["I like pizza.", "저는 피자를 좋아해요"], ["It's sweet / spicy.", "달아요 / 매워요"], ["I don't like ...", "저는 …을 안 좋아해요"]] },
  { id: "school", ko: "학교생활", en: "My school day", phrases: [["I go to school at 8:30.", "8시 반에 학교에 가요"], ["My favorite subject is math.", "제일 좋아하는 과목은 수학이에요"], ["We have lunch at school.", "학교에서 점심을 먹어요"], ["My best friend is ...", "제일 친한 친구는 …예요"]] },
  { id: "weekend", ko: "주말에 한 일", en: "My weekend", phrases: [["What did you do last weekend?", "지난 주말에 뭐 했어요?"], ["I went to the park.", "공원에 갔어요"], ["I played with my friends.", "친구들과 놀았어요"], ["It was fun!", "재미있었어요!"]] },
  { id: "animals", ko: "동물", en: "Animals", phrases: [["Do you have a pet?", "애완동물 있어요?"], ["I have a dog.", "강아지가 있어요"], ["Rabbits are cute.", "토끼는 귀여워요"], ["Elephants are big.", "코끼리는 커요"]] },
  { id: "weather", ko: "날씨와 계절", en: "Weather and seasons", phrases: [["How's the weather today?", "오늘 날씨 어때요?"], ["It's sunny / rainy.", "맑아요 / 비가 와요"], ["My favorite season is winter.", "제일 좋아하는 계절은 겨울이에요"], ["It's cold outside.", "밖이 추워요"]] },
  { id: "hobby", ko: "취미와 운동", en: "Hobbies and sports", phrases: [["What do you do for fun?", "재미로 뭐 해요?"], ["I like drawing.", "그림 그리기를 좋아해요"], ["I can swim.", "저는 수영할 수 있어요"], ["Let's play soccer!", "축구 하자!"]] },
  { id: "shopping", ko: "가게에서 물건 사기", en: "At the store", phrases: [["How much is it?", "얼마예요?"], ["I want this one, please.", "이거 주세요"], ["It's 3 dollars.", "3달러예요"], ["Here you are.", "여기 있어요"]] },
  { id: "restaurant", ko: "식당에서 주문하기", en: "Ordering food", phrases: [["Can I have a hamburger, please?", "햄버거 하나 주세요"], ["Anything to drink?", "마실 건요?"], ["Orange juice, please.", "오렌지 주스 주세요"], ["It's delicious!", "맛있어요!"]] },
  { id: "direction", ko: "길 찾기", en: "Asking for directions", phrases: [["Where is the library?", "도서관이 어디예요?"], ["Go straight.", "쭉 가세요"], ["Turn left / right.", "왼쪽 / 오른쪽으로 도세요"], ["It's next to the bank.", "은행 옆에 있어요"]] },
  { id: "feelings", ko: "기분 말하기", en: "Feelings", phrases: [["How are you feeling?", "기분이 어때요?"], ["I'm happy / sad.", "기뻐요 / 슬퍼요"], ["I'm tired.", "피곤해요"], ["Why are you angry?", "왜 화났어요?"]] },
  { id: "dream", ko: "나의 꿈", en: "My dream job", phrases: [["What do you want to be?", "커서 뭐가 되고 싶어요?"], ["I want to be a doctor.", "의사가 되고 싶어요"], ["Because I like helping people.", "사람들을 돕는 게 좋아서요"], ["That's a great dream!", "멋진 꿈이에요!"]] },
  { id: "travel", ko: "여행", en: "Travel", phrases: [["Have you been to Jeju?", "제주도에 가 본 적 있어요?"], ["I went there by plane.", "비행기 타고 갔어요"], ["I want to visit Paris.", "파리에 가 보고 싶어요"], ["The beach was beautiful.", "바닷가가 아름다웠어요"]] },
  { id: "birthday", ko: "생일 파티", en: "Birthday party", phrases: [["When is your birthday?", "생일이 언제예요?"], ["My birthday is in May.", "제 생일은 5월이에요"], ["Happy birthday!", "생일 축하해요!"], ["I got a present.", "선물을 받았어요"]] },
  { id: "body", ko: "몸이 아플 때", en: "At the doctor", phrases: [["What's wrong?", "어디가 아파요?"], ["I have a headache.", "머리가 아파요"], ["I have a cold.", "감기에 걸렸어요"], ["Take some medicine.", "약을 먹으세요"]] },
];
if (typeof module !== "undefined") module.exports = { TALK_TOPICS };
