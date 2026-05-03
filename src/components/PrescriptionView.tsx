import React, {
  useEffect, useMemo, useState, useRef, useCallback,
} from "react";
import {
  AlertCircle, ChevronDown, ChevronUp, BookOpen, Search, Bookmark, Share2,
} from "lucide-react";
import {
  LibraryAvailability, LibrarySearchMeta, Prescription,
  MoodKey, ConcernKey, ReadStyleKey,
} from "../types";
import { getBookBookmarks, toggleBookBookmark } from "../services/storageService";
import { getBookCoverUrl } from "../services/bookCoverService";
import {
  findNearbyLibrariesByBook,
  findLibrariesByBookNationwide,
  findLibrariesByMultipleIsbns,
} from "../services/libraryService";
import { getCurrentLocation, type UserLocation } from "../services/locationService";
import BookCover from "./BookCover";
import { emotionBooks } from "../data/emotionBooks";
import { findLatestEdition, type LatestEditionResult } from "../services/bookSearchOrchestrator";
import { collectAllEditionIsbnsWithStats } from "../services/editionIsbnService";

// ─── 네이버 책 소개문 fetch ──────────────────────────────────────────────────
async function fetchNaverBookDescription(title: string, author: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    const res = await fetch(`/api/naver-book?query=${query}&display=5`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const SKIP_KEYWORDS = ["큰글자", "큰 글자", "점자", "오디오북", "오디오 북", "대활자"];
    const item = (data?.items ?? []).find(
      (i: { title?: string; description?: string }) =>
        !SKIP_KEYWORDS.some(kw => (i.title || "").includes(kw))
    );
    if (!item?.description) return "";
    return item.description.replace(/<[^>]*>/g, "").trim();
  } catch {
    return "";
  }
}

interface Props {
  data: Prescription;
  onReset: () => void;
  onBookmarksChange?: () => void;
}

type RecommendedBook = Prescription["recommended_books"][number];

// ─── 컬러 토큰 (목업 팔레트) ─────────────────────────────────────────────────
const F  = "'Gowun Batang', 'Noto Serif KR', Georgia, serif";
const GM = "'Gowun Mono', 'Courier New', monospace";

const C = {
  bg:      "#FFF7EE",
  paper:   "#FFFBF6",
  green1:  "#1F4B3A",
  green2:  "#7FA58A",
  gold:    "#D4AF37",
  sand:    "#E9E2D6",
  dark:    "#1C1C1C",
  muted:   "#8C7F72",
  border:  "rgba(140,127,114,0.22)",
  white:   "#ffffff",
  tag:     "#EDE8E0",
  // 책 페이지
  page1:   "#FFF7EE",
  page2:   "#FFFBF6",
  ink:     "#2e2414",
  ink2:    "#6e5428",
  ink3:    "#96845a",
  bdr:     "rgba(110,84,40,0.22)",
  box:     "rgba(255,251,236,0.55)",
  cover1:  "#1F4B3A",
  cover2:  "#2e4a38",
  seal:    "#7a3a2a",
  ribbon:  "#b08040",
};

const linesBg = `repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(110,84,40,0.05) 27px,rgba(110,84,40,0.05) 28px)`;
const paperStyle = (bg: string): React.CSSProperties => ({ backgroundColor: bg, backgroundImage: linesBg });

// ─── 문진 레이블 맵 (12감정 / 8고민 완전판) ──────────────────────────────────
const MOOD_LABEL: Record<MoodKey, string> = {
  ANXIETY:"불안함", EXHAUSTED:"지침·번아웃", EMPTY:"공허함",
  COMFORT:"위로받고 싶음", EXCITED:"설렘·기대", NUMB:"무감각",
  SAD:"슬픔·상실", LONELY:"외로움·고독", ANGRY:"분노·억울함",
  GUILTY:"죄책감·자책", CONFUSED:"혼란·방황", GRATEFUL:"감사·평온",
};
const CONCERN_LABEL: Record<ConcernKey, string> = {
  RELATION:"관계", CAREER:"진로", DAILY:"일상", WORK:"일·공부",
  FAMILY:"가족", SELF:"자아", HEALTH:"건강", MONEY:"금전",
};
const READ_STYLE_LABEL: Record<ReadStyleKey, string> = {
  LIGHT:"가볍게", SHORT:"짧게", DEEP:"깊게", WARM:"따뜻하게", CLEAR:"명쾌하게",
};

// ─── 구매처 ──────────────────────────────────────────────────────────────────
const SHOP_INFO = [
  { name:"교보문고", short:"교", bg:"#e8f0e8", tc:"#2a6a2a", url:(t:string)=>`https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(t)}` },
  { name:"알라딘",   short:"알", bg:"#e8eef8", tc:"#2a4a8a", url:(t:string)=>`https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(t)}` },
  { name:"인터파크", short:"인", bg:"#fff0e8", tc:"#8a3a10", url:(t:string)=>`https://book.interpark.com/search/bookSearch.do?query=${encodeURIComponent(t)}` },
];

// ─── 오디오북 플랫폼 ──────────────────────────────────────────────────────────
const AUDIO_PLATFORMS: Record<string, { name:string; short:string; bg:string; tc:string; url:(t:string)=>string }> = {
  "오디오북_밀리": { name:"밀리의서재", short:"밀", bg:"#fff3e8", tc:"#c05a00", url:(t)=>`https://www.millie.co.kr/v3/search?keyword=${encodeURIComponent(t)}` },
  "오디오북_윌라": { name:"윌라",       short:"윌", bg:"#e8f4ff", tc:"#1a6ab0", url:(t)=>`https://www.welaaa.com/search/total?keyword=${encodeURIComponent(t)}` },
  "오디오북_네이버":{ name:"네이버 오디오클립", short:"클", bg:"#e8ffe8", tc:"#1a7a1a", url:(t)=>`https://audioclip.naver.com/search?q=${encodeURIComponent(t)}` },
};

