export const getEditionIsbnCandidates = async (book: {
  title: string;
  author?: string;
  isbn?: string;
}) => {
  const originalIsbn = cleanIsbn(book.isbn);
  const isbn13 =
    originalIsbn.length === 10 ? convertIsbn10To13(originalIsbn) : originalIsbn.length === 13 ? originalIsbn : null;
  const isbn10 =
    originalIsbn.length === 13 ? convertIsbn13To10(originalIsbn) : originalIsbn.length === 10 ? originalIsbn : null;

  // 예시: 외부 API들에서 모아온 후보
  const rawEditionCandidates = [
    book.isbn,
    isbn10,
    isbn13,
    // naver results...
    // google books results...
    // kakao books results...
  ];

  const dedupedCandidates = normalizeIsbnCandidates(rawEditionCandidates);

  logLibrarySearchDebug("edition-candidates", {
    title: book.title,
    author: book.author,
    originalIsbn,
    normalizedIsbn: originalIsbn,
    isbn10,
    isbn13,
    editionCandidates: rawEditionCandidates.filter(Boolean) as string[],
    dedupedCandidates,
    finalLookupIsbns: dedupedCandidates,
  });

  return dedupedCandidates;
};