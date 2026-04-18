// src/services/editionIsbnService.ts
// 정보나루 srchBooks + 국립중앙도서관 ISBN API로
// 같은 책의 모든 판본 ISBN을 수집

import type { IsbnCollectionStats, IsbnSourceStat } from "../types";

const LIBRARY_API_KEY = import.meta.env.VITE_LIBRARY_API_KEY || "";

export interface EditionIsbn {
  isbn13: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
  source: "data4library" | "nl_seoji";
}

// ============================================================
// ISBN-10 → ISBN-13 변환 (Mod-10 체크섬)
// ============================================================

function convertIsbn10To13(isbn10: string): string {
  const digits = isbn10.replace(/[^0-9]/g, "").slice(0, 9);
  if (digits.length !== 9) return isbn10;
  const prefix = "978" + digits;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return prefix + check;
}

function normalizeToIsbn13(raw: string): string {
  const cleaned = raw.replace(/[-\s]/g, "").trim();
  if (cleaned.length === 13 && /^\d+$/.test(cleaned)) return cleaned;
  if (cleaned.length === 10) return convertIsbn10To13(cleaned);
  // [FIX] 공백 포함 여러 ISBN이 한 필드에 들어오는 경우 첫 번째 ISBN만 추출
  const match = cleaned.match(/\d{13}/);
  if (match) return match[0];
  return cleaned;
}

// ============================================================
// 내부 공통 로직
// ============================================================

export interface EditionCollectResult {
  isbns: string[];
  stats: IsbnCollectionStats;
}

async function _collectEditions(title: string, author: string): Promise<EditionCollectResult> {
  const cleanTitle = title.replace(/[:：].+$/, "").replace(/\([^)]*\)/g, "").trim();

  const [data4libResult, nlResult] = await Promise.allSettled([
    searchData4Library(cleanTitle),
    searchNlSeoji(cleanTitle),
  ]);

  const data4libRaw = data4libResult.status === "fulfilled" ? data4libResult.value : [];
  const nlRaw       = nlResult.status       === "fulfilled" ? nlResult.value       : [];

  console.log(`[EditionISBN] 정보나루: ${data4libRaw.length}건, 국중도: ${nlRaw.length}건`);

  // [FIX] 저자 필터를 완화: isSameAuthor가 false여도 ISBN이 유효하면 포함
  // 저자 불일치로 인한 과도한 필터링 방지
  const filter = (list: EditionIsbn[]) =>
    [...new Set(
      list
        .filter(ed => isSameAuthor(author, ed.author))
        .map(ed => ed.isbn13)
    )].filter(i => i.length === 13);

  // [FIX] 저자 필터 결과가 0개면 필터 없이 전체 ISBN 수집 (필터 실패 fallback)
  const filterWithFallback = (list: EditionIsbn[]) => {
    const filtered = filter(list);
    if (filtered.length === 0 && list.length > 0) {
      console.warn(`[EditionISBN] 저자 필터 결과 0개 → 필터 없이 전체 ISBN 수집 (fallback)`);
      return [...new Set(list.map(ed => ed.isbn13))].filter(i => i.length === 13);
    }
    return filtered;
  };

  const d4lIsbns = filterWithFallback(data4libRaw);
  const nlIsbns  = filterWithFallback(nlRaw);

  const uniqueIsbns = [...new Set([...d4lIsbns, ...nlIsbns])];

  console.log(`[EditionISBN] 고유 ISBN-13: ${uniqueIsbns.length}개`);

  const sources: IsbnSourceStat[] = [];
  if (d4lIsbns.length > 0) sources.push({ source: "정보나루",       count: d4lIsbns.length, isbns: d4lIsbns });
  if (nlIsbns.length  > 0) sources.push({ source: "국립중앙도서관", count: nlIsbns.length,  isbns: nlIsbns  });

  return {
    isbns: uniqueIsbns,
    stats: { totalCount: uniqueIsbns.length, sources },
  };
}

export async function collectAllEditionIsbns(title: string, author: string): Promise<string[]> {
  const { isbns } = await _collectEditions(title, author);
  return isbns;
}

export async function collectAllEditionIsbnsWithStats(title: string, author: string): Promise<EditionCollectResult> {
  return _collectEditions(title, author);
}

