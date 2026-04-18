// src/services/googleBooksService.ts
import type { NormalizedBook } from "./bookTypes";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || "";
const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    pageCount?: number;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleVolume[];
}

export async function searchGoogleBooks(
  title: string,
  author: string,
  maxResults: number = 10
): Promise<NormalizedBook[]> {
  try {
    const query = `intitle:${title}+inauthor:${author}`;
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
      orderBy: "newest",
      langRestrict: "ko",
      printType: "books",
    });
    if (GOOGLE_API_KEY) params.set("key", GOOGLE_API_KEY);

    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) return [];

    const data: GoogleBooksResponse = await response.json();
    if (!data.items) return [];

    return data.items.map(normalizeGoogleBook).filter((b): b is NormalizedBook => b !== null);
  } catch (error) {
    console.error("[Google Books] 검색 실패:", error);
    return [];
  }
}

function normalizeGoogleBook(vol: GoogleVolume): NormalizedBook | null {
  const info = vol.volumeInfo;
  if (!info.title) return null;

  const isbn13 = info.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier || null;
  const isbn10 = info.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier || null;
  const pubdate = normalizePubdate(info.publishedDate);

  let image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
  if (image.startsWith("http://")) image = image.replace("http://", "https://");
  image = image.replace("zoom=1", "zoom=2");

  return {
    source: "google",
    title: info.title,
    author: info.authors?.join(", ") || "",
    publisher: info.publisher || "",
    pubdate,
    isbn13,
    isbn10,
    image,
    description: info.description || "",
    pageCount: info.pageCount,
  };
}

function normalizePubdate(date?: string): string {
  if (!date) return "00000000";
  return date.replace(/-/g, "").padEnd(8, "01");
}
