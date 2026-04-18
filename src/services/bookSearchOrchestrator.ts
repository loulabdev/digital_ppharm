// src/services/bookSearchOrchestrator.ts
import { searchGoogleBooks } from "./googleBooksService";
import { searchKakaoBooks } from "./kakaoBooksService";
import { searchNaverBooks } from "./naverBookService";
import type { NormalizedBook, LatestEditionResult } from "./bookTypes";

// 타입 re-export (PrescriptionView에서 사용)
export type { NormalizedBook, LatestEditionResult };

export async function findLatestEdition(
  title: string,
  author: string,
  currentIsbn?: string
): Promise<LatestEditionResult> {
  const cleanTitle = normalizeTitle(title);
  const cleanAuthor = author.trim();

  const [googleResult, kakaoResult, naverResult] = await Promise.allSettled([
    searchGoogleBooks(cleanTitle, cleanAuthor),
    searchKakaoBooks(cleanTitle, cleanAuthor),
    searchNaverBooks(cleanTitle, cleanAuthor),
  ]);

  const googleBooks = googleResult.status === "fulfilled" ? googleResult.value : [];
  const kakaoBooks = kakaoResult.status === "fulfilled" ? kakaoResult.value : [];
  const naverBooks = naverResult.status === "fulfilled" ? naverResult.value : [];

  const sourceStats = { google: googleBooks.length, kakao: kakaoBooks.length, naver: naverBooks.length };

  console.log(`[Orchestrator] Google=${sourceStats.google}, Kakao=${sourceStats.kakao}, Naver=${sourceStats.naver}`);

  const allBooks = [...googleBooks, ...kakaoBooks, ...naverBooks];

  if (allBooks.length === 0) {
    return { found: false, isNewer: false, latest: null, allEditions: [], sourceStats };
  }

  const sameBookEditions = allBooks.filter((book) =>
    isSameBook(cleanTitle, book.title) && isSameAuthor(cleanAuthor, book.author)
  );

  const candidates = sameBookEditions.length > 0
    ? sameBookEditions
    : allBooks.filter((book) => isSameBook(cleanTitle, book.title));

  if (candidates.length === 0) {
    return { found: false, isNewer: false, latest: null, allEditions: [], sourceStats };
  }

  const deduped = deduplicateByIsbn(candidates);

  const sorted = deduped.sort((a, b) => {
    return (parseInt(b.pubdate, 10) || 0) - (parseInt(a.pubdate, 10) || 0);
  });

  const latest = sorted[0];
  const isNewer = currentIsbn ? latest.isbn13 !== currentIsbn && latest.isbn13 !== null : false;

  return { found: true, isNewer, latest, allEditions: sorted, sourceStats };
}

function deduplicateByIsbn(books: NormalizedBook[]): NormalizedBook[] {
  const map = new Map<string, NormalizedBook>();
  const priority: Record<string, number> = { google: 3, kakao: 2, naver: 1 };

  for (const book of books) {
    const key = book.isbn13 || `${book.title}::${book.pubdate}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, book);
    } else {
      const ep = priority[existing.source] || 0;
      const np = priority[book.source] || 0;
      if (np > ep) {
        map.set(key, { ...book, description: book.description || existing.description, isbn13: book.isbn13 || existing.isbn13 });
      } else {
        map.set(key, { ...existing, description: existing.description || book.description, isbn13: existing.isbn13 || book.isbn13 });
      }
    }
  }
  return Array.from(map.values());
}

function normalizeTitle(title: string): string {
  return title.replace(/[:：].+$/, "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/[^\w\s가-힣a-zA-Z0-9]/g, "").trim();
}

function isSameBook(orig: string, cand: string): boolean {
  const strip = (t: string) => t.replace(/\s*(개정|증보|신|최신|완전|전면|제?\d+)\s*(판|쇄|개정판|증보판)?/g, "").replace(/\s*\d+(st|nd|rd|th)\s*edition/gi, "").replace(/\s+/g, "").toLowerCase().trim();
  const a = strip(normalizeTitle(orig));
  const b = strip(normalizeTitle(cand));
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return ngramSimilarity(a, b, 2) >= 0.6;
}

function isSameAuthor(orig: string, cand: string): boolean {
  const norm = (n: string) => n.replace(/\s+/g, "").replace(/[,·|/]/g, " ").toLowerCase().trim();
  const op = norm(orig).split(" ").filter((p) => p.length > 0);
  const cp = norm(cand).split(" ").filter((p) => p.length > 0);
  return op.some((p) => cp.some((c) => c.includes(p) || p.includes(c)));
}

function ngramSimilarity(a: string, b: string, n: number): number {
  if (a.length < n || b.length < n) return 0;
  const sa = new Set<string>(), sb = new Set<string>();
  for (let i = 0; i <= a.length - n; i++) sa.add(a.slice(i, i + n));
  for (let i = 0; i <= b.length - n; i++) sb.add(b.slice(i, i + n));
  let inter = 0;
  sa.forEach((ng) => { if (sb.has(ng)) inter++; });
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function formatPubdate(pubdate: string): string {
  if (!pubdate || pubdate.length < 8 || pubdate === "00000000") return "날짜 미상";
  return `${pubdate.slice(0, 4)}.${pubdate.slice(4, 6)}.${pubdate.slice(6, 8)}`;
}