// ============================================================
// 정보나루 srchBooks
// ============================================================

async function searchData4Library(title: string): Promise<EditionIsbn[]> {
  if (!LIBRARY_API_KEY) {
    console.warn("[EditionISBN] 정보나루 API 키 미설정");
    return [];
  }

  try {
    const url = `https://data4library.kr/api/srchBooks?authKey=${LIBRARY_API_KEY}&title=${encodeURIComponent(title)}&pageSize=20`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    const books = doc.querySelectorAll("book");

    const results: EditionIsbn[] = [];

    books.forEach((book) => {
      const rawIsbn = getXmlText(book, "isbn13");
      const isbn13 = normalizeToIsbn13(rawIsbn);
      if (isbn13.length !== 13) return;

      results.push({
        isbn13,
        title: getXmlText(book, "bookname"),
        author: getXmlText(book, "authors"),
        publisher: getXmlText(book, "publisher"),
        year: getXmlText(book, "publication_year"),
        source: "data4library",
      });
    });

    return results;
  } catch (error) {
    console.warn("[EditionISBN] 정보나루 검색 실패:", error);
    return [];
  }
}

function getXmlText(parent: Element, tagName: string): string {
  const el = parent.querySelector(tagName);
  return el?.textContent?.trim() || "";
}

// ============================================================
// 국립중앙도서관 ISBN 서지정보 API (프록시 경유)
// ============================================================

async function searchNlSeoji(title: string): Promise<EditionIsbn[]> {
  try {
    const params = new URLSearchParams({ title, page_size: "20" });
    const response = await fetch(`/api/nl-seoji?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    const docs: Record<string, string>[] = data.docs || data.result || data.response?.docs || [];

    if (docs.length === 0) {
      console.warn("[EditionISBN] 국중도 응답 docs 없음. 전체 응답:", JSON.stringify(data).slice(0, 300));
      return [];
    }

    // [FIX] 첫 번째 문서의 키를 로그로 출력 → 실제 필드명 확인
    if (docs.length > 0) {
      console.log("[EditionISBN] 국중도 첫 번째 doc 키:", Object.keys(docs[0]).join(", "));
    }

    const results: EditionIsbn[] = [];

    for (const doc of docs) {
      // [FIX] 가능한 모든 ISBN 필드명 커버
      const rawIsbn = (
        doc.EA_ISBN ||
        doc.isbn13  ||
        doc.ISBN13  ||
        doc.isbn    ||
        doc.ISBN    ||
        doc.isbn10  ||
        doc.ISBN10  ||
        ""
      ).replace(/[-\s]/g, "").trim();

      const isbn13 = normalizeToIsbn13(rawIsbn);
      if (isbn13.length !== 13) continue;

      results.push({
        isbn13,
        title:     doc.TITLE      || doc.title      || "",
        // [FIX] 저자 필드명 확장
        author:    doc.AUTHOR     || doc.author     || doc.EA_ADD_CODE || doc.creator || "",
        publisher: doc.PUBLISHER  || doc.publisher  || "",
        year:     (doc.PUBLISH_PREDATE || doc.publish_predate || doc.pubdate || "").slice(0, 4),
        source: "nl_seoji",
      });
    }

    return results;
  } catch (error) {
    console.warn("[EditionISBN] 국중도 검색 실패:", error);
    return [];
  }
}

// ============================================================
// 저자 비교
// ============================================================

function isSameAuthor(original: string, candidate: string): boolean {
  if (!original || !candidate) return true;

  const normalize = (name: string) =>
    name
      .replace(/\s+/g, "")
      .replace(/[,·|/;]/g, " ")
      .replace(/지은이|글|그림|옮김|편저|저|역/g, "")
      .toLowerCase()
      .trim();

  const origParts = normalize(original).split(" ").filter((p) => p.length > 1);
  const candParts = normalize(candidate).split(" ").filter((p) => p.length > 1);

  // [FIX] 파싱 결과가 비어있으면 비교 불가 → 통과 (기존: false로 전부 차단)
  if (origParts.length === 0 || candParts.length === 0) return true;

  return origParts.some((part) =>
    candParts.some((cPart) => cPart.includes(part) || part.includes(cPart))
  );
}
