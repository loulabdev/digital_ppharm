import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { title, page_size = "20" } = req.query;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title 파라미터가 필요합니다." });
  }

  const certKey = process.env.NL_SEOJI_KEY;
  if (!certKey) {
    return res.status(500).json({ error: "NL_SEOJI_KEY가 설정되지 않았습니다." });
  }

  try {
    const url = new URL("https://www.nl.go.kr/seoji/SearchApi.do");
    url.searchParams.set("cert_key", certKey);
    url.searchParams.set("result_style", "json");
    url.searchParams.set("page_no", "1");
    url.searchParams.set("page_size", String(page_size));
    url.searchParams.set("title", title);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return res.status(response.status).json({
        error: `국립중앙도서관 API 오류: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "국립중앙도서관 API 호출 실패",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
