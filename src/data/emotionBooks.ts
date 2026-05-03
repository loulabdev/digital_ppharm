export interface CuratedBook {
  title: string;
  author?: string;
  description: string;
  type: "에세이" | "소설" | "그림책" | "독립출판" | "시";
  source?: "국내" | "해외" | "독립서점";
}

export const emotionBooks: Record<string, CuratedBook[]> = {
  // ── 기존 ──────────────────────────────────────────────────
  불안: [
    {
      title: "The Rabbit Listened",
      author: "Cori Doerrfeld",
      description: "말없이 곁에 있어주는 존재의 힘을 다정하게 보여주는 그림책",
      type: "그림책",
      source: "해외",
    },
    {
      title: "불안",
      author: "알랭 드 보통",
      description: "불안의 구조를 차분히 이해하도록 돕는 철학 에세이",
      type: "에세이",
      source: "해외",
    },
    {
      title: "오늘도 나는 괜찮지 않았다",
      description: "감정을 억누르지 않고 바라보는 연습을 돕는 에세이",
      type: "독립출판",
      source: "독립서점",
    },
  ],

  불안함: [
    {
      title: "The Rabbit Listened",
      author: "Cori Doerrfeld",
      description: "말없이 곁에 있어주는 존재의 힘을 다정하게 보여주는 그림책",
      type: "그림책",
      source: "해외",
    },
    {
      title: "불안",
      author: "알랭 드 보통",
      description: "불안의 구조를 차분히 이해하도록 돕는 철학 에세이",
      type: "에세이",
      source: "해외",
    },
    {
      title: "오늘도 나는 괜찮지 않았다",
      description: "감정을 억누르지 않고 바라보는 연습을 돕는 에세이",
      type: "독립출판",
      source: "독립서점",
    },
  ],

  지침: [
    {
      title: "아무튼, 산",
      author: "장보영",
      description: "지친 마음에 느린 호흡을 되찾게 해주는 에세이",
      type: "에세이",
      source: "국내",
    },
    {
      title: "작은 별이지만 빛나고 있어",
      author: "소윤",
      description: "버티는 사람에게 필요한 짧고 따뜻한 문장들",
      type: "에세이",
      source: "국내",
    },
  ],

  "지침·번아웃": [
    {
      title: "아무튼, 산",
      author: "장보영",
      description: "지친 마음에 느린 호흡을 되찾게 해주는 에세이",
      type: "에세이",
      source: "국내",
    },
    {
      title: "작은 별이지만 빛나고 있어",
      author: "소윤",
      description: "버티는 사람에게 필요한 짧고 따뜻한 문장들",
      type: "에세이",
      source: "국내",
    },
  ],

  공허함: [
    {
      title: "어린 왕자",
      author: "생텍쥐페리",
      description: "관계와 존재를 다시 바라보게 하는 고전",
      type: "소설",
      source: "해외",
    },
    {
      title: "혼자여서 괜찮은 하루",
      description: "혼자 있는 시간을 부드럽게 받아들이게 돕는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  슬픔: [
    {
      title: "곰이 강을 따라갔을 때",
      description: "상실과 애도를 조용히 감싸는 그림책",
      type: "그림책",
      source: "해외",
    },
    {
      title: "울고 들어온 너에게",
      description: "슬픔을 억지로 지우지 않고 함께 머무르게 하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "슬픔·상실": [
    {
      title: "곰이 강을 따라갔을 때",
      description: "상실과 애도를 조용히 감싸는 그림책",
      type: "그림책",
      source: "해외",
    },
    {
      title: "울고 들어온 너에게",
      description: "슬픔을 억지로 지우지 않고 함께 머무르게 하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  우울: [
    {
      title: "죽고 싶지만 떡볶이는 먹고 싶어",
      author: "백세희",
      description: "우울과 무기력을 솔직한 언어로 풀어낸 에세이",
      type: "에세이",
      source: "국내",
    },
    {
      title: "괜찮아",
      description: "짧고 단단한 위로를 건네는 그림책",
      type: "그림책",
      source: "해외",
    },
  ],

  // ── 신규 추가 ──────────────────────────────────────────────
  외로움: [
    {
      title: "혼자가 혼자에게",
      author: "정호승",
      description: "고독을 따뜻하게 껴안는 시집. 혼자인 시간을 위로해주는 언어들",
      type: "시",
      source: "국내",
    },
    {
      title: "나는 나로 살기로 했다",
      author: "김수현",
      description: "타인의 시선에서 벗어나 자신을 중심에 두는 법을 이야기하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "외로움·고독": [
    {
      title: "혼자가 혼자에게",
      author: "정호승",
      description: "고독을 따뜻하게 껴안는 시집. 혼자인 시간을 위로해주는 언어들",
      type: "시",
      source: "국내",
    },
    {
      title: "나는 나로 살기로 했다",
      author: "김수현",
      description: "타인의 시선에서 벗어나 자신을 중심에 두는 법을 이야기하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  분노: [
    {
      title: "화가 날 때 읽는 책",
      author: "틱낫한",
      description: "분노를 억누르지 않고 다스리는 마음챙김의 지혜를 담은 책",
      type: "에세이",
      source: "해외",
    },
    {
      title: "나의 감정 사용법",
      description: "감정을 이해하고 건강하게 표현하는 방법을 안내하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "분노·억울함": [
    {
      title: "화가 날 때 읽는 책",
      author: "틱낫한",
      description: "분노를 억누르지 않고 다스리는 마음챙김의 지혜를 담은 책",
      type: "에세이",
      source: "해외",
    },
    {
      title: "나의 감정 사용법",
      description: "감정을 이해하고 건강하게 표현하는 방법을 안내하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  죄책감: [
    {
      title: "자기 자신에게",
      author: "마르쿠스 아우렐리우스",
      description: "자책 대신 성찰로 나아가게 돕는 철학 고전",
      type: "에세이",
      source: "해외",
    },
    {
      title: "완벽하지 않아도 괜찮아",
      description: "자신을 용서하고 앞으로 나아가는 법을 따뜻하게 전하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "죄책감·자책": [
    {
      title: "자기 자신에게",
      author: "마르쿠스 아우렐리우스",
      description: "자책 대신 성찰로 나아가게 돕는 철학 고전",
      type: "에세이",
      source: "해외",
    },
    {
      title: "완벽하지 않아도 괜찮아",
      description: "자신을 용서하고 앞으로 나아가는 법을 따뜻하게 전하는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  혼란: [
    {
      title: "아직도 가야 할 길",
      author: "M. 스캇 펙",
      description: "삶의 방향을 잃었을 때 다시 자신을 찾아가는 심리 에세이",
      type: "에세이",
      source: "해외",
    },
    {
      title: "방황해도 괜찮아",
      description: "길을 잃은 것 같은 순간에 건네는 따뜻한 위로의 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "혼란·방황": [
    {
      title: "아직도 가야 할 길",
      author: "M. 스캇 펙",
      description: "삶의 방향을 잃었을 때 다시 자신을 찾아가는 심리 에세이",
      type: "에세이",
      source: "해외",
    },
    {
      title: "방황해도 괜찮아",
      description: "길을 잃은 것 같은 순간에 건네는 따뜻한 위로의 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  감사: [
    {
      title: "작은 것들의 신",
      author: "아룬다티 로이",
      description: "일상의 작고 소중한 것들을 섬세하게 포착한 소설",
      type: "소설",
      source: "해외",
    },
    {
      title: "오늘도 살아있음에 감사해",
      description: "평범한 하루의 소중함을 다시 느끼게 해주는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],

  "감사·평온": [
    {
      title: "작은 것들의 신",
      author: "아룬다티 로이",
      description: "일상의 작고 소중한 것들을 섬세하게 포착한 소설",
      type: "소설",
      source: "해외",
    },
    {
      title: "오늘도 살아있음에 감사해",
      description: "평범한 하루의 소중함을 다시 느끼게 해주는 에세이",
      type: "에세이",
      source: "국내",
    },
  ],
};