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
import { Trash2, Bookmark, BookOpen, Leaf, Heart, FileText, X } from "lucide-react";

// ─── 컬러 토큰 (목업 팔레트 기준) ────────────────────────────────────────────
const F        = "'Gowun Batang', 'Noto Serif KR', Georgia, serif";
const GM       = "'Gowun Mono', 'Courier New', monospace";
const C = {
  bg:       "#F6F1E7",
  paper:    "#FFFCF7",
  green1:   "#1F513B",
  green2:   "#6F8A76",
  gold:     "#C6A46A",
  sand:     "#D8CCBA",
  dark:     "#3B342E",
  muted:    "#8A7C6C",
  border:   "rgba(139,124,108,0.22)",
  white:    "#ffffff",
  tag:      "#EAE4D8",
};

// ─── 문진 데이터 ──────────────────────────────────────────────────────────────
interface ChipOption<K> { value: K; emoji: string; label: string; }

const MOOD_OPTIONS: ChipOption<MoodKey>[] = [
  { value: "ANXIETY",   emoji: "☁️",  label: "불안함"      },
  { value: "EXHAUSTED", emoji: "🍂",  label: "지침·번아웃" },
  { value: "EMPTY",     emoji: "🫙",  label: "공허함"      },
  { value: "COMFORT",   emoji: "🍵",  label: "위로받고 싶음" },
  { value: "EXCITED",   emoji: "✨",  label: "설렘·기대"   },
  { value: "NUMB",      emoji: "🌫️", label: "무감각"      },
  { value: "SAD",       emoji: "💧",  label: "슬픔·상실"   },
  { value: "LONELY",    emoji: "🌙",  label: "외로움·고독" },
  { value: "ANGRY",     emoji: "🔥",  label: "분노·억울함" },
  { value: "GUILTY",    emoji: "🌀",  label: "죄책감·자책" },
  { value: "CONFUSED",  emoji: "🍃",  label: "혼란·방황"   },
  { value: "GRATEFUL",  emoji: "🌿",  label: "감사·평온"   },
];

const CONCERN_OPTIONS: ChipOption<ConcernKey>[] = [
  { value: "RELATION", emoji: "🤝", label: "관계"    },
  { value: "CAREER",   emoji: "🧭", label: "진로"    },
  { value: "DAILY",    emoji: "☕", label: "일상"    },
  { value: "WORK",     emoji: "💼", label: "일·공부" },
  { value: "FAMILY",   emoji: "🏠", label: "가족"    },
  { value: "SELF",     emoji: "🪞", label: "자아"    },
  { value: "HEALTH",   emoji: "💚", label: "건강"    },
  { value: "MONEY",    emoji: "💰", label: "금전"    },
];

const READ_STYLE_OPTIONS: ChipOption<ReadStyleKey>[] = [
  { value: "LIGHT", emoji: "🍃", label: "가볍게",   },
  { value: "SHORT", emoji: "⏱️", label: "짧게",     },
  { value: "DEEP",  emoji: "🌊", label: "깊게",     },
  { value: "WARM",  emoji: "❤️", label: "따뜻하게" },
  { value: "CLEAR", emoji: "💡", label: "명쾌하게" },
];

const MOOD_LABEL:    Record<MoodKey,      string> = { ANXIETY:"불안함", EXHAUSTED:"지침·번아웃", EMPTY:"공허함", COMFORT:"위로", EXCITED:"설렘·기대", NUMB:"무감각", SAD:"슬픔·상실", LONELY:"외로움·고독", ANGRY:"분노·억울함", GUILTY:"죄책감·자책", CONFUSED:"혼란·방황", GRATEFUL:"감사·평온" };
const CONCERN_LABEL: Record<ConcernKey,  string> = { RELATION:"관계", CAREER:"진로", DAILY:"일상", WORK:"일·공부", FAMILY:"가족", SELF:"자아", HEALTH:"건강", MONEY:"금전" };
const RS_LABEL:      Record<ReadStyleKey,string> = { LIGHT:"가볍게", SHORT:"짧게", DEEP:"깊게", WARM:"따뜻하게", CLEAR:"명쾌하게" };

