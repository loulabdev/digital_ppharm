import React, { useEffect, useState } from "react";
import PrescriptionView from "./components/PrescriptionView";
import { getPrescription } from "./services/geminiService";
import {
  deleteSavedPrescription,
  getBookBookmarks,
  getSavedPrescriptions,
  resetAllStorage,
  savePrescriptionToStorage,
} from "./services/storageService";
import {
  AppState, MoodKey, ConcernKey, ReadStyleKey,
  QuizAnswers, Prescription, SavedPrescription, BookBookmark,
} from "./types";
import { Clock3, Trash2, Bookmark, ChevronDown, ChevronUp, BookOpen, Leaf } from "lucide-react";

// ─── 폰트 / 색상 토큰 ────────────────────────────────────────────────────────
const F          = "'Gowun Batang', 'Noto Serif KR', Georgia, serif";
const GB_FONT    = "'Gowun Mono', 'Courier New', monospace";
const BG         = "#f5efe3";
const PAGE1      = "#f5efe3";
const PAGE2      = "#f8f4ea";
const GREEN_DARK = "#1a3a20";
const GREEN_MID  = "#3a7a50";
const INK        = "#2a241b";
const BROWN      = "#3a2a18";
const BORDER     = "rgba(110,84,40,0.16)";
const MUTED      = "#8e7a5b";

const linesBg  = `repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(110,84,40,0.025) 30px,rgba(110,84,40,0.025) 31px)`;
const paperStyle = (bg: string): React.CSSProperties => ({ backgroundColor: bg, backgroundImage: linesBg });

// ─── 문진 데이터 ──────────────────────────────────────────────────────────────
interface ChipOption<K> { value: K; emoji: string; label: string; desc: string; }

const MOOD_OPTIONS: ChipOption<MoodKey>[] = [
  { value: "ANXIETY",   emoji: "😰", label: "불안함",       desc: "걱정이 멈추질 않아요" },
  { value: "EXHAUSTED", emoji: "😮‍💨", label: "지침",         desc: "몸도 마음도 녹초예요" },
  { value: "EMPTY",     emoji: "🫙", label: "공허함",       desc: "텅 빈 느낌이에요" },
  { value: "COMFORT",   emoji: "🍵", label: "위로받고 싶어", desc: "따뜻함이 필요해요" },
  { value: "EXCITED",   emoji: "✨", label: "설렘",         desc: "뭔가 좋은 일이 있어요" },
  { value: "NUMB",      emoji: "🌫️", label: "무감각",       desc: "아무 감각이 없어요" },
];

const CONCERN_OPTIONS: ChipOption<ConcernKey>[] = [
  { value: "RELATION", emoji: "🤝", label: "관계",      desc: "사람이 어렵고 피곤해요" },
  { value: "CAREER",   emoji: "🧭", label: "진로",      desc: "갈 길이 보이지 않아요" },
  { value: "DAILY",    emoji: "🌀", label: "일상",      desc: "루틴이 무너진 것 같아요" },
  { value: "WORK",     emoji: "💼", label: "일·공부",   desc: "부담이 너무 커요" },
  { value: "FAMILY",   emoji: "🏠", label: "가족",      desc: "가족 관계가 복잡해요" },
  { value: "SELF",     emoji: "🪞", label: "자아",      desc: "나 자신을 잃은 것 같아요" },
];

const READ_STYLE_OPTIONS: ChipOption<ReadStyleKey>[] = [
  { value: "LIGHT", emoji: "🍃", label: "가볍게",   desc: "부담 없이 읽고 싶어요" },
  { value: "SHORT", emoji: "⏱️", label: "짧게",     desc: "빠르게 읽을 수 있는 것" },
  { value: "DEEP",  emoji: "🌊", label: "깊게",     desc: "몰입해서 읽고 싶어요" },
  { value: "WARM",  emoji: "🔥", label: "따뜻하게", desc: "마음이 데워지는 책" },
  { value: "CLEAR", emoji: "💡", label: "명쾌하게", desc: "생각이 정리되는 책" },
];

