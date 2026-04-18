export const cleanIsbn = (isbn?: string | null): string => {
  if (!isbn) return "";
  return isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
};

export const isValidIsbn10 = (isbn: string): boolean => {
  const clean = cleanIsbn(isbn);
  if (!/^\d{9}[\dX]$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(clean[i]) * (10 - i);
  }
  sum += clean[9] === "X" ? 10 : Number(clean[9]);

  return sum % 11 === 0;
};

export const isValidIsbn13 = (isbn: string): boolean => {
  const clean = cleanIsbn(isbn);
  if (!/^\d{13}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;

  return check === Number(clean[12]);
};

export const convertIsbn10To13 = (isbn10: string): string | null => {
  const clean = cleanIsbn(isbn10);
  if (!isValidIsbn10(clean)) return null;

  const body = "978" + clean.slice(0, 9);
  let sum = 0;

  for (let i = 0; i < body.length; i++) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }

  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
};

export const convertIsbn13To10 = (isbn13: string): string | null => {
  const clean = cleanIsbn(isbn13);
  if (!isValidIsbn13(clean)) return null;
  if (!clean.startsWith("978")) return null;

  const body = clean.slice(3, 12);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(body[i]) * (10 - i);
  }

  const remainder = 11 - (sum % 11);
  let check = "";

  if (remainder === 10) check = "X";
  else if (remainder === 11) check = "0";
  else check = String(remainder);

  return `${body}${check}`;
};

export const normalizeIsbnCandidates = (isbns: Array<string | null | undefined>): string[] => {
  const set = new Set<string>();

  for (const raw of isbns) {
    const clean = cleanIsbn(raw);
    if (!clean) continue;

    if (isValidIsbn13(clean)) {
      set.add(clean);
      const isbn10 = convertIsbn13To10(clean);
      if (isbn10) set.add(isbn10);
      continue;
    }

    if (isValidIsbn10(clean)) {
      set.add(clean);
      const isbn13 = convertIsbn10To13(clean);
      if (isbn13) set.add(isbn13);
    }
  }

  return [...set];
};