// ─── 추가 검색 항목 ──────────────────────────────────────────────────────────
const SEARCH_ITEMS = [
  { id:"library_all", label:"소장 도서관 조회" },
  { id:"latest",      label:"최신판 + 전체판본 검색" },
  { id:"book_search", label:"도서 검색 (구글)" },
  { id:"similar",     label:"감정 유사 도서 추천" },
  { id:"author",      label:"동일 저자 더 보기" },
];

// ─── 지브리풍 Canvas 일러스트 ────────────────────────────────────────────────
const GHIBLI_SCENES = [
  { bg1:"#2a5e3a", bg2:"#1a3a22", scene:"forest" },
  { bg1:"#1a1040", bg2:"#0a0820", scene:"night"  },
  { bg1:"#1a5080", bg2:"#0e3060", scene:"sea"    },
  { bg1:"#2a6e40", bg2:"#1a4428", scene:"field"  },
];

const drawGhibli = (canvas: HTMLCanvasElement, scene: string, bg1: string, bg2: string) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, bg1); g.addColorStop(1, bg2);
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  if (scene === "forest") {
    ctx.fillStyle = "rgba(40,110,50,.85)"; ctx.beginPath(); ctx.arc(w*.5,h*.42,w*.32,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(35,100,42,.8)";  ctx.beginPath(); ctx.arc(w*.3,h*.5,w*.22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(45,115,52,.8)";  ctx.beginPath(); ctx.arc(w*.7,h*.48,w*.25,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(100,60,15,.7)";  ctx.fillRect(w*.44,h*.6,w*.12,h*.26);
  } else if (scene === "night") {
    ctx.fillStyle = "rgba(255,240,180,.9)";
    [[.2,.1],[.55,.06],[.82,.15],[.12,.27],[.72,.07]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(w*x,h*y,1.5,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = "rgba(255,235,140,.9)"; ctx.beginPath(); ctx.arc(w*.7,h*.2,w*.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = bg1; ctx.beginPath(); ctx.arc(w*.74,h*.17,w*.13,0,Math.PI*2); ctx.fill();
  } else if (scene === "sea") {
    ctx.fillStyle = "rgba(255,215,70,.88)"; ctx.beginPath(); ctx.arc(w*.82,h*.15,w*.12,0,Math.PI*2); ctx.fill();
    const wg = ctx.createLinearGradient(0,h*.6,0,h);
    wg.addColorStop(0,"rgba(30,110,160,.75)"); wg.addColorStop(1,"rgba(15,70,120,.85)");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0,h*.62);
    for (let i=0;i<=w;i+=w/6) ctx.quadraticCurveTo(i+w/12,h*.56,i+w/6,h*.62);
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255,215,70,.9)"; ctx.beginPath(); ctx.arc(w*.78,h*.15,w*.13,0,Math.PI*2); ctx.fill();
    const fg = ctx.createLinearGradient(0,h*.6,0,h);
    fg.addColorStop(0,"rgba(40,110,50,.85)"); fg.addColorStop(1,"rgba(25,75,35,.9)");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0,h*.65); ctx.quadraticCurveTo(w*.5,h*.55,w,h*.65);
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.fill();
  }
};

// ─── 섹션 헤더 ───────────────────────────────────────────────────────────────
const SH = ({ label }: { label: string }) => (
  <div style={{ display:"flex", alignItems:"center", gap:5, margin:"8px 0 5px" }}>
    <div style={{ flex:1, height:1, background:C.bdr }} />
    <span style={{ fontFamily:GM, fontSize:8.5, color:C.ink2, letterSpacing:"0.08em", whiteSpace:"nowrap", fontWeight:700 }}>{label}</span>
    <div style={{ flex:1, height:1, background:C.bdr }} />
  </div>
);

// ─── 타자기 훅 ────────────────────────────────────────────────────────────────
function useTypewriter() {
  const sessionRef = useRef<number>(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    sessionRef.current += 1;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  const type = useCallback((setText: React.Dispatch<React.SetStateAction<string>>, setDone: React.Dispatch<React.SetStateAction<boolean>>, text: string, speed = 60) => {
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setText(""); setDone(false);
    const chars = [...text]; let i = 0;
    const next = () => {
      if (sessionRef.current !== mySession) return;
      if (i < chars.length) {
        const ch = chars[i++];
        setText(prev => prev + ch);
        timerRef.current = setTimeout(next, speed + Math.floor(Math.random()*18));
      } else { setDone(true); }
    };
    timerRef.current = setTimeout(next, speed);
  }, [cancel]);
  return { type, cancel };
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
const PrescriptionView: React.FC<Props> = ({ data, onReset, onBookmarksChange }) => {
  const [bookmarks,         setBookmarks]         = useState(getBookBookmarks());
  const [coverUrls,         setCoverUrls]         = useState<Record<string,string|null>>({});
  const [libraryResults,    setLibraryResults]    = useState<Record<string,LibraryAvailability[]>>({});
  const [libraryErrors,     setLibraryErrors]     = useState<Record<string,string|null>>({});
  const [searchedBooks,     setSearchedBooks]     = useState<Record<string,boolean>>({});
  const [loadingBooks,      setLoadingBooks]      = useState<Record<string,boolean>>({});
  const [latestResults,     setLatestResults]     = useState<Record<string,LatestEditionResult|null>>({});
  const [loadingLatest,     setLoadingLatest]     = useState<Record<string,boolean>>({});
  const [expandedLibraries, setExpandedLibraries] = useState<Record<string,boolean>>({});
  const [librarySearchMeta, setLibrarySearchMeta] = useState<Record<string,LibrarySearchMeta|null>>({});
  const [searchPanelOpen,   setSearchPanelOpen]   = useState<Record<string,boolean>>({});
  const [searchChecked,     setSearchChecked]     = useState<Record<string,Record<string,boolean>>>({});
  const [buyPanel,          setBuyPanel]          = useState<string|null>(null);
  const [bookDescriptions,  setBookDescriptions]  = useState<Record<string,string>>({});
  const [userRegionName,    setUserRegionName]    = useState<string|null>(null);
  const [showAllRegions,    setShowAllRegions]    = useState<Record<string,boolean>>({});
  const [descExpanded,      setDescExpanded]      = useState<Record<string,boolean>>({});
  const [memo,              setMemo]              = useState("");
  const [memoSaved,         setMemoSaved]         = useState(false);
  const [activeBookIdx,     setActiveBookIdx]     = useState(0);

  const [quoteText, setQuoteText] = useState("");
  const [quoteDone, setQuoteDone] = useState(false);
  const { type: typeText, cancel: cancelType } = useTypewriter();
  const detailRef = useRef<HTMLDivElement>(null);

  const bookmarkedKeys = useMemo(
    () => new Set(bookmarks.map(b=>`${b.book.title}__${b.book.author}__${b.book.publisher}`)),
    [bookmarks],
  );
  const getBookKey = (b: RecommendedBook) => `${b.title}__${b.author}__${b.publisher}`;

  const detectedEmotion = data.emotional_analysis.detected_emotion?.trim() || "";
  const curatedBooks = useMemo(() => {
  // 1차: 감정(detected_emotion) 기반 매칭
  let key = Object.keys(emotionBooks).find(k =>
    detectedEmotion.includes(k) || k.includes(detectedEmotion)
  );

  // 2차: 고민(concern) 기반 매칭 — HEALTH·MONEY 등 대응
  if (!key && data.quiz_answers?.concern) {
    const concernMap: Record<string, string> = {
      HEALTH: "건강",
      MONEY:  "금전",
      SELF:   "외로움·고독",
      FAMILY: "감사·평온",
    };
    const mapped = concernMap[data.quiz_answers.concern];
    if (mapped && emotionBooks[mapped]) key = mapped;
  }

  return key ? emotionBooks[key] : [];
}, [detectedEmotion, data.quiz_answers]);

  const activeBook = data.recommended_books[activeBookIdx];
  const activeKey  = activeBook ? getBookKey(activeBook) : "";

  // 책 전환 시 타자기 효과
  const switchBook = useCallback((idx: number) => {
    const book = data.recommended_books[idx];
    if (!book) return;
    cancelType();
    setQuoteText(""); setQuoteDone(false);
    setActiveBookIdx(idx);
    setTimeout(() => {
      if (book.healing_point) typeText(setQuoteText, setQuoteDone, book.healing_point, 55);
      detailRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }, 120);
    const key = getBookKey(book);
    if (!bookDescriptions[key]) {
      fetchNaverBookDescription(book.title, book.author).then(desc => {
        if (desc) setBookDescriptions(p => ({ ...p, [key]: desc }));
      });
    }
  }, [cancelType, typeText, data.recommended_books, bookDescriptions]);

  useEffect(() => {
    // 초기 로드 시 첫 번째 책 타자기
    if (data.recommended_books[0]?.healing_point) {
      setTimeout(() => typeText(setQuoteText, setQuoteDone, data.recommended_books[0].healing_point, 55), 400);
    }
    // 첫 번째 책 소개 fetch
    const first = data.recommended_books[0];
    if (first) {
      fetchNaverBookDescription(first.title, first.author).then(desc => {
        if (desc) setBookDescriptions(p => ({ ...p, [getBookKey(first)]: desc }));
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(data.recommended_books.map(async b => [getBookKey(b), await getBookCoverUrl(b.title, b.author)] as const));
      const r: Record<string,string|null> = {};
      for (const [k,u] of entries) r[k] = u;
      setCoverUrls(r);
    })();
  }, [data]);

  const handleToggleBookmark = async (book: RecommendedBook) => {
    const updated = toggleBookBookmark(book);
    setBookmarks(updated);
    onBookmarksChange?.();
  };

  const handleSaveMemo = () => {
    try {
      localStorage.setItem(`rx_memo_${Date.now()}`, memo);
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    } catch { /* 무시 */ }
  };

  // ── 도서관 검색 ──────────────────────────────────────────────────────────────
  const searchLibraries = async (book: RecommendedBook, rk: string) => {
    setLoadingBooks(p=>({...p,[rk]:true})); setLibraryErrors(p=>({...p,[rk]:null}));
    try {
      let result: LibraryAvailability[];
      try {
        const loc = await getCurrentLocation();
        if (loc.regionName) setUserRegionName(loc.regionName);
        result = await findNearbyLibrariesByBook(book, loc);
      } catch {
        result = await findLibrariesByBookNationwide(book);
        setLibraryErrors(p=>({...p,[rk]:"위치 확인 불가 — 전국 기준 결과입니다."}));
      }
      setLibraryResults(p=>({...p,[rk]:result}));
      setSearchedBooks(p=>({...p,[rk]:true}));
      if (result.length > 0) setExpandedLibraries(p=>({...p,[rk]:true}));
    } catch(e) {
      setLibraryResults(p=>({...p,[rk]:[]}));
      setLibraryErrors(p=>({...p,[rk]:e instanceof Error ? e.message : "도서관 정보를 불러오지 못했습니다."}));
      setSearchedBooks(p=>({...p,[rk]:true}));
    } finally { setLoadingBooks(p=>({...p,[rk]:false})); }
  };

  const handleFindLibraries = async (book: RecommendedBook) => {
    const key = getBookKey(book);
    const rawIsbn = (book.isbn||"").replace(/[^0-9Xx]/g,"");
    setLibrarySearchMeta(p=>({...p,[key]:{isbnCount:rawIsbn.length>=10?1:0,regionCount:17}}));
    await searchLibraries(book, key);
  };

  const handleFindLatestEdition = async (book: RecommendedBook) => {
    const key = getBookKey(book);
    setLoadingLatest(p=>({...p,[key]:true})); setLoadingBooks(p=>({...p,[key]:true})); setLibraryErrors(p=>({...p,[key]:null}));
    try {
      const lr = await findLatestEdition(book.title, book.author, book.isbn);
      setLatestResults(p=>({...p,[key]:lr}));
      const { isbns, stats } = await collectAllEditionIsbnsWithStats(book.title, book.author);
      const SKIP = ["큰글자","큰 글자","점자","오디오북","오디오 북","대활자"];
      const isSkip = (t?:string) => t ? SKIP.some(kw=>t.includes(kw)) : false;
      const isbnSet = new Set(isbns.filter(isbn=>{ const ed=lr.allEditions.find(e=>e.isbn13===isbn); return !ed||!isSkip(ed.title); }));
      if (book.isbn && !isSkip(book.title)) isbnSet.add(book.isbn.replace(/[^0-9Xx]/g,""));
      if (lr.latest?.isbn13 && !isSkip(lr.latest.title)) isbnSet.add(lr.latest.isbn13);
      for (const ed of lr.allEditions) { if (ed.isbn13 && !isSkip(ed.title)) isbnSet.add(ed.isbn13); }
      const finalIsbns = [...isbnSet].filter(x=>x.length>=10);
      setLibrarySearchMeta(p=>({...p,[key]:{isbnCount:finalIsbns.length,regionCount:17,isbnStats:stats}}));
      let loc: UserLocation|undefined;
      try { loc = await getCurrentLocation(); } catch { setLibraryErrors(p=>({...p,[key]:"위치 확인 불가 — 전국 기준 결과입니다."})); }
      const libs = await findLibrariesByMultipleIsbns(finalIsbns, loc);
      setLibraryResults(p=>({...p,[key]:libs}));
      setSearchedBooks(p=>({...p,[key]:true}));
      if (libs.length>0) setExpandedLibraries(p=>({...p,[key]:true}));
    } catch(e) {
      setLibraryResults(p=>({...p,[key]:[]}));
      setLibraryErrors(p=>({...p,[key]:e instanceof Error?e.message:"검색 중 오류가 발생했습니다."}));
      setSearchedBooks(p=>({...p,[key]:true}));
    } finally { setLoadingLatest(p=>({...p,[key]:false})); setLoadingBooks(p=>({...p,[key]:false})); }
  };

  const handleSearchAction = async (book: RecommendedBook, itemId: string) => {
    const key = getBookKey(book);
    setSearchChecked(p=>({...p,[key]:{...(p[key]||{}),[itemId]:true}}));
    setSearchPanelOpen(p=>({...p,[key]:false}));
    if (itemId==="library_all") await handleFindLibraries(book);
    else if (itemId==="latest") await handleFindLatestEdition(book);
    else if (itemId==="book_search") window.open(`https://www.google.com/search?q=${encodeURIComponent(`${book.title} ${book.author} 도서`)}`, "_blank");
    else if (itemId==="similar") window.open(`https://www.google.com/search?q=${encodeURIComponent(`${book.genre} 감성 책 추천`)}`, "_blank");
    else if (itemId==="author") window.open(`https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(book.author)}`, "_blank");
  };

  // ── 오디오북 뱃지 ────────────────────────────────────────────────────────────
  const AudiobookBadges = ({ book }: { book: RecommendedBook }) => {
    const [open, setOpen] = React.useState(false);
    const platforms = (book.tags||[]).filter(t=>t in AUDIO_PLATFORMS).map(t=>AUDIO_PLATFORMS[t]);
    if (platforms.length===0) return null;
    if (platforms.length===1) {
      const p = platforms[0];
      return (
        <a href={p.url(book.title)} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:16, border:`1px solid ${C.border}`, background:"none", textDecoration:"none" }}>
          <span style={{ fontSize:10 }}>🎧</span>
          <span style={{ fontFamily:GM, fontSize:9, color:C.ink2 }}>{p.name}</span>
        </a>
      );
    }
    return (
      <div style={{ position:"relative", display:"inline-block" }}>
        <button type="button" onClick={()=>setOpen(o=>!o)}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:16, border:`1px solid ${C.border}`, background:"none", cursor:"pointer" }}>
          <span style={{ fontSize:10 }}>🎧</span>
          <span style={{ fontFamily:GM, fontSize:9, color:C.ink2 }}>오디오북 {platforms.length}</span>
        </button>
        {open && (
          <div style={{ position:"absolute", bottom:"calc(100% + 4px)", left:0, zIndex:30, background:C.paper, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", minWidth:130, boxShadow:"0 4px 12px rgba(0,0,0,0.12)" }}>
            {platforms.map(p=>(
              <a key={p.name} href={p.url(book.title)} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 11px", borderBottom:`1px solid ${C.border}`, textDecoration:"none" }}
                onClick={()=>setOpen(false)}>
                <div style={{ width:18, height:18, borderRadius:4, background:p.bg, color:p.tc, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:GM, fontSize:8, fontWeight:700 }}>{p.short}</div>
                <span style={{ fontFamily:GM, fontSize:9, color:C.ink }}>{p.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── 추가 검색 드롭업 ─────────────────────────────────────────────────────────
  const SearchDropup = ({ book }: { book: RecommendedBook }) => {
    const key = getBookKey(book);
    const panelOpen = !!searchPanelOpen[key];
    const checked   = searchChecked[key]||{};
    return (
      <div style={{ position:"relative", zIndex:panelOpen?200:1 }}>
        <button type="button" onClick={()=>setSearchPanelOpen(p=>({...p,[key]:!p[key]}))}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", border:`1px solid ${C.border}`, borderRadius:16, background:"none", cursor:"pointer" }}>
          <Search style={{ width:9, height:9, color:C.ink3 }} />
          <span style={{ fontFamily:GM, fontSize:9, color:C.ink2 }}>추가 검색</span>
          {panelOpen ? <ChevronUp style={{ width:9, height:9, color:C.ink3 }} /> : <ChevronDown style={{ width:9, height:9, color:C.ink3 }} />}
        </button>
        {panelOpen && (
          <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, minWidth:170, border:`1px solid ${C.bdr}`, borderRadius:8, background:C.paper, boxShadow:"0 6px 20px rgba(0,0,0,0.14)", zIndex:200, overflow:"hidden" }}>
            {SEARCH_ITEMS.map(item=>(
              <button key={item.id} type="button" onClick={()=>handleSearchAction(book, item.id)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:7, padding:"9px 12px", border:"none", borderBottom:`1px solid ${C.border}`, background:checked[item.id]?"rgba(31,75,58,0.06)":"transparent", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:checked[item.id]?C.green1:C.border }} />
                <span style={{ fontFamily:GM, fontSize:10, color:checked[item.id]?C.green1:C.ink }}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── 구매 팝업 ─────────────────────────────────────────────────────────────────
  const BuyPopup = ({ book }: { book: RecommendedBook }) => {
    const key = getBookKey(book);
    if (buyPanel !== key) return null;
    return (
      <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", background:C.paper, marginTop:6 }}>
        {SHOP_INFO.map(s=>(
          <a key={s.name} href={s.url(book.title)} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 11px", borderBottom:`1px solid ${C.border}`, textDecoration:"none" }}>
            <div style={{ width:20, height:20, borderRadius:4, background:s.bg, color:s.tc, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:GM, fontSize:9, fontWeight:700 }}>{s.short}</div>
            <span style={{ fontFamily:F, fontSize:11, color:C.ink }}>{s.name}</span>
            <span style={{ marginLeft:"auto", color:C.muted, fontSize:11 }}>→</span>
          </a>
        ))}
      </div>
    );
  };

  // ── 도서관 블록 ───────────────────────────────────────────────────────────────
  const LibraryBlock = ({ book }: { book: RecommendedBook }) => {
    const key          = getBookKey(book);
    const allLibraries = libraryResults[key]||[];
    const libraryError = libraryErrors[key];
    const isLoading    = !!loadingBooks[key];
    const hasSearched  = !!searchedBooks[key];
    const isLibExp     = !!expandedLibraries[key];
    const isLatest     = !!latestResults[key];
    const showAll      = !!showAllRegions[key];
    const meta         = librarySearchMeta[key];
    const inRegion     = (lib: LibraryAvailability) => !userRegionName||(lib.address||"").includes(userRegionName);
    const filtered     = (isLatest||showAll) ? allLibraries : allLibraries.filter(inRegion);
    const sorted       = [...filtered].sort((a,b)=>{ if (typeof a.distanceKm==="number"&&typeof b.distanceKm==="number") return a.distanceKm-b.distanceKm; return typeof a.distanceKm==="number"?-1:typeof b.distanceKm==="number"?1:0; });
    const libraries    = isLatest ? sorted.slice(0,10) : sorted;
    const loanable     = libraries.filter(l=>l.loanAvailable===true).length;
    return (
      <>
        {!hasSearched && !isLoading && <p style={{ fontFamily:F, fontSize:10, color:C.muted, padding:"4px 0" }}>추가 검색에서 도서관 조회를 선택하세요</p>}
        {isLoading && <p style={{ fontFamily:F, fontSize:10, color:C.muted, padding:"4px 0" }}>조회 중...</p>}
        {libraryError && !isLoading && <div style={{ fontFamily:F, fontSize:10, color:"#c05030", padding:"3px 7px", background:"rgba(255,200,180,0.3)", borderRadius:4, marginBottom:4 }}>{libraryError}</div>}
        {hasSearched && !isLoading && libraries.length===0 && !libraryError && (
          <div style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", background:C.tag, marginBottom:5 }}>
            {(!meta||meta.isbnCount===0)
              ? <p style={{ fontFamily:F, fontSize:10, color:"#a06020" }}>ISBN 매칭 실패 — 미등록 도서일 수 있습니다</p>
              : <p style={{ fontFamily:F, fontSize:10, color:C.muted }}>{userRegionName?`${userRegionName} 지역 내 소장 도서관이 없습니다`:"소장 도서관이 없습니다"}</p>}
          </div>
        )}
        {allLibraries.length>0 && (
          <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:5, background:C.tag }}>
            <button type="button" onClick={()=>setExpandedLibraries(p=>({...p,[key]:!p[key]}))}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:"none", border:"none", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontFamily:F, fontSize:11, color:C.dark, fontWeight:700 }}>소장 도서관</span>
                <span style={{ fontFamily:F, fontSize:10, padding:"1px 6px", borderRadius:10, background:"rgba(31,75,58,0.10)", color:C.green1 }}>{libraries.length}곳</span>
                {loanable>0 && <span style={{ fontFamily:F, fontSize:10, padding:"1px 6px", borderRadius:10, background:"rgba(31,75,58,0.10)", color:C.green1 }}>대출가능 {loanable}</span>}
              </div>
              {isLibExp ? <ChevronUp style={{ width:12, height:12, color:C.muted }} /> : <ChevronDown style={{ width:12, height:12, color:C.muted }} />}
            </button>
            {isLibExp && (
              <>
                <div style={{ padding:"4px 10px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:F, fontSize:9, color:C.muted }}>{isLatest?"거리순 상위 10곳":userRegionName?`${userRegionName} 지역 내`:"전체"}</span>
                  {!isLatest && userRegionName && (
                    <button type="button" onClick={()=>setShowAllRegions(p=>({...p,[key]:!showAll}))}
                      style={{ fontFamily:F, fontSize:9, color:showAll?C.green1:C.muted, background:"none", border:`1px solid ${showAll?C.green1:C.border}`, borderRadius:8, padding:"1px 8px", cursor:"pointer" }}>
                      {showAll?"지역 내만":"전국 보기"}
                    </button>
                  )}
                </div>
                <ul style={{ padding:"0 10px 8px", maxHeight:150, overflowY:"auto" }}>
                  {libraries.map((lib,idx)=>(
                    <li key={`${lib.libCode||lib.libraryName}-${idx}`} style={{ borderBottom:idx<libraries.length-1?`1px solid ${C.border}`:"none", padding:"4px 0" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background:lib.loanAvailable?"#5a9a5a":lib.hasBook?"#c87a3a":"#aaa" }} />
                          <a href={lib.homepage||`https://www.google.com/search?q=${encodeURIComponent(lib.libraryName)}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily:GM, fontSize:10, color:C.green1, fontWeight:700, textDecoration:"underline", textUnderlineOffset:2 }}>
                            {lib.libraryName}
                          </a>
                          {typeof lib.distanceKm==="number" && <span style={{ fontFamily:F, fontSize:8.5, color:C.muted }}>{lib.distanceKm.toFixed(1)}km</span>}
                        </div>
                        <span style={{ fontFamily:F, fontSize:9, padding:"1px 6px", borderRadius:8, whiteSpace:"nowrap", background:lib.hasBook?(lib.loanAvailable?"rgba(31,75,58,0.10)":"rgba(110,84,40,0.10)"):"rgba(0,0,0,0.05)", color:lib.hasBook?(lib.loanAvailable?C.green1:C.ink2):"#888" }}>
                          {lib.hasBook?(lib.loanAvailable?"대출 가능":"소장"):"미소장"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </>
    );
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html:`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .rx-book-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.18)!important;}
        .rx-book-card{transition:transform 0.18s,box-shadow 0.18s;}
      `}} />

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px 80px", fontFamily:F }}>

        {/* ── 처방 조건 태그 ── */}
        {data.quiz_answers && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
            <span style={{ fontFamily:GM, fontSize:9, color:C.muted, letterSpacing:"0.08em" }}>처방 조건</span>
            {[MOOD_LABEL[data.quiz_answers.mood], CONCERN_LABEL[data.quiz_answers.concern], READ_STYLE_LABEL[data.quiz_answers.readStyle]].map((label,i)=>(
              <span key={i} style={{ fontFamily:F, fontSize:10, padding:"3px 12px", borderRadius:20, background:"rgba(31,75,58,0.08)", border:`1px solid rgba(31,75,58,0.18)`, color:C.green1 }}>{label}</span>
            ))}
          </div>
        )}

        {/* ── 3단 레이아웃: 책목록 | 처방전 | 추가제안 ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1fr", gap:16, marginBottom:24, alignItems:"start" }}>

          {/* 왼쪽: 마음 기록 + 책 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* 마음 기록 카드 */}
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 14px", borderTop:`3px solid ${C.green1}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontFamily:GM, fontSize:9, color:C.muted, letterSpacing:"0.06em" }}>🧠 마음 기록</span>
                <span style={{ fontFamily:F, fontSize:10, padding:"2px 8px", borderRadius:10, background:"rgba(31,75,58,0.08)", color:C.green1 }}>강도 {data.emotional_analysis.intensity}/10</span>
              </div>
              <p style={{ fontFamily:F, fontSize:12, color:C.dark, fontWeight:700, marginBottom:6 }}>
                감지된 감정 : <span style={{ color:C.green1, textDecoration:"underline", textUnderlineOffset:3 }}>{data.emotional_analysis.detected_emotion}</span>
              </p>
              <p style={{ fontFamily:F, fontSize:11, color:C.ink2, lineHeight:1.75, background:C.bg, padding:"10px 12px", borderRadius:10 }}>
                "{data.emotional_analysis.empathy_message}"
              </p>
            </div>

            {/* 추천 도서 */}
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px" }}>
              <p style={{ fontFamily:GM, fontSize:9, color:C.muted, letterSpacing:"0.06em", marginBottom:10 }}>📚 추천 도서</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {data.recommended_books.map((book,idx)=>{
                  const key = getBookKey(book);
                  const coverUrl = coverUrls[key];
                  const isActive = activeBookIdx===idx;
                  const isBookmarked = bookmarkedKeys.has(key);
                  return (
                    <button key={key} type="button"
                      className="rx-book-card"
                      onClick={()=>switchBook(idx)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10, background:isActive?C.green1:C.bg, border:`1.5px solid ${isActive?C.green1:C.border}`, cursor:"pointer", textAlign:"left", boxShadow:isActive?"0 4px 14px rgba(31,75,58,0.22)":"0 1px 4px rgba(0,0,0,0.04)" }}>
                      {/* 표지 썸네일 */}
                      <div style={{ width:36, height:50, borderRadius:4, overflow:"hidden", flexShrink:0, position:"relative" }}>
                        {coverUrl
                          ? <img src={coverUrl} alt={book.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <canvas ref={el=>{ if(el){ const s=GHIBLI_SCENES[idx%GHIBLI_SCENES.length]; drawGhibli(el,s.scene,s.bg1,s.bg2); } }} width={36} height={50} style={{ width:"100%", height:"100%", display:"block" }} />}
                        {isBookmarked && <div style={{ position:"absolute", top:2, right:2, width:5, height:5, borderRadius:"50%", background:C.ribbon }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:F, fontSize:11, color:isActive?"#fff":C.dark, fontWeight:isActive?700:400, lineHeight:1.35, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, marginBottom:2 }}>{book.title}</p>
                        <p style={{ fontFamily:GM, fontSize:9, color:isActive?"rgba(255,255,255,0.72)":C.muted }}>{book.author}</p>
                      </div>
                      <span style={{ fontFamily:GM, fontSize:10, color:isActive?"rgba(255,255,255,0.6)":C.muted, flexShrink:0 }}>0{idx+1}</span>
                    </button>
                  );
                })}
              </div>
              {/* 사서의 한 마디 */}
              {data.healing_message && (
                <div style={{ marginTop:12, padding:"10px 12px", background:C.bg, borderRadius:10, borderLeft:`3px solid ${C.green2}` }}>
                  <p style={{ fontFamily:GM, fontSize:9, color:C.muted, marginBottom:4 }}>✦ 사서의 한 마디</p>
                  <p style={{ fontFamily:F, fontSize:10.5, color:C.ink2, lineHeight:1.75 }}>"{data.healing_message}"</p>
                </div>
              )}
            </div>
          </div>

          {/* 중앙: 처방전 오픈북 */}
          {activeBook && (
            <div ref={detailRef} style={{ background:C.paper, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.10)", animation:"fadeUp 0.3s ease" }}>

              {/* 처방전 헤더 */}
              <div style={{ background:C.green1, padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:GM, fontSize:9, color:"rgba(255,255,255,0.7)", letterSpacing:"2px" }}>디지털 종이약국</span>
                  <span style={{ fontFamily:GM, fontSize:8, color:"rgba(255,255,255,0.45)" }}>|</span>
                  <span style={{ fontFamily:GM, fontSize:9, color:C.gold, letterSpacing:"1px" }}>처방전 No. {String(activeBookIdx+1).padStart(4,"0")}</span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button type="button" onClick={()=>handleToggleBookmark(activeBook)}
                    style={{ background:"none", border:`1px solid rgba(255,255,255,0.3)`, borderRadius:6, padding:"4px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <Bookmark style={{ width:12, height:12, color:bookmarkedKeys.has(activeKey)?"#FFD700":"rgba(255,255,255,0.7)" }} />
                    <span style={{ fontFamily:GM, fontSize:9, color:"rgba(255,255,255,0.7)" }}>북마크</span>
                  </button>
                  <button type="button" onClick={onReset}
                    style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:F, fontSize:9, color:"rgba(255,255,255,0.7)" }}>
                    ↺ 새 처방
                  </button>
                </div>
              </div>

              {/* 표지 + 기본 정보 */}
              <div style={{ display:"flex", gap:16, padding:"18px 18px 14px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:80, height:110, borderRadius:6, overflow:"hidden", flexShrink:0, boxShadow:"2px 4px 12px rgba(0,0,0,0.20)" }}>
                  {coverUrls[activeKey]
                    ? <img src={coverUrls[activeKey]!} alt={activeBook.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <canvas ref={el=>{ if(el){ const s=GHIBLI_SCENES[activeBookIdx%GHIBLI_SCENES.length]; drawGhibli(el,s.scene,s.bg1,s.bg2); } }} width={80} height={110} style={{ width:"100%", height:"100%", display:"block" }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <h2 style={{ fontFamily:F, fontSize:17, fontWeight:700, color:C.dark, lineHeight:1.35, marginBottom:5 }}>{activeBook.title}</h2>
                  <p style={{ fontFamily:GM, fontSize:11, color:C.muted, marginBottom:4 }}>{activeBook.author} 지음</p>
                  <p style={{ fontFamily:GM, fontSize:10, color:C.muted, marginBottom:8 }}>{activeBook.publisher} · {activeBook.year}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {[activeBook.genre, ...(activeBook.tags||[])].filter(Boolean).slice(0,3).map((t,i)=>(
                      <span key={i} style={{ fontFamily:F, fontSize:9.5, padding:"2px 8px", border:`1px solid ${C.border}`, borderRadius:10, color:C.ink2, background:C.tag }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 책 소개 */}
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                <SH label="책  소개" />
                <div style={{ background:C.bg, borderRadius:10, padding:"10px 12px" }}>
                  {(()=>{
                    const desc = bookDescriptions[activeKey]||activeBook.why_this_book||"";
                    const isLong = desc.length>120;
                    const isExp  = !!descExpanded[activeKey];
                    return (
                      <>
                        <div style={{ maxHeight:isLong&&!isExp?72:"none", overflow:"hidden", transition:"max-height 0.3s ease" }}>
                          <p style={{ fontFamily:F, fontSize:11, color:C.ink, lineHeight:1.85, wordBreak:"keep-all" }}>{desc}</p>
                        </div>
                        {isLong && (
                          <button type="button" onClick={()=>setDescExpanded(p=>({...p,[activeKey]:!p[activeKey]}))}
                            style={{ fontFamily:F, fontSize:9, color:C.ink2, background:"none", border:"none", cursor:"pointer", marginTop:4, padding:0, opacity:0.75 }}>
                            {isExp?"접기 ▲":"더보기 ▼"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 치유 포인트 + 읽기 가이드 */}
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                <SH label="치유  포인트" />
                <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", marginBottom:10, background:C.paper }}>
                  <p style={{ fontFamily:GM, fontSize:11, color:C.ink, lineHeight:1.75, minHeight:18 }}>
                    {quoteText||<span style={{ opacity:0.28 }}>· · ·</span>}
                    {quoteText&&!quoteDone&&<span style={{ display:"inline-block", width:1.5, height:11, background:C.ink, marginLeft:1, verticalAlign:"middle", animation:"blink 0.8s step-end infinite" }} />}
                  </p>
                </div>
                <SH label="읽기  가이드" />
                <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", background:C.paper }}>
                  {activeBook.reading_guide?.split(/\d+\.\s*/).filter(Boolean).map((g,i)=>(
                    <div key={i} style={{ display:"flex", gap:6, marginBottom:i<2?5:0 }}>
                      <span style={{ fontFamily:GM, fontSize:10, color:C.muted, flexShrink:0 }}>0{i+1}.</span>
                      <span style={{ fontFamily:GM, fontSize:10.5, color:C.ink, lineHeight:1.65 }}>{g.trim()}</span>
                    </div>
                  ))||<span style={{ fontFamily:GM, fontSize:10.5, color:C.ink }}>{activeBook.reading_guide}</span>}
                  {activeBook.music_keyword && (
                    <div style={{ display:"flex", gap:6, marginTop:6, paddingTop:6, borderTop:`1px solid ${C.border}` }}>
                      <span style={{ fontFamily:F, fontSize:10, color:C.muted }}>🎵</span>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeBook.music_keyword)}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily:GM, fontSize:10.5, color:C.green1, textDecoration:"underline", textUnderlineOffset:2 }}>
                        {activeBook.music_keyword}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 한 줄 기록 */}
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                <SH label="한  줄  기록" />
                <textarea
                  value={memo}
                  onChange={e=>setMemo(e.target.value)}
                  placeholder="이 책을 처방받으며 드는 생각..."
                  maxLength={120}
                  rows={2}
                  style={{ width:"100%", background:"transparent", border:"none", borderBottom:`1px dotted ${C.border}`, resize:"none", fontFamily:F, fontSize:11, color:C.ink, lineHeight:"28px", outline:"none", padding:"0 4px", boxSizing:"border-box", backgroundImage:linesBg }}
                />
                <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:6, marginTop:4 }}>
                  {memoSaved && <span style={{ fontFamily:F, fontSize:9, color:C.green1 }}>저장됨 ✓</span>}
                  <button type="button" onClick={handleSaveMemo} disabled={!memo.trim()}
                    style={{ fontFamily:F, fontSize:9, padding:"3px 12px", borderRadius:10, border:`1px solid ${memo.trim()?C.border:"transparent"}`, background:memo.trim()?C.green1:"transparent", color:memo.trim()?"#fff":C.muted, cursor:memo.trim()?"pointer":"default", transition:"all 0.2s" }}>
                    저장
                  </button>
                </div>
              </div>

              {/* 근처 도서관 */}
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
                <SH label="근처  소장  도서관" />
                <LibraryBlock book={activeBook} />
              </div>

              {/* 액션 버튼 */}
              <div style={{ padding:"12px 18px", display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
                <button type="button" onClick={()=>setBuyPanel(buyPanel===activeKey?null:activeKey)}
                  style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 12px", borderRadius:16, border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontFamily:GM, fontSize:9, color:C.ink2 }}>
                  🛒 구매하기
                </button>
                <SearchDropup book={activeBook} />
                <AudiobookBadges book={activeBook} />
                <BuyPopup book={activeBook} />
              </div>

              {/* 책 넘기기 */}
              <div style={{ padding:"10px 18px", background:C.bg, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <button type="button" onClick={()=>switchBook(activeBookIdx-1)} disabled={activeBookIdx===0}
                  style={{ fontFamily:F, fontSize:10, color:activeBookIdx===0?C.muted:C.green1, background:"none", border:"none", cursor:activeBookIdx===0?"not-allowed":"pointer", opacity:activeBookIdx===0?0.4:1 }}>
                  ← 이전 책
                </button>
                <div style={{ display:"flex", gap:5 }}>
                  {data.recommended_books.map((_,i)=>(
                    <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:i===activeBookIdx?C.green1:C.sand, cursor:"pointer", transition:"background 0.2s" }} onClick={()=>switchBook(i)} />
                  ))}
                </div>
                <button type="button" onClick={()=>switchBook(activeBookIdx+1)} disabled={activeBookIdx===data.recommended_books.length-1}
                  style={{ fontFamily:F, fontSize:10, color:activeBookIdx===data.recommended_books.length-1?C.muted:C.green1, background:"none", border:"none", cursor:activeBookIdx===data.recommended_books.length-1?"not-allowed":"pointer", opacity:activeBookIdx===data.recommended_books.length-1?0.4:1 }}>
                  다음 책 →
                </button>
              </div>
            </div>
          )}

          {/* 오른쪽: 추가 제안 및 활동 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 14px" }}>
              <p style={{ fontFamily:GM, fontSize:9, color:C.muted, letterSpacing:"0.06em", marginBottom:10 }}>🌿 추가 제안 및 활동</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {data.additional_care.activities.map((act,idx)=>(
                  <div key={idx} style={{ background:C.bg, borderRadius:10, padding:"10px 12px", borderLeft:`3px solid ${C.green2}` }}>
                    <p style={{ fontFamily:F, fontSize:11, color:C.ink, lineHeight:1.65 }}>{act}</p>
                  </div>
                ))}
              </div>
              {data.additional_care.professional_help && (
                <div style={{ display:"flex", gap:7, marginTop:10, background:"rgba(255,230,225,0.6)", border:"1px solid rgba(200,100,80,0.2)", padding:"10px 12px", borderRadius:10 }}>
                  <AlertCircle style={{ width:14, height:14, flexShrink:0, color:"#c05030", marginTop:1 }} />
                  <span style={{ fontFamily:GM, fontSize:11, color:"#a04028", lineHeight:1.6 }}>{data.additional_care.professional_help}</span>
                </div>
              )}
            </div>

            {/* 새로운 처방 버튼 */}
            <button type="button" onClick={onReset}
              style={{ width:"100%", padding:"12px", fontFamily:F, fontSize:13, fontWeight:700, background:C.green1, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", boxShadow:`0 3px 10px rgba(31,75,58,0.22)`, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              ↺ 새로운 처방 시작하기
            </button>
          </div>
        </div>

        {/* ── 마음을 위한 추가 추천 ── */}
        {curatedBooks.length>0 && (
          <section style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ flex:1, height:1, background:C.border }} />
              <h3 style={{ fontFamily:F, fontSize:14, color:C.dark, whiteSpace:"nowrap" }}>마음을 위한 추가 추천</h3>
              <div style={{ flex:1, height:1, background:C.border }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
              {curatedBooks.map((book,idx)=>(
                <article key={`${book.title}-${idx}`} style={{ background:C.paper, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ width:48, height:64, borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}`, background:C.bg, flexShrink:0 }}>
                      <BookCover title={book.title} image={null} className="w-full h-full object-cover" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h4 style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.dark, marginBottom:3, lineHeight:1.4 }}>{book.title}</h4>
                      {book.author && <p style={{ fontFamily:GM, fontSize:10, color:C.muted, marginBottom:4 }}>{book.author}</p>}
                      <p style={{ fontFamily:F, fontSize:10.5, color:C.ink, lineHeight:1.65 }}>{book.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default PrescriptionView;