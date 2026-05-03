// ============================================================
// [1] 문진 선택 키 타입
// ============================================================

export type MoodKey =
  | "ANXIETY"   // 불안함
  | "EXHAUSTED" // 지침·번아웃
  | "EMPTY"     // 공허함
  | "COMFORT"   // 위로받고 싶음
  | "EXCITED"   // 설렘·기대
  | "NUMB"      // 무감각
  | "SAD"       // 슬픔·상실
  | "LONELY"    // 외로움·고독
  | "ANGRY"     // 분노·억울함
  | "GUILTY"    // 죄책감·자책
  | "CONFUSED"  // 혼란·방황
  | "GRATEFUL"; // 감사·평온

export type ConcernKey =
  | "RELATION"  // 관계
  | "CAREER"    // 진로
  | "DAILY"     // 일상
  | "WORK"      // 일·공부
  | "FAMILY"    // 가족
  | "SELF"      // 자아
  | "HEALTH"    // 건강
  | "MONEY";    // 금전

export type ReadStyleKey =
  | "LIGHT"  // 가볍게
  | "SHORT"  // 짧게
  | "DEEP"   // 깊게
  | "WARM"   // 따뜻하게
  | "CLEAR"; // 명쾌하게

/** 문진 3단계 응답을 담는 구조 */
export interface QuizAnswers {
  mood: MoodKey;
  concern: ConcernKey;
  readStyle: ReadStyleKey;
}

// ============================================================
// [2] 도서 및 처방전 타입
// ============================================================

export interface Book {
  title: string;
  author: string;
  publisher: string;
  year: string | number;
  isbn?: string;
  genre: string;
  tags?: string[];
  why_this_book: string;
  healing_point: string;
  reading_guide: string;
  music_keyword?: string;
  quote?: string;
}

export interface EmotionalAnalysis {
  detected_emotion: string;
  intensity: number;
  empathy_message: string;
}

export interface AdditionalCare {
  activities: string[];
  professional_help?: string;
}

export interface Prescription {
  emotional_analysis: EmotionalAnalysis;
  healing_message: string;
  recommended_books: Book[];
  additional_care: AdditionalCare;
  /** 문진 응답 — 처방전 상단 태그 표시 및 저장 기록에 활용 */
  quiz_answers?: QuizAnswers;
}

// ============================================================
// [3] 저장 / 북마크 타입
// ============================================================

export interface SavedPrescription {
  id: string;
  createdAt: string;
  /** v2: quiz_answers 기반 요약 레이블 (예: "불안함 · 관계 · 따뜻하게") */
  userInput: string;
  prescription: Prescription;
}

export interface BookBookmark {
  id: string;
  createdAt: string;
  book: Book;
}

// ============================================================
// [4] 도서관 검색 관련 타입 (libraryService 호환 유지)
// ============================================================

export interface LibraryAvailability {
  libCode?: string;
  libraryName: string;
  address: string;
  homepage?: string;
  telephone?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  hasBook: boolean;
  loanAvailable?: boolean;
  mapUrl?: string;
  foundByIsbn?: string;
}

export interface IsbnSourceStat {
  source: "원본ISBN" | "최신판검색" | "정보나루" | "국립중앙도서관";
  count: number;
  isbns: string[];
}

export interface IsbnCollectionStats {
  totalCount: number;
  sources: IsbnSourceStat[];
}

export interface LibrarySearchMeta {
  isbnCount: number;
  regionCount: number;
  isbnStats?: IsbnCollectionStats;
}

// ============================================================
// [5] 앱 상태
// ============================================================

export enum AppState {
  IDLE       = "IDLE",
  QUIZ       = "QUIZ",       // 문진 진행 중
  ANALYZING  = "ANALYZING",
  PRESCRIBED = "PRESCRIBED",
  ERROR      = "ERROR",
}