// src/services/kakaoBooksService.ts
import type { NormalizedBook } from "./bookTypes";

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY || "";
const BASE_URL = "https://dapi.kakao.com/v3/search/book";

interface KakaoBookItem {
  title: string;
  contents: string;
  url: string;
  isbn: string;
  datetime: string;
  authors: string[];
  publisher: string;
  translators: string[];
  price: number;
  sale_price: number;
  thumbnail: string;
  status: string;
}

interface KakaoBookResponse {
  meta: { total_count: number; pageable_count: number; is_end: boolean };
  documents: KakaoBookItem[];
}

export async function searchKakaoBooks(
  title: string,
  author: string,
  size: number = 20
): Promise<NormalizedBook[]> {
  if (!KAKAO_API_KEY) {
    console.warn("[Kakao] API 키 미설정");
    return [];
  }

  try {
    const params = new URLSearchParams({ query: `${title} ${author}`, size: String(size), sort: "latest" });

    const response = await fetch(`${BASE_URL}?${params}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
    });

    if (!response.ok) {
      console.warn(`[Kakao] API 응답 오류: ${response.status}`);
      return [];
    }

    const data: KakaoBookResponse = await response.json();
    return data.documents.map(normalizeKakaoBook).filter((b): b is NormalizedBook => b !== null);
  } catch (error) {
    console.warn("[Kakao] 검색 실패 (CORS 가능성):", error);
    return [];
  }
}

function normalizeKakaoBook(item: KakaoBookItem): NormalizedBook | null {
  if (!item.title) return null;

  const isbnParts = item.isbn.split(" ").filter(Boolean);
  const isbn13 = isbnParts.find((p) => p.length === 13 && (p.startsWith("978") || p.startsWith("979"))) || null;
  const isbn10 = isbnParts.find((p) => p.length === 10) || null;
  const pubdate = item.datetime ? item.datetime.slice(0, 10).replace(/-/g, "") : "00000000";

  return {
    source: "kakao",
    title: item.title.replace(/<[^>]*>/g, "").trim(),
    author: item.authors.join(", "),
    publisher: item.publisher,
    pubdate,
    isbn13,
    isbn10,
    image: item.thumbnail || "",
    description: item.contents || "",
  };
}
