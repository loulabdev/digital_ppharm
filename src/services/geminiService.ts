import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Prescription, QuizAnswers } from "../types";

// ─── 문진 레이블 맵 ──────────────────────────────────────────────────────────
const MOOD_LABEL: Record<string, string> = {
  ANXIETY:  "불안함",
  EXHAUSTED:"지침·번아웃",
  EMPTY:    "공허함",
  COMFORT:  "위로받고 싶음",
  EXCITED:  "설렘·기대",
  NUMB:     "무감각",
};

const CONCERN_LABEL: Record<string, string> = {
  RELATION: "관계",
  CAREER:   "진로·미래",
  DAILY:    "일상·루틴",
  WORK:     "일·공부",
  FAMILY:   "가족",
  SELF:     "자아·정체성",
};

const READ_STYLE_LABEL: Record<string, string> = {
  LIGHT: "가볍게 읽고 싶어요",
  SHORT: "짧게 읽고 싶어요",
  DEEP:  "깊이 몰입하고 싶어요",
  WARM:  "따뜻한 책이 좋아요",
  CLEAR: "생각이 정리되는 책이 좋아요",
};

// ─── 스키마 ───────────────────────────────────────────────────────────────────
const prescriptionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    emotional_analysis: {
      type: Type.OBJECT,
      properties: {
        detected_emotion: { type: Type.STRING },
        intensity:        { type: Type.STRING, description: "Scale 1-10" },
        empathy_message:  { type: Type.STRING },
      },
      required: ["detected_emotion", "intensity", "empathy_message"],
    },
    healing_message: {
      type: Type.STRING,
      description:
        "선택한 기분·고민·독서결을 반영한 1~2문장의 다정한 사서의 한 마디. 문학적 은유를 활용해도 좋음.",
    },
    recommended_books: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title:        { type: Type.STRING },
          author:       { type: Type.STRING },
          publisher:    { type: Type.STRING },
          year:         { type: Type.STRING },
          isbn:         { type: Type.STRING, description: "가능하면 ISBN-13" },
          genre:        { type: Type.STRING },
          why_this_book:{ type: Type.STRING },
          healing_point:{ type: Type.STRING },
          reading_guide:{ type: Type.STRING },
          music_keyword:{
            type: Type.STRING,
            description: "이 책을 읽을 때 어울리는 음악 키워드 (유튜브 검색어 형태)",
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "오디오북 플랫폼 등 추가 태그. 예: 오디오북_밀리, 오디오북_윌라, 오디오북_네이버",
          },
        },
        required: [
          "title", "author", "publisher", "year", "genre",
          "why_this_book", "healing_point", "reading_guide",
        ],
      },
    },
    additional_care: {
      type: Type.OBJECT,
      properties: {
        activities:       { type: Type.ARRAY, items: { type: Type.STRING } },
        professional_help:{ type: Type.STRING },
      },
      required: ["activities"],
    },
  },
  required: [
    "emotional_analysis", "healing_message",
    "recommended_books",  "additional_care",
  ],
};

// ─── 시스템 프롬프트 ──────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
당신은 "디지털 종이약국(Digital Paper Pharmacy)"의 북큐레이터 사서입니다.
방문자가 문진표(기분·고민·독서 결)를 작성하면 마음에 맞는 책 3권을 처방합니다.

[핵심 원칙]
1. 공감 우선 — 감정을 판단하지 않고 있는 그대로 수용
2. healing_message에는 방문자의 기분·고민·독서결을 자연스럽게 녹여낸 1~2문장을 작성할 것
   - 예: "무감각한 하루 끝, 짧고 따뜻한 이 책들이 아주 작은 온기로 곁에 머물기를 바랍니다."
3. 한국어로 읽을 수 있는 실존 도서만 추천 (번역서 포함)
4. 절대 가공의 책을 만들지 않을 것
5. 장르 다양성 — 에세이·소설·그림책·시집·자기계발·독립출판 등 골고루
6. 독서결에 따른 책 선정 기준:
   - LIGHT  : 에세이·그림책·짧은 산문 위주
   - SHORT  : 100~200쪽 이내 또는 단편집
   - DEEP   : 장편소설·인문·철학 등 몰입도 높은 책
   - WARM   : 따뜻한 감성 에세이·힐링 소설
   - CLEAR  : 인문·심리·자기계발 중 논리적 구조가 명확한 책

[추천 시 주의사항]
- 정확히 3권 추천
- 최소 1권은 그림책·도록·독립출판·사진집·그래픽노블 포함
- 출판사·출간연도 필수 기재, 가능하면 ISBN-13 포함
- 2015년 이후 도서 우선, 2020년대 도서 절반 이상
- 자해/자살 암시 시 "자살예방상담전화 109" 문구를 additional_care.professional_help에 포함
- 의학적 진단 표현 사용 금지
- 반드시 JSON만 반환, 스키마 준수

[음악 키워드]
- 유튜브에서 실제로 검색될 법한 구체적 키워드 (예: "잔잔한 피아노 재즈", "빗소리 카페 bgm")
- 책의 장르·감정 톤을 반영할 것

[오디오북]
- 밀리의서재·윌라·네이버 오디오클립 서비스에서 제공되는 도서라고 알려진 경우
  tags 필드에 "오디오북_밀리" / "오디오북_윌라" / "오디오북_네이버" 포함
- 불확실하면 tags에 오디오북 관련 값 넣지 말 것

