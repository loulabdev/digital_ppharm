// src/services/naverBookService.ts
import type { NormalizedBook } from "./bookTypes";

interface NaverBookItem {
  title: string;
  link: string;
  image: string;
  author: string;
  discount: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
}

interface NaverBookResponse {
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

export async function searchNaverBooks(
  title: string,
  author: string,
  display: number = 20
): Promise<NormalizedBook[]> {
  try {
    const query = `${title} ${author}`;
    const params = new URLSearchParams({ query, display: String(display) });

    const response = await fetch(`/api/naver-book?${params}`);
    if (!response.ok) {
      console.warn(`[Naver] API 응답 오류: ${response.status}`);
      return [];
    }

    const data: NaverBookResponse = await response.json();
    if (!data.items) return [];

    return data.items.map(normalizeNaverBook).filter((b): b is NormalizedBook => b !== null);
  } catch (error) {
    console.warn("[Naver] 검색 실패:", error);
    return [];
  }
}

function normalizeNaverBook(item: NaverBookItem): NormalizedBook | null {
  if (!item.title) return null;

  const isbnParts = item.isbn.split(" ").filter(Boolean);
  const isbn13 = isbnParts.find((p) => p.length === 13 && (p.startsWith("978") || p.startsWith("979"))) || null;
  const isbn10 = isbnParts.find((p) => p.length === 10) || null;

  return {
    source: "naver",
    title: item.title.replace(/<[^>]*>/g, "").trim(),
    author: item.author.replace(/<[^>]*>/g, "").trim(),
    publisher: item.publisher,
    pubdate: item.pubdate || "00000000",
    isbn13,
    isbn10,
    image: item.image || "",
    description: item.description.replace(/<[^>]*>/g, "").trim(),
  };
}
