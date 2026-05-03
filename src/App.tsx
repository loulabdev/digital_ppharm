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
import { Trash2, Bookmark, ChevronDown, ChevronUp, BookOpen, Leaf } from "lucide-react";

// ─── 컬러 토큰 (목업 팔레트) ─────────────────────────────────────────────────
const F  = "'Gowun Batang', 'Noto Serif KR', Georgia, serif";
const GM = "'Gowun Mono', 'Courier New', monospace";
const C = {
  bg:     "#FFF7EE",
  paper:  "#FFFBF6",
  green1: "#1F4B3A",
  green2: "#7FA58A",
  gold:   "#D4AF37",
  sand:   "#E9E2D6",
  dark:   "#1C1C1C",
  muted:  "#8C7F72",
  border: "rgba(140,127,114,0.22)",
  white:  "#ffffff",
  tag:    "#EDE8E0",
};

// ─── 문진 데이터 ──────────────────────────────────────────────────────────────
interface ChipOption<K> { value: K; emoji: string; label: string; desc: string; }

const MOOD_OPTIONS: ChipOption<MoodKey>[] = [
  { value:"ANXIETY",   emoji:"☁️",  label:"불안함",       desc:"걱정이 멈추질 않아요" },
  { value:"EXHAUSTED", emoji:"🍂",  label:"지침·번아웃",  desc:"몸도 마음도 녹초예요" },
  { value:"EMPTY",     emoji:"🫙",  label:"공허함",       desc:"텅 빈 느낌이에요" },
  { value:"COMFORT",   emoji:"🍵",  label:"위로받고 싶어",desc:"따뜻함이 필요해요" },
  { value:"EXCITED",   emoji:"✨",  label:"설렘·기대",    desc:"뭔가 좋은 일이 있어요" },
  { value:"NUMB",      emoji:"🌫️", label:"무감각",       desc:"아무 감각이 없어요" },
  { value:"SAD",       emoji:"💧",  label:"슬픔·상실",    desc:"마음이 무겁고 슬퍼요" },
  { value:"LONELY",    emoji:"🌙",  label:"외로움·고독",  desc:"혼자인 느낌이에요" },
  { value:"ANGRY",     emoji:"🔥",  label:"분노·억울함",  desc:"화가 나고 억울해요" },
  { value:"GUILTY",    emoji:"🌀",  label:"죄책감·자책",  desc:"자꾸 나를 탓하게 돼요" },
  { value:"CONFUSED",  emoji:"🍃",  label:"혼란·방황",    desc:"뭘 해야 할지 모르겠어요" },
  { value:"GRATEFUL",  emoji:"🌿",  label:"감사·평온",    desc:"마음이 차분하고 고마워요" },
];

const CONCERN_OPTIONS: ChipOption<ConcernKey>[] = [
  { value:"RELATION", emoji:"🤝", label:"관계",    desc:"사람이 어렵고 피곤해요" },
  { value:"CAREER",   emoji:"🧭", label:"진로",    desc:"갈 길이 보이지 않아요" },
  { value:"DAILY",    emoji:"☕", label:"일상",    desc:"루틴이 무너진 것 같아요" },
  { value:"WORK",     emoji:"💼", label:"일·공부", desc:"부담이 너무 커요" },
  { value:"FAMILY",   emoji:"🏠", label:"가족",    desc:"가족 관계가 복잡해요" },
  { value:"SELF",     emoji:"🪞", label:"자아",    desc:"나 자신을 잃은 것 같아요" },
  { value:"HEALTH",   emoji:"💚", label:"건강",    desc:"몸이 마음에 걸려요" },
  { value:"MONEY",    emoji:"💰", label:"금전",    desc:"경제적 걱정이 있어요" },
];

const READ_STYLE_OPTIONS: ChipOption<ReadStyleKey>[] = [
  { value:"LIGHT", emoji:"🍃", label:"가볍게",   desc:"부담 없이 읽고 싶어요" },
  { value:"SHORT", emoji:"⏱️", label:"짧게",     desc:"빠르게 읽을 수 있는 것" },
  { value:"DEEP",  emoji:"🌊", label:"깊게",     desc:"몰입해서 읽고 싶어요" },
  { value:"WARM",  emoji:"❤️", label:"따뜻하게", desc:"마음이 데워지는 책" },
  { value:"CLEAR", emoji:"💡", label:"명쾌하게", desc:"생각이 정리되는 책" },
];

