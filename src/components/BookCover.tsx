import React, { useState } from "react";

type BookCoverProps = {
  title: string;
  image?: string | null;
  className?: string;
};

// ─── 장르/제목 기반 배경 색상 (BookCover 단독 fallback용) ────────────────
const COVER_PALETTES = [
  { bg: "linear-gradient(160deg,#C4C8D8,#9898BB)", text: "rgba(255,255,255,0.90)" },
  { bg: "linear-gradient(160deg,#C4D8C0,#8CB484)", text: "rgba(255,255,255,0.90)" },
  { bg: "linear-gradient(160deg,#D8D0C4,#B8A898)", text: "rgba(255,255,255,0.88)" },
  { bg: "linear-gradient(160deg,#D8C8C0,#C0A898)", text: "rgba(255,255,255,0.88)" },
  { bg: "linear-gradient(160deg,#C8D8D4,#98B8B0)", text: "rgba(255,255,255,0.90)" },
  { bg: "linear-gradient(160deg,#D0C8D8,#B0A8C0)", text: "rgba(255,255,255,0.88)" },
];

function getPaletteIndex(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  }
  return hash % COVER_PALETTES.length;
}

// ─── 제목 2줄 잘라 표시 ──────────────────────────────────────────────────
function splitTitle(title: string): [string, string] {
  const cleaned = title.replace(/\([^)]*\)/g, "").trim();
  if (cleaned.length <= 10) return [cleaned, ""];
  const mid = Math.ceil(cleaned.length / 2);
  // 공백 기준 근접 분할
  const spaceIdx = cleaned.indexOf(" ", mid - 3);
  const splitAt = spaceIdx > 0 && spaceIdx < mid + 5 ? spaceIdx : mid;
  return [cleaned.slice(0, splitAt).trim(), cleaned.slice(splitAt).trim()];
}

const BookCover: React.FC<BookCoverProps> = ({ title, image, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  const showFallback = !image || imgError;
  const palette = COVER_PALETTES[getPaletteIndex(title)];
  const [line1, line2] = splitTitle(title);

  if (!showFallback) {
    return (
      <img
        src={image!}
        alt={title}
        className={className}
        loading="lazy"
        onError={() => setImgError(true)}
        style={{ display: "block" }}
      />
    );
  }

  // ── Fallback: 종이약국 테마 표지 ──────────────────────────────────────
  return (
    <div
      className={className}
      aria-label={title}
      style={{
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14% 10% 12%",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* 상단 광택 레이어 — 종이 질감 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* 책등 세로선 */}
      <div style={{
        position: "absolute", top: 0, left: "14%", bottom: 0,
        width: 1,
        background: "rgba(255,255,255,0.18)",
        pointerEvents: "none",
      }} />

      {/* 상단 장식 — 종이약국 심볼 */}
      <div style={{
        fontSize: "clamp(16px, 6cqw, 24px)",
        lineHeight: 1,
        opacity: 0.72,
        marginBottom: "8%",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
      }}>
        ℞
      </div>

      {/* 제목 */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.25em",
        width: "100%",
      }}>
        <span style={{
          color: palette.text,
          fontFamily: "'Gowun Batang', 'Noto Serif KR', serif",
          fontSize: "clamp(9px, 5cqw, 14px)",
          fontWeight: 700,
          lineHeight: 1.45,
          textAlign: "center",
          letterSpacing: "0.06em",
          textShadow: "0 1px 3px rgba(0,0,0,0.22)",
          wordBreak: "keep-all",
        }}>
          {line1}
        </span>
        {line2 && (
          <span style={{
            color: palette.text,
            fontFamily: "'Gowun Batang', 'Noto Serif KR', serif",
            fontSize: "clamp(9px, 5cqw, 14px)",
            fontWeight: 700,
            lineHeight: 1.45,
            textAlign: "center",
            letterSpacing: "0.06em",
            textShadow: "0 1px 3px rgba(0,0,0,0.22)",
            wordBreak: "keep-all",
          }}>
            {line2}
          </span>
        )}
      </div>

      {/* 하단 구분선 */}
      <div style={{
        width: "40%", height: 1,
        background: "rgba(255,255,255,0.35)",
        marginTop: "10%",
        flexShrink: 0,
      }} />
    </div>
  );
};

export default BookCover;