const QUIZ_STEPS = [
  { key: "mood",      label: "STEP 1 / 3", title: "오늘의 기분이 어떠세요?",       intro: "지금 이 순간, 마음속 가장 가까이 있는 감정을 골라주세요." },
  { key: "concern",   label: "STEP 2 / 3", title: "요즘 어떤 고민이 있나요?",      intro: "마음 한켠을 차지하고 있는 고민을 알려주세요. 책이 살며시 다가갈게요." },
  { key: "readStyle", label: "STEP 3 / 3", title: "어떤 독서 결을 원하세요?",      intro: "오늘 읽고 싶은 책의 분위기를 알려주세요." },
] as const;

// ─── 유틸 ────────────────────────────────────────────────────────────────────
const MOOD_LABEL:       Record<MoodKey,      string> = { ANXIETY:"불안함", EXHAUSTED:"지침", EMPTY:"공허함", COMFORT:"위로", EXCITED:"설렘", NUMB:"무감각" };
const CONCERN_LABEL:    Record<ConcernKey,   string> = { RELATION:"관계", CAREER:"진로", DAILY:"일상", WORK:"일·공부", FAMILY:"가족", SELF:"자아" };
const READ_STYLE_LABEL: Record<ReadStyleKey, string> = { LIGHT:"가볍게", SHORT:"짧게", DEEP:"깊게", WARM:"따뜻하게", CLEAR:"명쾌하게" };

const quizLabel = (q: QuizAnswers) =>
  `${MOOD_LABEL[q.mood]} · ${CONCERN_LABEL[q.concern]} · ${READ_STYLE_LABEL[q.readStyle]}`;

const formatRxNum  = (id: string) => `No. ${id.slice(0, 4).toUpperCase()}`;
const formatDate   = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

// ─── 칩 컴포넌트 ─────────────────────────────────────────────────────────────
function Chip<K extends string>({
  option, selected, onSelect,
}: {
  option: ChipOption<K>;
  selected: boolean;
  onSelect: (v: K) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "14px 10px", borderRadius: 8, cursor: "pointer", userSelect: "none",
        border: selected ? `2px solid ${GREEN_MID}` : `1.5px solid ${BORDER}`,
        background: selected ? GREEN_DARK : "rgba(255,255,255,0.65)",
        color: selected ? PAGE2 : INK,
        transition: "all 0.15s",
        boxShadow: selected ? `0 2px 10px rgba(45,106,79,0.22)` : "none",
        fontFamily: F,
      }}
    >
      <span style={{ fontSize: "1.5rem", marginBottom: 5 }}>{option.emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{option.label}</span>
      <span style={{ fontSize: 10, opacity: 0.72, lineHeight: 1.4, textAlign: "center" }}>{option.desc}</span>
    </button>
  );
}