const QUIZ_STEPS = [
  { key:"mood"      as const, label:"STEP 1 / 3", title:"오늘의 기분이 어떠세요?",  intro:"지금 이 순간, 마음속 가장 가까이 있는 감정을 골라주세요." },
  { key:"concern"   as const, label:"STEP 2 / 3", title:"요즘 어떤 고민이 있나요?",  intro:"마음 한켠을 차지하고 있는 고민을 알려주세요. 책이 살며시 다가갈게요." },
  { key:"readStyle" as const, label:"STEP 3 / 3", title:"어떤 독서 결을 원하세요?",  intro:"오늘 읽고 싶은 책의 분위기를 알려주세요." },
] as const;

const MOOD_LABEL:    Record<MoodKey,      string> = { ANXIETY:"불안함", EXHAUSTED:"지침·번아웃", EMPTY:"공허함", COMFORT:"위로", EXCITED:"설렘·기대", NUMB:"무감각", SAD:"슬픔·상실", LONELY:"외로움·고독", ANGRY:"분노·억울함", GUILTY:"죄책감·자책", CONFUSED:"혼란·방황", GRATEFUL:"감사·평온" };
const CONCERN_LABEL: Record<ConcernKey,  string> = { RELATION:"관계", CAREER:"진로", DAILY:"일상", WORK:"일·공부", FAMILY:"가족", SELF:"자아", HEALTH:"건강", MONEY:"금전" };
const RS_LABEL:      Record<ReadStyleKey,string> = { LIGHT:"가볍게", SHORT:"짧게", DEEP:"깊게", WARM:"따뜻하게", CLEAR:"명쾌하게" };