[출력 형식]
반드시 아래 JSON 스키마 그대로 반환:
{
  "emotional_analysis": { "detected_emotion": "감지된 감정", "intensity": "1~10", "empathy_message": "공감 메시지" },
  "healing_message": "사서의 한 마디",
  "recommended_books": [
    {
      "title": "", "author": "", "publisher": "", "year": "",
      "isbn": "", "genre": "",
      "why_this_book": "", "healing_point": "", "reading_guide": "",
      "music_keyword": "", "tags": []
    }
  ],
  "additional_care": { "activities": ["활동1", "활동2"], "professional_help": "" }
}
`;

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.trim())
      : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(10, n));
};

const normalizeIsbn = (value: unknown): string | undefined => {
  const raw = toSafeString(value);
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^0-9Xx-]/g, "").trim();
  return cleaned || undefined;
};

// ─── 503 판별 ────────────────────────────────────────────────────────────────
const is503Error = (err: unknown): boolean => {
  if (!isObject(err)) return false;
  if (err["status"] === 503 || err["httpStatus"] === 503) return true;
  if (isObject(err["error"])) {
    const e = err["error"];
    if (e["code"] === 503) return true;
    if (toSafeString(e["status"]).toUpperCase() === "UNAVAILABLE") return true;
  }
  const msg = toSafeString(err["message"]).toUpperCase();
  if (msg.includes("503") || msg.includes("UNAVAILABLE")) return true;
  return false;
};

// ─── 재시도 유틸 ──────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseMs = 1500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if (!is503Error(err) || attempt === retries) break;
      const waitMs = baseMs * Math.pow(2, attempt);
      console.warn(`[geminiService] 503 UNAVAILABLE — ${attempt + 1}/${retries} 재시도 (${waitMs}ms 후)`);
      await new Promise((res) => setTimeout(res, waitMs));
    }
  }
  throw lastError;
}

// ─── 사용자 친화적 에러 ──────────────────────────────────────────────────────
export class GeminiUnavailableError extends Error {
  constructor() {
    super("Gemini 서버가 혼잡합니다. 잠시 후 다시 시도해주세요 🙏");
    this.name = "GeminiUnavailableError";
  }
}

// ─── 응답 정규화 ──────────────────────────────────────────────────────────────
const validateAndNormalizePrescription = (
  raw: unknown,
  quiz: QuizAnswers,
): Prescription => {
  if (!isObject(raw)) throw new Error("AI 응답 형식이 올바르지 않습니다.");

  const emotional      = isObject(raw.emotional_analysis) ? raw.emotional_analysis : {};
  const additionalCare = isObject(raw.additional_care)    ? raw.additional_care    : {};
  const rawBooks       = Array.isArray(raw.recommended_books) ? raw.recommended_books : [];

  if (rawBooks.length === 0) throw new Error("추천 도서가 포함되지 않았습니다.");

  const recommended_books = rawBooks
    .filter(isObject)
    .map((book) => ({
      title:         toSafeString(book.title),
      author:        toSafeString(book.author),
      publisher:     toSafeString(book.publisher),
      year:          toSafeString(book.year),
      isbn:          normalizeIsbn(book.isbn),
      genre:         toSafeString(book.genre),
      why_this_book: toSafeString(book.why_this_book),
      healing_point: toSafeString(book.healing_point),
      reading_guide: toSafeString(book.reading_guide),
      music_keyword: toSafeString(book.music_keyword) || undefined,
      tags: Array.isArray(book.tags)
        ? book.tags.map((t) => toSafeString(t)).filter(Boolean)
        : undefined,
    }))
    .filter(
      (b) =>
        b.title && b.author && b.publisher && b.year &&
        b.genre && b.why_this_book && b.healing_point && b.reading_guide,
    );

  if (recommended_books.length === 0) throw new Error("유효한 추천 도서 데이터가 없습니다.");

  const activities = Array.isArray(additionalCare.activities)
    ? additionalCare.activities.map((i) => toSafeString(i)).filter(Boolean)
    : [];

  return {
    emotional_analysis: {
      detected_emotion: toSafeString(emotional.detected_emotion, MOOD_LABEL[quiz.mood] ?? "복합 감정"),
      intensity:        toSafeNumber(emotional.intensity, 5),
      empathy_message:  toSafeString(emotional.empathy_message, "지금의 마음을 천천히 살펴볼 필요가 있습니다."),
    },
    healing_message: toSafeString(
      raw.healing_message,
      "당신의 마음에 평온한 바람이 머물기를 바랍니다.",
    ),
    recommended_books,
    additional_care: {
      activities: activities.length > 0
        ? activities
        : ["가벼운 산책", "짧은 독서", "오늘 감정 한 줄 기록하기"],
      professional_help: toSafeString(additionalCare.professional_help) || undefined,
    },
    quiz_answers: quiz,
  };
};

// ─── 문진 → 프롬프트 변환 ────────────────────────────────────────────────────
const buildUserPrompt = (quiz: QuizAnswers): string => {
  return [
    `[오늘의 문진 결과]`,
    `기분: ${MOOD_LABEL[quiz.mood]}`,
    `고민: ${CONCERN_LABEL[quiz.concern]}`,
    `독서 결: ${READ_STYLE_LABEL[quiz.readStyle]}`,
    ``,
    `위 방문자에게 맞는 책 3권을 처방해주세요.`,
  ].join("\n");
};

// ─── 메인 함수 ────────────────────────────────────────────────────────────────
export const getPrescription = async (quiz: QuizAnswers): Promise<Prescription> => {
  try {
    const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";
    const apiKey = rawApiKey.trim();

    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY가 없습니다.");
    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
      throw new Error("VITE_GEMINI_API_KEY 형식이 잘못되었습니다.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = buildUserPrompt(quiz);

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    );

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어 있습니다.");

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(cleaned);

    return validateAndNormalizePrescription(parsed, quiz);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("GEMINI_ERROR:", msg);
    if (is503Error(error)) throw new GeminiUnavailableError();
    throw new Error("GEMINI_ERROR: " + msg);
  }
};
