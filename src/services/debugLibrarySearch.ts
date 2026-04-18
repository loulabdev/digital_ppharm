.export type LibrarySearchDebugPayload = {
  title?: string;
  author?: string;
  originalIsbn?: string;
  normalizedIsbn?: string;
  isbn10?: string | null;
  isbn13?: string | null;
  editionCandidates?: string[];
  dedupedCandidates?: string[];
  finalLookupIsbns?: string[];
  regionResults?: Array<{
    region: string;
    requestedIsbns: string[];
    resultCount: number;
    success: boolean;
    error?: string;
  }>;
};

export const logLibrarySearchDebug = (
  step: string,
  payload: LibrarySearchDebugPayload
) => {
  console.group(`[PaperPharmacy][LibraryDebug] ${step}`);
  console.log("title:", payload.title);
  console.log("author:", payload.author);
  console.log("originalIsbn:", payload.originalIsbn);
  console.log("normalizedIsbn:", payload.normalizedIsbn);
  console.log("isbn10:", payload.isbn10);
  console.log("isbn13:", payload.isbn13);
  console.log("editionCandidates:", payload.editionCandidates);
  console.log("dedupedCandidates:", payload.dedupedCandidates);
  console.log("finalLookupIsbns:", payload.finalLookupIsbns);

  if (payload.regionResults?.length) {
    console.table(payload.regionResults);
  }

  console.groupEnd();
};