const quizLabel = (q: QuizAnswers) =>
  `${MOOD_LABEL[q.mood]} · ${CONCERN_LABEL[q.concern]} · ${RS_LABEL[q.readStyle]}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" });

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
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"14px 8px", borderRadius:12, cursor:"pointer", userSelect:"none",
        border: selected ? `2px solid ${C.green1}` : `1.5px solid ${C.border}`,
        background: selected ? C.paper : C.white,
        color: selected ? C.green1 : C.dark,
        transition:"all 0.18s",
        boxShadow: selected
          ? `0 0 0 3px rgba(31,75,58,0.10), 0 2px 8px rgba(31,75,58,0.12)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        fontFamily: F,
      }}
    >
      <span style={{ fontSize:"1.5rem", marginBottom:5 }}>{option.emoji}</span>
      <span style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{option.label}</span>
      <span style={{ fontSize:10, opacity:0.65, lineHeight:1.4, textAlign:"center" }}>{option.desc}</span>
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
        const { prescription: p } = JSON.parse(raw);
        if (p) { setPrescription(p); setAppState(AppState.PRESCRIBED); }
      }
    } catch { /* 무시 */ }
  }, []);

  const refreshBookmarks = () => setBookmarks(getBookBookmarks());

  const handleShare = async () => {
    setIsMenuOpen(false);
    const lines: string[] = ["📚 종이약국 처방 기록\n"];
    if (savedPrescriptions.length > 0) {
      lines.push("[ 처방 기록 ]");
      savedPrescriptions.slice(0,5).forEach(p => {
        lines.push(`• ${p.userInput}`);
        p.prescription.recommended_books.slice(0,2).forEach(b => lines.push(`  └ 《${b.title}》 ${b.author}`));
      });
    }
    if (bookmarks.length > 0) {
      lines.push("\n[ 북마크 도서 ]");
      bookmarks.slice(0,10).forEach(b => lines.push(`• 《${b.book.title}》 ${b.book.author}`));
    }
    const text = lines.join("\n");
    try {
      if (navigator.share) { await navigator.share({ title:"종이약국 처방 기록", text }); }
      else { await navigator.clipboard.writeText(text); alert("클립보드에 복사되었습니다!"); }
    } catch { /* 취소 무시 */ }
  };

  const handleResetStorage = () => {
    if (!window.confirm("북마크와 처방 기록을 모두 삭제할까요?")) return;
    resetAllStorage();
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
    setBookmarks([]); setSavedPrescriptions([]); setPrescription(null);
    setQuizAnswers({}); setQuizStep(0); setError(null); setAppState(AppState.IDLE);
  };

  const handleSubmit = async (answers: QuizAnswers) => {
    setError(null); setAppState(AppState.ANALYZING);
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

  const handleReset = () => {
    setPrescription(null); setError(null); refreshBookmarks();
    setQuizAnswers({}); setQuizStep(0); setAppState(AppState.IDLE);
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
  };

  const handleOpenSaved = (item: SavedPrescription) => {
    setPrescription(item.prescription); refreshBookmarks(); setAppState(AppState.PRESCRIBED);
  };

  const handleChipSelect = (key: keyof QuizAnswers, value: string) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    if (quizStep < 2) setQuizStep(s => s + 1);
    else handleSubmit(quizAnswers as QuizAnswers);
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
  const gridCols =
    quizStep === 0 ? "repeat(4,1fr)" :
    quizStep === 1 ? "repeat(4,1fr)" :
    "repeat(3,1fr)";

  // ══════════════════════════════════════════════════════════════════════════
  // QUIZ 화면 — 단계별 전환
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.QUIZ) {
    const step = QUIZ_STEPS[quizStep];
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:F, display:"flex", flexDirection:"column" }}>
        <style dangerouslySetInnerHTML={{ __html:`
          @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Gowun+Mono&display=swap');
          * { box-sizing: border-box; }
        `}} />

        {/* 헤더 */}
        <div style={{ background:C.paper, borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
          <button type="button" onClick={handlePrevStep}
            style={{ background:"none", border:`1.5px solid ${C.border}`, borderRadius:8, width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, flexShrink:0, fontSize:16 }}>
            ←
          </button>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:GM, fontSize:9, color:C.green1, letterSpacing:"0.12em", marginBottom:1 }}>{step.label}</p>
            <p style={{ fontFamily:F, fontSize:15, color:C.dark, fontWeight:700 }}>{step.title}</p>
          </div>
          <span style={{ fontFamily:GM, fontSize:8, color:C.muted, letterSpacing:"1.5px", opacity:0.6 }}>DIGITAL PAPER PHARMACY</span>
        </div>

        {/* 프로그레스 바 */}
        <div style={{ height:3, background:C.sand }}>
          <div style={{ height:"100%", background:C.green1, width:`${((quizStep+1)/3)*100}%`, transition:"width 0.35s ease" }} />
        </div>

        {/* 본문 */}
        <div style={{ flex:1, padding:"24px 16px 40px", maxWidth:640, margin:"0 auto", width:"100%" }}>
          {/* 인트로 */}
          <p style={{ fontFamily:F, fontSize:12, color:C.muted, lineHeight:1.85, padding:"12px 16px", borderLeft:`3px solid ${C.green1}`, marginBottom:24, background:`rgba(31,75,58,0.04)`, borderRadius:"0 8px 8px 0" }}>
            {step.intro}
          </p>

          {/* 칩 그리드 */}
          <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:10, marginBottom:28 }}>
            {(currentOptions as ChipOption<string>[]).map(opt => (
              <Chip
                key={opt.value}
                option={opt}
                selected={currentSelection === opt.value}
                onSelect={(v) => handleChipSelect(currentStepKey, v)}
              />
            ))}
          </div>

          {/* 다음 버튼 */}
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!currentSelection}
            style={{
              width:"100%", padding:"15px", fontFamily:F, fontSize:14, fontWeight:700,
              background: currentSelection ? C.green1 : C.sand,
              color: currentSelection ? "#fff" : C.muted,
              border:"none", borderRadius:12,
              cursor: currentSelection ? "pointer" : "not-allowed",
              transition:"all 0.2s", letterSpacing:"0.04em",
              boxShadow: currentSelection ? `0 4px 14px rgba(31,75,58,0.22)` : "none",
            }}
          >
            {quizStep < 2 ? "다음으로" : "📋 처방받기"}
          </button>
          <p style={{ fontFamily:F, fontSize:10, color:C.muted, textAlign:"center", marginTop:12 }}>
            * 언제든 다시 선택할 수 있어요
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYZING 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.ANALYZING) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, fontFamily:F }}>
        <style dangerouslySetInnerHTML={{ __html:`
          @keyframes wave{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-10px);}}
          .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:${C.green1};margin:0 5px;animation:wave 1.2s ease infinite;}
          .dot:nth-child(2){animation-delay:0.18s;}.dot:nth-child(3){animation-delay:0.36s;}
        `}} />
        <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:20, padding:"36px 52px 30px", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📚</div>
          <p style={{ fontFamily:F, fontSize:14, color:C.green1, marginBottom:16, letterSpacing:"0.04em" }}>책장을 넘기는 중이에요</p>
          <div><span className="dot"/><span className="dot"/><span className="dot"/></div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRESCRIBED 화면
  // ══════════════════════════════════════════════════════════════════════════
  if (appState === AppState.PRESCRIBED && prescription) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
        <main style={{ flex:1 }}>
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
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 16px", background:C.bg, fontFamily:F }}>
        <div style={{ maxWidth:400, width:"100%", textAlign:"center", padding:"32px", borderRadius:16, background:C.paper, border:`1px solid rgba(180,80,60,0.2)` }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
          <p style={{ fontFamily:GM, fontSize:13, color:"#7a3020", marginBottom:20, lineHeight:1.7 }}>{error}</p>
          <button type="button" onClick={() => { setAppState(AppState.IDLE); setQuizAnswers({}); setQuizStep(0); }}
            style={{ fontFamily:F, fontSize:12, color:C.green1, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
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
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:F }}>
      <style dangerouslySetInnerHTML={{ __html:`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Gowun+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:${C.sand};border-radius:10px;}
        .rx-cta:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(31,75,58,0.32)!important;}
        .rx-cta{transition:transform 0.15s,box-shadow 0.15s;}
        .rx-row:hover{background:rgba(255,255,255,0.85)!important;}
        @media(max-width:600px){.rx-two-col{flex-direction:column!important;}}
      `}} />

      <main style={{ flex:1, padding:"clamp(12px,3vw,24px) clamp(10px,3vw,16px) 40px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", maxWidth:780, background:C.paper, border:`1.5px solid ${C.border}`, borderTop:`5px solid ${C.green1}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>

          {/* 헤더 */}
          <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.green1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📚</div>
                <div>
                  <h1 style={{ fontFamily:F, fontSize:18, fontWeight:700, color:C.dark, margin:0, lineHeight:1.2 }}>디지털 종이약국</h1>
                  <p style={{ fontFamily:GM, fontSize:8, color:C.muted, marginTop:2, letterSpacing:"3px" }}>DIGITAL PAPER PHARMACY</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                <div style={{ border:`2px solid ${C.green1}`, borderRadius:"50%", width:44, height:44, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", opacity:0.6, transform:"rotate(-8deg)", flexShrink:0 }}>
                  <span style={{ fontFamily:GM, fontSize:7, color:C.green1, fontWeight:700, letterSpacing:1 }}>처방</span>
                  <span style={{ fontFamily:GM, fontSize:13, color:C.green1, fontWeight:700 }}>Rx</span>
                </div>
                <div style={{ position:"relative" }}>
                  <button type="button" onClick={() => setIsMenuOpen(p => !p)}
                    style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", fontFamily:F, fontSize:13, color:C.muted, cursor:"pointer" }}>≡</button>
                  {isMenuOpen && (
                    <>
                      <div style={{ position:"fixed", inset:0, zIndex:99 }} onClick={() => setIsMenuOpen(false)} />
                      <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:100, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:"0 4px 14px rgba(0,0,0,0.10)", minWidth:130, overflow:"hidden" }}>
                        <button type="button" onClick={handleShare}
                          style={{ width:"100%", textAlign:"left", padding:"9px 13px", fontFamily:F, fontSize:11, color:C.dark, background:"none", border:"none", cursor:"pointer", borderBottom:`1px solid ${C.border}` }}>
                          공유하기
                        </button>
                        <button type="button" onClick={() => { setIsMenuOpen(false); handleResetStorage(); }}
                          style={{ width:"100%", textAlign:"left", padding:"9px 13px", fontFamily:F, fontSize:11, color:"#9a4a3a", background:"none", border:"none", cursor:"pointer" }}>
                          ⚠ 기록 전체 삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p style={{ fontFamily:F, fontSize:11, color:C.muted, marginTop:10 }}>
              오늘 마음의 증상을 알려주세요 — 책을 처방해드립니다
            </p>
          </div>

          {/* 2단 본문 */}
          <div className="rx-two-col" style={{ display:"flex" }}>

            {/* 왼쪽 */}
            <div style={{ flex:1, padding:"20px 20px 24px", borderRight:`1px solid ${C.border}` }}>
              <button type="button" className="rx-cta"
                onClick={() => { setQuizStep(0); setQuizAnswers({}); setAppState(AppState.QUIZ); }}
                style={{ width:"100%", padding:"16px", fontFamily:F, fontSize:15, fontWeight:700, background:C.green1, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", letterSpacing:"0.04em", boxShadow:`0 4px 14px rgba(31,75,58,0.25)`, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                📋 문진 시작하기
              </button>
              <div style={{ marginTop:12, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 13px" }}>
                <p style={{ fontFamily:F, fontSize:11, color:C.muted, lineHeight:1.75 }}>
                  기분 · 고민 · 독서 결<br />3가지를 선택하면 맞춤 책을 처방해드립니다
                </p>
              </div>
              {savedPrescriptions.length > 0 && (
                <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                  <p style={{ fontFamily:GM, fontSize:9, color:C.muted, marginBottom:8, letterSpacing:"0.08em" }}>── 최근 처방 ──</p>
                  <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
                    {savedPrescriptions.slice(0,3).map(item => {
                      const firstBook = item.prescription.recommended_books[0];
                      return (
                        <button key={item.id} type="button" onClick={() => handleOpenSaved(item)}
                          style={{ flexShrink:0, width:110, background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.green1}`, borderRadius:6, padding:"8px 10px", cursor:"pointer", textAlign:"left" }}>
                          <p style={{ fontFamily:F, fontSize:11, color:C.dark, lineHeight:1.4, marginBottom:3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{firstBook?.title ?? "—"}</p>
                          <p style={{ fontFamily:GM, fontSize:9, color:C.muted }}>{item.userInput}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 */}
            <div style={{ flex:1, padding:"20px 20px 24px", display:"flex", flexDirection:"column", gap:10 }}>
              {/* 처방 기록 */}
              <div style={{ borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.green1}` }}>
                <button type="button" onClick={() => setIsSavedOpen(p => !p)}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 13px", background:"none", border:"none", cursor:"pointer" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:7, fontFamily:F, fontSize:12, color:C.dark, fontWeight:600 }}>
                    <span style={{ width:22, height:22, borderRadius:"50%", background:"rgba(31,75,58,0.10)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:GM, fontSize:9, color:C.green1, fontWeight:700 }}>Rx</span>
                    처방 기록
                    <span style={{ fontFamily:GM, fontSize:9, padding:"1px 6px", borderRadius:10, background:"rgba(31,75,58,0.10)", color:C.green1, fontWeight:700 }}>{savedPrescriptions.length}</span>
                  </span>
                  {isSavedOpen ? <ChevronUp style={{ width:11, height:11, color:C.muted }} /> : <ChevronDown style={{ width:11, height:11, color:C.muted }} />}
                </button>
                {isSavedOpen && (
                  <div style={{ height:150, overflowY:"auto", borderTop:`1px solid ${C.border}`, padding:"7px 11px 9px" }}>
                    {savedPrescriptions.length === 0
                      ? <p style={{ fontFamily:F, fontSize:10, color:C.muted, textAlign:"center", paddingTop:6 }}>아직 처방 기록이 없어요.</p>
                      : <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {savedPrescriptions.map(item => (
                            <div key={item.id} className="rx-row" style={{ borderRadius:6, padding:"7px 9px", background:"rgba(255,255,255,0.55)", border:`1px solid ${C.border}`, transition:"background 0.12s" }}>
                              <button type="button" onClick={() => handleOpenSaved(item)} style={{ width:"100%", textAlign:"left", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                                <p style={{ fontFamily:GM, fontSize:11, color:C.dark, lineHeight:1.5, marginBottom:2 }}>{item.userInput}</p>
                                <p style={{ fontFamily:F, fontSize:9, color:C.muted }}>{formatDate(item.createdAt)}</p>
                              </button>
                              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                                <button type="button" onClick={() => setSavedPrescriptions(deleteSavedPrescription(item.id))}
                                  style={{ display:"flex", alignItems:"center", gap:3, fontFamily:F, fontSize:9, color:"#a04030", background:"none", border:"none", cursor:"pointer", opacity:0.6 }}>
                                  <Trash2 style={{ width:9, height:9 }} /> 삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>}
                  </div>
                )}
              </div>

              {/* 북마크 */}
              <div style={{ borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.green2}` }}>
                <button type="button" onClick={() => setIsBookmarksOpen(p => !p)}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 13px", background:"none", border:"none", cursor:"pointer" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:7, fontFamily:F, fontSize:12, color:C.dark, fontWeight:600 }}>
                    <span style={{ width:22, height:22, borderRadius:"50%", background:"rgba(127,165,138,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Bookmark style={{ width:10, height:10, color:C.green2 }} />
                    </span>
                    북마크 도서
                    <span style={{ fontFamily:GM, fontSize:9, padding:"1px 6px", borderRadius:10, background:"rgba(127,165,138,0.15)", color:C.green2, fontWeight:700 }}>{bookmarks.length}</span>
                  </span>
                  {isBookmarksOpen ? <ChevronUp style={{ width:11, height:11, color:C.muted }} /> : <ChevronDown style={{ width:11, height:11, color:C.muted }} />}
                </button>
                {isBookmarksOpen && (
                  <div style={{ maxHeight:180, overflowY:"auto", borderTop:`1px solid ${C.border}`, padding:"7px 11px 9px" }}>
                    {bookmarks.length === 0
                      ? <p style={{ fontFamily:F, fontSize:10, color:C.muted, textAlign:"center", paddingTop:6 }}>북마크한 도서가 없어요.</p>
                      : <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                          {bookmarks.slice(0,10).map(item => (
                            <div key={item.id} style={{ borderRadius:6, padding:"7px 9px", background:"rgba(255,255,255,0.55)", border:`1px solid ${C.border}` }}>
                              <p style={{ fontFamily:GM, fontSize:11, color:C.dark }}>
                                <BookOpen style={{ width:9, height:9, display:"inline", marginRight:4, color:C.green2, verticalAlign:"middle" }} />
                                {item.book.title}
                              </p>
                              <p style={{ fontFamily:F, fontSize:9, color:C.muted, marginTop:2 }}>{item.book.author} · {item.book.publisher}</p>
                            </div>
                          ))}
                        </div>}
                  </div>
                )}
              </div>

              <div style={{ marginTop:"auto", paddingTop:8, display:"flex", alignItems:"center", gap:6 }}>
                <Leaf style={{ width:10, height:10, color:C.green2 }} />
                <span style={{ fontFamily:F, fontSize:9, color:C.muted }}>마음 기록 · 맞춤형 도서 처방 · 도서관 연동</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding:"12px", textAlign:"center", fontFamily:F, fontSize:9.5, color:"rgba(90,70,40,0.38)", borderTop:`1px solid ${C.border}`, background:C.paper }}>
        © 2026 디지털 종이약국 by lou · Powered by Google Gemini
      </footer>
    </div>
  );
};

export default App;