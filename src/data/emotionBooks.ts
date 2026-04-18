export interface CuratedBook {
  title: string;
  author?: string;
  description: string;
  type: "에세이" | "소설" | "그림책" | "독립출판" | "시";
  source?: "국내" | "해외" | "독립서점";
}

export const emotionBooks: Record<string, CuratedBook[]> = {
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
      description: "감정을 억누르지 않고 바라보는 연습을 돕는 독립출판 계열의 책",
      type: "독립출판",
      source: "독립서점",
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

  외로움: [
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
};