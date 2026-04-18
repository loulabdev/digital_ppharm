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

  // /api/library 뒤의 경로 추출 (예: /srchBooks, /bookExist 등)
  const rawPath = req.url || "";
  const subPath = rawPath.replace(/^\/api\/library/, "") || "/srchBooks";

  try {
    const target = new URL(`https://data4library.kr/api${subPath}`);

    // 쿼리스트링 전달 + authKey 주입
    const incoming = new URL(rawPath, "http://localhost");
    incoming.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });
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
