import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const authKey = process.env.LIBRARY_API_KEY;
  if (!authKey) {
    return res.status(500).json({ error: "LIBRARY_API_KEY가 설정되지 않았습니다." });
  }

  const rawPath = req.url || "";

  // Vercel에서 req.url은 /libSrch?... 형태로 옴 (/api/library 없음)
  // 쿼리스트링 분리
  const [pathPart, queryPart] = rawPath.split("?");

  // /libSrch 또는 /api/library/libSrch 둘 다 처리
  const cleanPath = pathPart
    .replace(/^\/api\/library/, "")  // /api/library/libSrch → /libSrch
    .replace(/^\/api/, "")           // /api/libSrch → /libSrch
    || "/srchBooks";

  try {
    const target = new URL(`https://data4library.kr/api${cleanPath}`);

    // 쿼리스트링 파싱 후 주입
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((value, key) => {
        target.searchParams.set(key, value);
      });
    }
    target.searchParams.set("authKey", authKey);
    target.searchParams.set("format", "json");

    const response = await fetch(target.toString());

    if (!response.ok) {
      return res.status(response.status).json({
        error: `정보나루 API 오류: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "정보나루 API 호출 실패",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}