const quizLabel = (q: QuizAnswers) =>
  `${MOOD_LABEL[q.mood]} · ${CONCERN_LABEL[q.concern]} · ${RS_LABEL[q.readStyle]}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" });

// ─── 네비게이션 탭 ────────────────────────────────────────────────────────────
type NavTab = "quiz" | "records" | "nature" | "rx" | "bookmark";

// ─── 칩 컴포넌트 ─────────────────────────────────────────────────────────────
function Chip<K extends string>({
  option, selected, onSelect, size = "md",
}: {
  option: ChipOption<K>;
  selected: boolean;
  onSelect: (v: K) => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: size === "sm" ? 4 : 6,
        padding: size === "sm" ? "10px 6px" : "14px 8px",
        borderRadius: 12, cursor: "pointer", userSelect: "none",
        border: selected ? `2px solid ${C.green1}` : `1.5px solid ${C.border}`,
        background: selected ? C.paper : C.white,
        color: selected ? C.green1 : C.dark,
        transition: "all 0.18s",
        boxShadow: selected ? `0 0 0 3px rgba(31,75,58,0.10), 0 2px 8px rgba(31,75,58,0.12)` : "0 1px 4px rgba(0,0,0,0.04)",
        fontFamily: F,
        minHeight: size === "sm" ? 64 : 76,
      }}
    >
      <span style={{ fontSize: size === "sm" ? "1.3rem" : "1.5rem" }}>{option.emoji}</span>
      <span style={{ fontSize: size === "sm" ? 11 : 12, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{option.label}</span>
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
  const [activeTab,          setActiveTab]          = useState<NavTab>("quiz");

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

  const handleReset = () => {
    setPrescription(null); setError(null); refreshBookmarks();
    setQuizAnswers({}); setQuizStep(0); setAppState(AppState.IDLE);
    setActiveTab("quiz");
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
  };

  const handleResetStorage = () => {
    if (!window.confirm("북마크와 처방 기록을 모두 삭제할까요?")) return;
    resetAllStorage();
    try { localStorage.removeItem("lastPrescription"); } catch { /* 무시 */ }
    setBookmarks([]); setSavedPrescriptions([]); setPrescription(null);
    setQuizAnswers({}); setQuizStep(0); setError(null); setAppState(AppState.IDLE);
  };

  const handleChipSelect = (key: keyof QuizAnswers, value: string) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    if (quizStep < 2) setQuizStep(s => s + 1);
    else handleSubmit(quizAnswers as QuizAnswers);
  };

  const handleOpenSaved = (item: SavedPrescription) => {
    setPrescription(item.prescription); refreshBookmarks(); setAppState(AppState.PRESCRIBED);
  };

  // ── ANALYZING ────────────────────────────────────────────────────────────
  if (appState === AppState.ANALYZING) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background: C.bg, fontFamily: F }}>
        <style dangerouslySetInnerHTML={{ __html:`
          @keyframes wave{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-10px);}}
          .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:${C.green1};margin:0 5px;animation:wave 1.2s ease infinite;}
          .dot:nth-child(2){animation-delay:0.18s;} .dot:nth-child(3){animation-delay:0.36s;}
        `}} />
        <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"36px 52px 30px", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
          <p style={{ fontFamily: F, fontSize:14, color: C.green1, marginBottom:16, letterSpacing:"0.04em" }}>책장을 넘기는 중이에요</p>
          <div><span className="dot"/><span className="dot"/><span className="dot"/></div>
        </div>
      </div>
    );
  }

  // ── PRESCRIBED ───────────────────────────────────────────────────────────
  if (appState === AppState.PRESCRIBED && prescription) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background: C.bg }}>
        <main style={{ flex:1 }}>
          <PrescriptionView data={prescription} onReset={handleReset} onBookmarksChange={refreshBookmarks} />
        </main>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────
  if (appState === AppState.ERROR) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 16px", background: C.bg, fontFamily: F }}>
        <div style={{ maxWidth:400, width:"100%", textAlign:"center", padding:"32px", borderRadius:16, background: C.paper, border:`1px solid rgba(180,80,60,0.2)` }}>
          <p style={{ fontFamily: GM, fontSize:13, color:"#7a3020", marginBottom:20, lineHeight:1.7 }}>{error}</p>
          <button type="button" onClick={() => { setAppState(AppState.IDLE); setQuizAnswers({}); setQuizStep(0); }}
            style={{ fontFamily: F, fontSize:12, color: C.green1, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IDLE / QUIZ 통합 메인 레이아웃
  // ══════════════════════════════════════════════════════════════════════════

  // 퀴즈 단계 설정
  const STEPS = [
    { key:"mood"      as const, label:"STEP 1 / 3", title:"오늘의 기분이 어떠세요?",    sub:"지금 가장 가까운 감정을 골라주세요.", options: MOOD_OPTIONS,       cols: 4 },
    { key:"concern"   as const, label:"STEP 2 / 3", title:"요즘 어떤 고민이 있나요?",   sub:"마음 한켠을 차지하고 있는 고민을 골라주세요.", options: CONCERN_OPTIONS, cols: 4 },
    { key:"readStyle" as const, label:"STEP 3 / 3", title:"어떤 독서 결을 원하세요?",   sub:"오늘 읽고 싶은 책의 분위기를 알려주세요.", options: READ_STYLE_OPTIONS, cols: 3 },
  ];

  const step = STEPS[quizStep];
  const currentSelection = quizAnswers[step.key];
  const isQuizActive = appState === AppState.QUIZ;

  // ── 탭 콘텐츠 렌더 ──────────────────────────────────────────────────────
  const renderTabContent = () => {
    // 책 치방 탭 = 퀴즈 UI
    if (activeTab === "quiz") {
      return (
        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>

          {/* STEP 1 */}
          <StepCard
            stepLabel="STEP 1 / 3"
            title="오늘의 기분이 어떠세요?"
            sub="지금 가장 가까운 감정을 골라주세요."
            active={isQuizActive && quizStep === 0}
            done={quizAnswers.mood !== undefined}
            onActivate={() => { setQuizStep(0); setAppState(AppState.QUIZ); }}
          >
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {MOOD_OPTIONS.map(opt => (
                <Chip
                  key={opt.value} option={opt} size="sm"
                  selected={quizAnswers.mood === opt.value}
                  onSelect={v => { handleChipSelect("mood", v); if (!isQuizActive) { setQuizStep(0); setAppState(AppState.QUIZ); } }}
                />
              ))}
            </div>
            {isQuizActive && quizStep === 0 && (
              <p style={{ fontFamily: F, fontSize:10, color: C.muted, marginTop:8 }}>* 언제든 다시 선택할 수 있어요</p>
            )}
          </StepCard>

          {/* STEP 2 */}
          <StepCard
            stepLabel="STEP 2 / 3"
            title="요즘 어떤 고민이 있나요?"
            sub="마음 한켠을 차지하고 있는 고민을 골라주세요."
            active={isQuizActive && quizStep === 1}
            done={quizAnswers.concern !== undefined}
            onActivate={() => { if (quizAnswers.mood) { setQuizStep(1); setAppState(AppState.QUIZ); } }}
          >
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {CONCERN_OPTIONS.map(opt => (
                <Chip
                  key={opt.value} option={opt} size="sm"
                  selected={quizAnswers.concern === opt.value}
                  onSelect={v => { handleChipSelect("concern", v); }}
                />
              ))}
            </div>
            <p style={{ fontFamily: F, fontSize:10, color: C.muted, marginTop:8 }}>* 여러 개 중 마음에 더 가까운 것을 선택해도 좋아요</p>
            {isQuizActive && quizStep === 1 && (
              <button type="button" onClick={handleNextStep} disabled={!quizAnswers.concern}
                style={{ marginTop:10, width:"100%", padding:"12px", fontFamily: F, fontSize:13, fontWeight:700, background: quizAnswers.concern ? C.green1 : C.border, color: quizAnswers.concern ? "#fff" : C.muted, border:"none", borderRadius:8, cursor: quizAnswers.concern ? "pointer" : "not-allowed", transition:"all 0.2s" }}>
                다음으로
              </button>
            )}
          </StepCard>

          {/* STEP 3 */}
          <StepCard
            stepLabel="STEP 3 / 3"
            title="어떤 독서 결을 원하세요?"
            sub="오늘 읽고 싶은 책의 분위기를 알려주세요."
            active={isQuizActive && quizStep === 2}
            done={quizAnswers.readStyle !== undefined}
            onActivate={() => { if (quizAnswers.mood && quizAnswers.concern) { setQuizStep(2); setAppState(AppState.QUIZ); } }}
          >
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {READ_STYLE_OPTIONS.map(opt => (
                <Chip
                  key={opt.value} option={opt} size="sm"
                  selected={quizAnswers.readStyle === opt.value}
                  onSelect={v => handleChipSelect("readStyle", v)}
                />
              ))}
            </div>
            {isQuizActive && quizStep === 2 && (
              <button type="button" onClick={handleNextStep} disabled={!quizAnswers.readStyle}
                style={{ marginTop:10, width:"100%", padding:"12px", fontFamily: F, fontSize:13, fontWeight:700, background: quizAnswers.readStyle ? C.green1 : C.border, color: quizAnswers.readStyle ? "#fff" : C.muted, border:"none", borderRadius:8, cursor: quizAnswers.readStyle ? "pointer" : "not-allowed", transition:"all 0.2s" }}>
                📋 처방받기
              </button>
            )}
          </StepCard>

          {/* 처방 시작 / 미리보기 카드 */}
          <div style={{ flex:"0 0 220px", background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 18px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:240, textAlign:"center" }}>
            {!isQuizActive ? (
              <>
                <div style={{ fontSize:36, marginBottom:12 }}>📖</div>
                <p style={{ fontFamily: F, fontSize:12, color: C.green1, lineHeight:1.7, marginBottom:16 }}>
                  책장을 넘기는 중이에요.<br/>당신의 마음을 담은 책을 찾고 있어요.
                </p>
                <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:16 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background: i===0 ? C.green1 : C.sand }} />)}
                </div>
                <button type="button"
                  onClick={() => { setQuizStep(0); setQuizAnswers({}); setAppState(AppState.QUIZ); }}
                  style={{ width:"100%", padding:"12px", fontFamily: F, fontSize:13, fontWeight:700, background: C.green1, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", boxShadow:`0 3px 10px rgba(31,81,59,0.22)` }}>
                  문진 시작하기
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:32, marginBottom:8 }}>✍️</div>
                <p style={{ fontFamily: F, fontSize:11, color: C.muted, lineHeight:1.7 }}>
                  {quizAnswers.mood && <span style={{ display:"block", color: C.green1, fontWeight:600 }}>{MOOD_LABEL[quizAnswers.mood]}</span>}
                  {quizAnswers.concern && <span style={{ display:"block" }}>{CONCERN_LABEL[quizAnswers.concern]}</span>}
                  {quizAnswers.readStyle && <span style={{ display:"block" }}>{RS_LABEL[quizAnswers.readStyle]}</span>}
                </p>
                {/* 처방전이 이미 있으면 보기 버튼 */}
                {prescription && (
                  <button type="button" onClick={() => setAppState(AppState.PRESCRIBED)}
                    style={{ marginTop:10, width:"100%", padding:"10px", fontFamily: F, fontSize:11, fontWeight:700, background:"none", color: C.green1, border:`1px solid ${C.green1}`, borderRadius:8, cursor:"pointer" }}>
                    마지막 처방전 보기
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      );
    }

    // 마음 기록 탭
    if (activeTab === "records") {
      return (
        <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h2 style={{ fontFamily: F, fontSize:15, color: C.dark, fontWeight:700 }}>📋 처방 기록</h2>
            {savedPrescriptions.length > 0 && (
              <button type="button" onClick={handleResetStorage}
                style={{ fontFamily: F, fontSize:10, color:"#9a4a3a", background:"none", border:`1px solid rgba(154,74,58,0.3)`, borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>
                전체 삭제
              </button>
            )}
          </div>
          {savedPrescriptions.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color: C.muted, fontFamily: F, fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
              아직 처방 기록이 없어요.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {savedPrescriptions.map(item => (
                <div key={item.id} style={{ background: C.bg, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.green1}`, borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                  <button type="button" onClick={() => handleOpenSaved(item)} style={{ flex:1, textAlign:"left", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                    <p style={{ fontFamily: F, fontSize:12, color: C.dark, fontWeight:600, marginBottom:3 }}>{item.userInput}</p>
                    <p style={{ fontFamily: GM, fontSize:10, color: C.muted }}>{formatDate(item.createdAt)} · {item.prescription.recommended_books[0]?.title ?? "—"}</p>
                  </button>
                  <button type="button" onClick={() => setSavedPrescriptions(deleteSavedPrescription(item.id))}
                    style={{ background:"none", border:"none", cursor:"pointer", color: C.muted, padding:4, display:"flex", alignItems:"center" }}>
                    <Trash2 style={{ width:13, height:13 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 자연·치유 탭 (미구현)
    if (activeTab === "nature") {
      return (
        <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"48px 20px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
          <p style={{ fontFamily: F, fontSize:14, color: C.green1, fontWeight:700, marginBottom:6 }}>자연·치유</p>
          <p style={{ fontFamily: F, fontSize:12, color: C.muted, lineHeight:1.7 }}>자연에서 얻는 치유 콘텐츠를<br/>준비 중이에요. 곧 만나요!</p>
          <div style={{ marginTop:16, display:"inline-block", background: C.tag, borderRadius:20, padding:"5px 14px", fontFamily: F, fontSize:11, color: C.muted }}>Coming Soon</div>
        </div>
      );
    }

    // 처방전 탭 (저장된 처방전 보기)
    if (activeTab === "rx") {
      if (!prescription) {
        return (
          <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"48px 20px", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
            <p style={{ fontFamily: F, fontSize:13, color: C.muted }}>아직 처방전이 없어요.<br/>문진을 먼저 완료해주세요.</p>
            <button type="button" onClick={() => setActiveTab("quiz")}
              style={{ marginTop:14, padding:"10px 20px", fontFamily: F, fontSize:12, fontWeight:700, background: C.green1, color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>
              문진 시작하기
            </button>
          </div>
        );
      }
      return (
        <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
          <PrescriptionView data={prescription} onReset={handleReset} onBookmarksChange={refreshBookmarks} />
        </div>
      );
    }

    // 북마크 탭
    if (activeTab === "bookmark") {
      return (
        <div style={{ background: C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px" }}>
          <h2 style={{ fontFamily: F, fontSize:15, color: C.dark, fontWeight:700, marginBottom:16 }}>🔖 북마크 도서</h2>
          {bookmarks.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color: C.muted, fontFamily: F, fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔖</div>
              북마크한 도서가 없어요.
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
              {bookmarks.map(item => (
                <div key={item.id} style={{ background: C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 13px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <BookOpen style={{ width:13, height:13, color: C.green1, flexShrink:0 }} />
                    <p style={{ fontFamily: F, fontSize:12, color: C.dark, fontWeight:600, lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{item.book.title}</p>
                  </div>
                  <p style={{ fontFamily: F, fontSize:10, color: C.muted }}>{item.book.author}</p>
                  <p style={{ fontFamily: F, fontSize:9, color: C.muted, marginTop:1 }}>{item.book.publisher}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ── 탭 버튼 목록 ─────────────────────────────────────────────────────────
  const NAV_TABS: { key: NavTab; icon: React.ReactNode; label: string }[] = [
    { key:"quiz",     icon:<BookOpen style={{ width:14, height:14 }} />,  label:"책 치방"   },
    { key:"records",  icon:<Heart style={{ width:14, height:14 }} />,     label:"마음 기록" },
    { key:"nature",   icon:<Leaf style={{ width:14, height:14 }} />,      label:"자연·치유" },
    { key:"rx",       icon:<FileText style={{ width:14, height:14 }} />,  label:"처방전"   },
    { key:"bookmark", icon:<Bookmark style={{ width:14, height:14 }} />,  label:"북마크"   },
  ];

  return (
    <div style={{ minHeight:"100vh", background: C.bg, fontFamily: F }}>
      <style dangerouslySetInnerHTML={{ __html:`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Gowun+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.sand}; border-radius: 10px; }
        .nav-tab:hover { background: rgba(31,81,59,0.08) !important; }
        .nav-tab.active { background: ${C.green1} !important; color: #fff !important; }
      `}} />

      {/* ── 상단 헤더 ── */}
      <header style={{ background: C.paper, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
        {/* 로고 */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background: C.green1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📚</div>
          <div>
            <h1 style={{ fontFamily: F, fontSize:15, fontWeight:700, color: C.dark, lineHeight:1.2 }}>디지털 종이약국</h1>
            <p style={{ fontFamily: GM, fontSize:8, color: C.muted, letterSpacing:"2px" }}>DIGITAL PAPER PHARMACY</p>
          </div>
        </div>

        {/* 네비게이션 탭 */}
        <nav style={{ display:"flex", gap:4 }}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`nav-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"6px 12px", borderRadius:20, border:"none", cursor:"pointer",
                fontFamily: F, fontSize:12,
                background: activeTab === tab.key ? C.green1 : "transparent",
                color: activeTab === tab.key ? "#fff" : C.muted,
                transition:"all 0.18s",
                position:"relative",
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "bookmark" && bookmarks.length > 0 && (
                <span style={{ position:"absolute", top:-2, right:-2, width:14, height:14, borderRadius:"50%", background: C.green1, color:"#fff", fontSize:8, fontFamily: GM, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                  {bookmarks.length}
                </span>
              )}
              {tab.key === "records" && savedPrescriptions.length > 0 && (
                <span style={{ position:"absolute", top:-2, right:-2, width:14, height:14, borderRadius:"50%", background: C.green1, color:"#fff", fontSize:8, fontFamily: GM, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                  {savedPrescriptions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ── 본문 ── */}
      <main style={{ padding:"20px clamp(10px,3vw,24px) 40px", maxWidth:1100, margin:"0 auto" }}>
        {renderTabContent()}
      </main>

      <footer style={{ padding:"12px", textAlign:"center", fontFamily: F, fontSize:9.5, color:"rgba(90,70,40,0.36)", borderTop:`1px solid ${C.border}`, background: C.paper }}>
        © 2026 디지털 종이약국 by lou · Powered by Google Gemini
      </footer>
    </div>
  );
};

// ─── StepCard 컴포넌트 ────────────────────────────────────────────────────────
function StepCard({
  stepLabel, title, sub, active, done, onActivate, children,
}: {
  stepLabel: string; title: string; sub: string;
  active: boolean; done: boolean; onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={!active ? onActivate : undefined}
      style={{
        flex:"1 1 280px", minWidth:260,
        background: C.paper,
        border:`1.5px solid ${active ? C.green1 : done ? C.green2 : C.border}`,
        borderRadius:16, padding:"16px 16px 14px",
        cursor: active ? "default" : "pointer",
        transition:"border-color 0.2s, box-shadow 0.2s",
        boxShadow: active ? `0 4px 20px rgba(31,81,59,0.12)` : "0 1px 4px rgba(0,0,0,0.04)",
        position:"relative",
      }}
    >
      {/* 완료 뱃지 */}
      {done && !active && (
        <div style={{ position:"absolute", top:12, right:12, width:20, height:20, borderRadius:"50%", background: C.green1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>✓</div>
      )}
      <p style={{ fontFamily: GM, fontSize:9, color: active ? C.green1 : C.muted, letterSpacing:"0.1em", marginBottom:4 }}>{stepLabel}</p>
      <h3 style={{ fontFamily: F, fontSize:14, color: C.dark, fontWeight:700, marginBottom:3 }}>{title}</h3>
      <p style={{ fontFamily: F, fontSize:10, color: C.muted, marginBottom:12, lineHeight:1.5 }}>{sub}</p>
      {children}
    </div>
  );
}

export default App;