// ─── 메인 앱 ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [appState,           setAppState]           = useState<AppState>(AppState.IDLE);
  const [quizStep,           setQuizStep]           = useState(0);
  const [quizAnswers,        setQuizAnswers]        = useState<Partial<QuizAnswers>>({});
  const [prescription,       setPrescription]       = useState<Prescription | null>(null);
  const [error,              setError]              = useState<string | null>(null);
  const [savedPrescriptions, setSavedPrescriptions] = useState<SavedPrescription[]>([]);
  const [bookmarks,          setBookmarks]          = useState<BookBookmark[]>([]);
  const [isSavedOpen,        setIsSavedOpen]        = useState(false);
  const [isBookmarksOpen,    setIsBookmarksOpen]    = useState(false);
  const [isMenuOpen,         setIsMenuOpen]         = useState(false);

  useEffect(() => {
    setSavedPrescriptions(getSavedPrescriptions());
    setBookmarks(getBookBookmarks());
    try {
      const raw = localStorage.getItem("lastPrescription");
      if (raw) {
        const { prescription: p, userInput: u } = JSON.parse(raw);
        if (p && u) { setPrescription(p); setAppState(AppState.PRESCRIBED); }
      }
    } catch { /* 복원 실패 무시 */ }
  }, []);

  const refreshBookmarks = () => setBookmarks(getBookBookmarks());

  // ── 공유 ────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setIsMenuOpen(false);
    const lines: string[] = ["📚 종이약국 처방 기록\n"];
    if (savedPrescriptions.length > 0) {
      lines.push("[ 처방 기록 ]");
      savedPrescriptions.slice(0, 5).forEach(p => {
        lines.push(`• ${p.userInput}`);
        p.prescription.recommended_books.slice(0, 2).forEach(b => {
          lines.push(`  └ 《${b.title}》 ${b.author}`);
        });
      });
    }
    if (bookmarks.length > 0) {
      lines.push("\n[ 북마크 도서 ]");
      bookmarks.slice(0, 10).forEach(b => { lines.push(`• 《${b.book.title}》 ${b.book.author}`); });
    }
    const text = lines.join("\n");
    try {
      if (navigator.share) { await navigator.share({ title: "종이약국 처방 기록", text }); }
      else { await navigator.clipboard.writeText(text); alert("클립보드에 복사되었습니다!"); }
    } catch { /* 취소 무시 */ }
  };

  // ── 전체 초기화 ─────────────────────────────────────────────────────────────
  const handleResetStorage = () => {
    if (!window.confirm("북마크와 처방 기록을 모두 삭제할까요?\n이 작업은 되돌릴 수 없습니다.")) return;
    resetAllStorage();
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
    setBookmarks([]); setSavedPrescriptions([]); setPrescription(null);
    setQuizAnswers({}); setQuizStep(0); setError(null); setAppState(AppState.IDLE);
  };

  // ── 처방 요청 ────────────────────────────────────────────────────────────────
  const handleSubmit = async (answers: QuizAnswers) => {
    setError(null);
    setAppState(AppState.ANALYZING);
    try {
      const result = await getPrescription(answers);
      setPrescription(result);
      const label = quizLabel(answers);
      const savedItem: SavedPrescription = {
        id: crypto.randomUUID(), createdAt: new Date().toISOString(),
        userInput: label, prescription: result,
      };
      setSavedPrescriptions(savePrescriptionToStorage(savedItem));
      try { localStorage.setItem("lastPrescription", JSON.stringify({ prescription: result, userInput: label })); } catch { /* 무시 */ }
      refreshBookmarks();
      setAppState(AppState.PRESCRIBED);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError("오류: " + msg);
      setAppState(AppState.ERROR);
    }
  };

  // ── 리셋 ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPrescription(null); setError(null); refreshBookmarks();
    setQuizAnswers({}); setQuizStep(0); setAppState(AppState.IDLE);
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
  };

  const handleOpenSaved = (item: SavedPrescription) => {
    setPrescription(item.prescription); refreshBookmarks(); setAppState(AppState.PRESCRIBED);
  };
  const handleDeleteSaved = (id: string) => setSavedPrescriptions(deleteSavedPrescription(id));

  // ── 문진 단계 처리 ───────────────────────────────────────────────────────────
  const handleChipSelect = (key: keyof QuizAnswers, value: string) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    if (quizStep < 2) {
      setQuizStep(s => s + 1);
    } else {
      const qa = quizAnswers as QuizAnswers;
      handleSubmit(qa);
    }
  };

  const handlePrevStep = () => {
    if (quizStep === 0) { setAppState(AppState.IDLE); setQuizAnswers({}); }
    else setQuizStep(s => s - 1);
  };

  const currentStepKey = QUIZ_STEPS[quizStep].key as keyof QuizAnswers;
  const currentOptions =
    quizStep === 0 ? MOOD_OPTIONS :
    quizStep === 1 ? CONCERN_OPTIONS :
    READ_STYLE_OPTIONS;
  const currentSelection = quizAnswers[currentStepKey];

  // ══════════════════════════════════════════════════════════════════════════
  // QUIZ 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.QUIZ) {
    const step = QUIZ_STEPS[quizStep];
    return (
      <div style={{ minHeight: "100vh", background: BG, fontFamily: F, display: "flex", flexDirection: "column" }}>
        {/* 헤더 */}
        <div style={{ background: PAGE2, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
          <button
            type="button" onClick={handlePrevStep}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontFamily: F, flexShrink: 0 }}
          >←</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em", marginBottom: 1 }}>{step.label}</p>
            <p style={{ fontSize: 14, color: INK, fontWeight: 700 }}>{step.title}</p>
          </div>
        </div>
        {/* 프로그레스 바 */}
        <div style={{ height: 3, background: BORDER }}>
          <div style={{ height: "100%", background: GREEN_DARK, width: `${((quizStep + 1) / 3) * 100}%`, transition: "width 0.35s ease" }} />
        </div>
        {/* 본문 */}
        <div style={{ flex: 1, padding: "20px 16px 40px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
          <p style={{ ...paperStyle(PAGE1), fontSize: 13, color: MUTED, lineHeight: 1.85, padding: "12px 16px", borderLeft: `3px solid ${GREEN_DARK}`, marginBottom: 20, fontFamily: F }}>
            {step.intro}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {(currentOptions as ChipOption<string>[]).map(opt => (
              <Chip
                key={opt.value}
                option={opt}
                selected={currentSelection === opt.value}
                onSelect={(v) => handleChipSelect(currentStepKey, v)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!currentSelection}
            style={{
              width: "100%", padding: "14px", fontFamily: F, fontSize: 14, fontWeight: 700,
              background: currentSelection ? GREEN_DARK : BORDER,
              color: currentSelection ? PAGE2 : MUTED,
              border: "none", borderRadius: 8, cursor: currentSelection ? "pointer" : "not-allowed",
              transition: "all 0.2s", letterSpacing: "0.04em",
            }}
          >
            {quizStep < 2 ? "다음으로" : "📋 처방받기"}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYZING 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.ANALYZING) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG, fontFamily: F }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes wave{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-10px);}}
          .dot-wave{display:inline-block;width:9px;height:9px;border-radius:50%;background:rgba(200,160,64,0.85);margin:0 5px;animation:wave 1.2s ease infinite;}
          .dot-wave:nth-child(2){animation-delay:0.18s;}
          .dot-wave:nth-child(3){animation-delay:0.36s;}
        ` }} />
        <div style={{ background: PAGE2, border: `1px solid rgba(180,160,120,0.38)`, borderRadius: 14, padding: "32px 48px 28px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <p style={{ fontFamily: F, fontSize: 14, color: GREEN_DARK, letterSpacing: "0.05em", marginBottom: 16 }}>
            책장을 넘기는 중이에요

          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 28 }}>
            <span className="dot-wave" /><span className="dot-wave" /><span className="dot-wave" />
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRESCRIBED 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.PRESCRIBED && prescription) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG }}>
        <main style={{ flex: 1 }}>
          <PrescriptionView data={prescription} onReset={handleReset} onBookmarksChange={refreshBookmarks} />
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.ERROR) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", background: BG, fontFamily: F }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "32px", borderRadius: 16, background: PAGE2, border: "1px solid rgba(180,80,60,0.2)", boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
          <p style={{ fontFamily: GB_FONT, fontSize: 13.5, color: "#7a3020", marginBottom: 20, lineHeight: 1.7 }}>{error}</p>
          <button type="button" onClick={() => { setAppState(AppState.IDLE); setQuizAnswers({}); setQuizStep(0); }}
            style={{ fontFamily: F, fontSize: 12, color: GREEN_DARK, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IDLE 화면 (홈)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: F }}>
      <main style={{ flex: 1, padding: "clamp(12px,3vw,28px) clamp(10px,3vw,20px) 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media(max-width:767px){
            .book-inner{flex-direction:column!important;}
            .book-left-page{border-right:none!important;border-bottom:1px dashed rgba(110,84,40,0.16)!important;}
            .book-spine{display:none!important;}
            .book-edge-l,.book-edge-r{display:none!important;}
          }
        ` }} />

        <div style={{ width: "100%", maxWidth: 860, border: `3px solid ${GREEN_DARK}`, borderRadius: 6, boxShadow: "0 10px 26px rgba(0,0,0,0.16),0 2px 8px rgba(0,0,0,0.08)", position: "relative", marginTop: 12 }}>
          <div style={{ position: "absolute", left: -3, right: -3, top: -13, height: 13, background: `linear-gradient(to bottom,#0f2018,${GREEN_DARK} 60%,#4f6b59)`, border: `3px solid ${GREEN_DARK}`, borderBottom: "none", borderRadius: "4px 4px 0 0", zIndex: 20 }} />

          <div className="book-inner" style={{ display: "flex" }}>
            {/* 왼쪽 테이프 */}
            <div className="book-edge-l" style={{ width: "clamp(8px,1.2vw,13px)", flexShrink: 0, zIndex: 5, position: "relative", background: "repeating-linear-gradient(to right,#ede3ce 0,#ede3ce 1.5px,#c8b888 2px,#f0e6d4 4px,#c8b888 4.5px,#ede3ce 6px,#c8b888 6.5px,#f0e6d4 8.5px,#c8b888 9px,#ede3ce 13px)" }}>
              <div style={{ position: "absolute", left: 0, top: -13, bottom: 0, width: 6, background: GREEN_DARK }} />
            </div>

            {/* 왼쪽 페이지 — 헤더 + 문진 시작 버튼 */}
            <div className="book-left-page" style={{ flex: 1, ...paperStyle(PAGE1), padding: "22px 18px 30px 20px", borderRight: `1px dashed ${BORDER}`, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 헤더 */}
              <div style={{ background: `linear-gradient(135deg,${GREEN_DARK} 0%,#1a3224 100%)`, borderRadius: 10, padding: "14px 16px", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <h1 style={{ fontFamily: F, fontSize: 18, color: PAGE2, letterSpacing: "0.06em", margin: 0 }}>디지털 종이약국</h1>
                    <p style={{ fontFamily: GB_FONT, fontSize: 9, color: "rgba(245,240,228,0.55)", marginTop: 2, letterSpacing: "0.08em" }}>DIGITAL PAPER PHARMACY</p>
                  </div>
                  {/* 메뉴 */}
                  <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setIsMenuOpen(p => !p)}
                      style={{ background: isMenuOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 5, cursor: "pointer", padding: "4px 8px", color: PAGE2, fontSize: 10, fontFamily: F }}>
                      ≡
                    </button>
                    {isMenuOpen && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setIsMenuOpen(false)} />
                        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100, background: "#fdf8ee", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.10)", minWidth: 130, overflow: "hidden" }}>
                          <button type="button" onClick={handleShare}
                            style={{ width: "100%", textAlign: "left", padding: "9px 13px", fontFamily: F, fontSize: 11, color: INK, background: "none", border: "none", cursor: "pointer", borderBottom: `1px dashed ${BORDER}` }}>
                            공유하기
                          </button>
                          <button type="button" onClick={() => { setIsMenuOpen(false); handleResetStorage(); }}
                            style={{ width: "100%", textAlign: "left", padding: "9px 13px", fontFamily: F, fontSize: 11, color: "#9a4a3a", background: "none", border: "none", cursor: "pointer" }}>
                            ⚠ 기록 전체 삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p style={{ fontFamily: GB_FONT, fontSize: 11, color: "rgba(245,240,228,0.65)", marginTop: 2, lineHeight: 1.6 }}>
                  오늘 마음의 증상을 알려주세요 — 책을 처방해드립니다
                </p>
              </div>

              {/* 문진 시작 버튼 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setQuizStep(0); setQuizAnswers({}); setAppState(AppState.QUIZ); }}
                  style={{
                    width: "100%", padding: "18px", fontFamily: F, fontSize: 15, fontWeight: 700,
                    background: GREEN_DARK, color: PAGE2, border: "none", borderRadius: 10, cursor: "pointer",
                    letterSpacing: "0.05em", boxShadow: `0 4px 14px rgba(26,58,32,0.22)`,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(26,58,32,0.28)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(26,58,32,0.22)"; }}
                >
                  📋 문진 시작하기
                </button>
                <p style={{ fontFamily: F, fontSize: 10, color: MUTED, textAlign: "center", lineHeight: 1.7 }}>
                  기분 · 고민 · 독서 결 3가지를 선택하면<br />맞춤 책을 처방해드립니다
                </p>
              </div>

              {/* 최근 처방 미리보기 */}
              {savedPrescriptions.length > 0 && (
                <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 12 }}>
                  <p style={{ fontFamily: F, fontSize: 10, color: MUTED, marginBottom: 8, letterSpacing: "0.08em" }}>── 최근 처방 ──</p>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                    {savedPrescriptions.slice(0, 3).map(item => {
                      const firstBook = item.prescription.recommended_books[0];
                      return (
                        <button
                          key={item.id} type="button" onClick={() => handleOpenSaved(item)}
                          style={{ flexShrink: 0, width: 120, background: PAGE2, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}
                        >
                          <p style={{ fontFamily: F, fontSize: 11, color: INK, lineHeight: 1.4, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                            {firstBook?.title ?? "—"}
                          </p>
                          <p style={{ fontFamily: F, fontSize: 9, color: MUTED }}>{item.userInput}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 가름끈 */}
            <div className="book-spine" style={{ width: "clamp(14px,2vw,22px)", flexShrink: 0, position: "relative", zIndex: 10, backgroundColor: PAGE1 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: BORDER, transform: "translateX(-50%)" }} />
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%) rotate(-90deg)", whiteSpace: "nowrap", fontFamily: F, fontSize: 8, color: MUTED, letterSpacing: "0.15em" }}>종이약국</div>
            </div>

            {/* 오른쪽 페이지 — 기록 */}
            <div style={{ flex: 1, ...paperStyle(PAGE2), padding: "22px 18px 30px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* 서가 기록 */}
              <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}`, background: PAGE2 }}>
                <button type="button" onClick={() => setIsSavedOpen(p => !p)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: "none", border: "none", cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F, fontSize: 11.5, color: BROWN }}>
                    <Clock3 style={{ width: 11, height: 11, color: "#6e5428" }} />
                    처방 기록
                    <span style={{ fontFamily: F, fontSize: 8.5, padding: "1px 5px", borderRadius: 10, background: GREEN_DARK, color: PAGE2 }}>{savedPrescriptions.length}</span>
                  </span>
                  {isSavedOpen ? <ChevronUp style={{ width: 11, height: 11, color: MUTED }} /> : <ChevronDown style={{ width: 11, height: 11, color: MUTED }} />}
                </button>
                {isSavedOpen && (
                  <div style={{ height: 150, overflowY: "auto", borderTop: `1px dashed ${BORDER}`, padding: "7px 11px 9px" }}>
                    {savedPrescriptions.length === 0 ? (
                      <p style={{ fontFamily: F, fontSize: 10, color: MUTED, textAlign: "center", paddingTop: 6 }}>아직 처방 기록이 없어요.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {savedPrescriptions.map(item => (
                          <div key={item.id} style={{ borderRadius: 6, padding: "7px 9px", background: "rgba(255,255,255,0.55)", border: `1px solid rgba(110,84,40,0.12)` }}>
                            <button type="button" onClick={() => handleOpenSaved(item)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <p style={{ fontFamily: GB_FONT, fontSize: 11, color: INK, lineHeight: 1.5, marginBottom: 2 }}>{item.userInput}</p>
                              <p style={{ fontFamily: F, fontSize: 9, color: MUTED }}>{formatRxNum(item.id)} · {formatDate(item.createdAt)}</p>
                            </button>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                              <button type="button" onClick={() => handleDeleteSaved(item.id)} style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: F, fontSize: 9, color: "#a04030", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}>
                                <Trash2 style={{ width: 9, height: 9 }} /> 삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 북마크 */}
              <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}`, background: PAGE2 }}>
                <button type="button" onClick={() => setIsBookmarksOpen(p => !p)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: "none", border: "none", cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F, fontSize: 11.5, color: BROWN }}>
                    <Bookmark style={{ width: 11, height: 11, color: "#6e5428" }} />
                    북마크 도서
                    <span style={{ fontFamily: F, fontSize: 8.5, padding: "1px 5px", borderRadius: 10, background: GREEN_DARK, color: PAGE2 }}>{bookmarks.length}</span>
                  </span>
                  {isBookmarksOpen ? <ChevronUp style={{ width: 11, height: 11, color: MUTED }} /> : <ChevronDown style={{ width: 11, height: 11, color: MUTED }} />}
                </button>
                {isBookmarksOpen && (
                  <div style={{ maxHeight: 180, overflowY: "auto", borderTop: `1px dashed ${BORDER}`, padding: "7px 11px 9px" }}>
                    {bookmarks.length === 0 ? (
                      <p style={{ fontFamily: F, fontSize: 10, color: MUTED, textAlign: "center", paddingTop: 6 }}>북마크한 도서가 없어요.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bookmarks.slice(0, 10).map(item => (
                          <div key={item.id} style={{ borderRadius: 6, padding: "7px 9px", background: "rgba(255,255,255,0.55)", border: `1px solid rgba(110,84,40,0.12)` }}>
                            <p style={{ fontFamily: GB_FONT, fontSize: 11.5, color: BROWN }}>
                              <BookOpen style={{ width: 9, height: 9, display: "inline", marginRight: 4, color: GREEN_MID, verticalAlign: "middle" }} />
                              {item.book.title}
                            </p>
                            <p style={{ fontFamily: F, fontSize: 9, color: MUTED, marginTop: 2 }}>{item.book.author} · {item.book.publisher}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 안내 문구 */}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5, paddingTop: 8 }}>
                <Leaf style={{ width: 9, height: 9, color: MUTED, flexShrink: 0 }} />
                <span style={{ fontFamily: F, fontSize: 9, color: MUTED }}>마음 기록 · 맞춤형 도서 처방 · 도서관 연동</span>
              </div>
            </div>

            {/* 오른쪽 테이프 */}
            <div className="book-edge-r" style={{ width: "clamp(8px,1.2vw,13px)", flexShrink: 0, zIndex: 5, position: "relative", background: "repeating-linear-gradient(to left,#ede3ce 0,#ede3ce 1.5px,#c8b888 2px,#f0e6d4 4px,#c8b888 4.5px,#ede3ce 6px,#c8b888 6.5px,#f0e6d4 8.5px,#c8b888 9px,#ede3ce 13px)" }}>
              <div style={{ position: "absolute", right: 0, top: -13, bottom: 0, width: 6, background: GREEN_DARK }} />
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: "11px", textAlign: "center", fontFamily: F, fontSize: 9.5, color: "rgba(90,70,40,0.38)", borderTop: `1px solid ${BORDER}`, background: BG }}>
        © 2026 디지털 종이약국 by lou · Powered by Google Gemini
      </footer>
    </div>
  );
};

export default App;
