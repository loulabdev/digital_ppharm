// ============================================================
// PrescriptionView.tsx 패치 가이드 (D: 메시지 분리 + A: ISBN 카운트)
// ============================================================
// 아래 4곳을 수정하세요.
// ============================================================


// ──────────────────────────────────────────────────────────
// [1] import에 LibrarySearchMeta 추가 (types.ts에서)
// ──────────────────────────────────────────────────────────
// 기존:
import { LibraryAvailability, Prescription } from "../types";

// 변경:
import { LibraryAvailability, LibrarySearchMeta, Prescription } from "../types";


// ──────────────────────────────────────────────────────────
// [2] state 선언부에 librarySearchMeta 추가
//     (기존 state 선언들 바로 아래에 삽입)
// ──────────────────────────────────────────────────────────
// 기존:
  const [expandedLibraries, setExpandedLibraries] = useState<Record<string, boolean>>({});

// 변경 (아래 줄 추가):
  const [expandedLibraries, setExpandedLibraries] = useState<Record<string, boolean>>({});
  // [A/D] ISBN 수집 메타 — 매칭 실패 vs 실제 미소장 구분용
  const [librarySearchMeta, setLibrarySearchMeta] = useState<Record<string, LibrarySearchMeta>>({});


// ──────────────────────────────────────────────────────────
// [3] handleFindLibraries 함수 교체
//     (단일 ISBN 검색 — isbnCount 저장)
// ──────────────────────────────────────────────────────────
// 기존:
  const handleFindLibraries = async (book: RecommendedBook) => {
    await searchLibraries(book, getBookKey(book));
  };

// 변경:
  const handleFindLibraries = async (book: RecommendedBook) => {
    const key = getBookKey(book);
    const rawIsbn = (book.isbn || "").replace(/[^0-9Xx]/g, "");
    const isbnCount = rawIsbn.length >= 10 ? 1 : 0;
    // [D] 단일 ISBN 검색 메타 저장
    setLibrarySearchMeta((prev) => ({
      ...prev,
      [key]: { isbnCount, regionCount: 17 },
    }));
    await searchLibraries(book, key);
  };


// ──────────────────────────────────────────────────────────
// [4] handleFindLatestEdition 내부 — finalIsbns 계산 직후 메타 저장
//     (기존 코드에서 findLibrariesByMultipleIsbns 호출 바로 위에 삽입)
// ──────────────────────────────────────────────────────────
// 기존:
      const libraries = await findLibrariesByMultipleIsbns(finalIsbns, userLocation);

// 변경:
      // [A/D] ISBN 수집 통계 저장 — "0개면 매칭 실패", "1개+ 면 실제 미소장" 구분
      setLibrarySearchMeta((prev) => ({
        ...prev,
        [key]: { isbnCount: finalIsbns.length, regionCount: 17 },
      }));
      const libraries = await findLibrariesByMultipleIsbns(finalIsbns, userLocation);


// ──────────────────────────────────────────────────────────
// [5] renderBookDetail 내부 — meta 변수 추가 + 메시지 교체
// ──────────────────────────────────────────────────────────
// 기존 변수 선언부 (renderBookDetail 상단):
    const loanableCount = libraries.filter((l) => l.loanAvailable === true).length;

// 변경 (아래 줄 추가):
    const loanableCount = libraries.filter((l) => l.loanAvailable === true).length;
    const searchMeta = librarySearchMeta[key]; // [A/D] ISBN 수집 메타


// ──────────────────────────────────────────────────────────
// [6] "소장 도서관을 찾지 못했습니다" 메시지 교체
// ──────────────────────────────────────────────────────────
// 기존 (lines 516-519):
        {hasSearched && !isLoading && !libraryError && libraries.length === 0 && (
          <div className="mt-4 bg-paper-50 border border-paper-200 rounded-xl p-3 sm:p-4">
            <p className="text-sm text-ink-900 font-semibold">소장 도서관을 찾지 못했습니다.</p>
            <p className="text-xs text-ink-800/50 mt-1">전체 판본 ISBN으로 검색했지만 정보나루 참여 도서관에는 등록되지 않았습니다.</p>

// 변경:
        {hasSearched && !isLoading && !libraryError && libraries.length === 0 && (
          <div className="mt-4 rounded-xl p-3 sm:p-4 border"
            style={{
              background: searchMeta?.isbnCount === 0 ? "#FEF9EC" : "#F5F5F0",
              borderColor: searchMeta?.isbnCount === 0 ? "#F5E0A0" : "#E0DDD8",
            }}
          >
            {searchMeta?.isbnCount === 0 ? (
              // [D] 매칭 실패 — ISBN 자체를 못 찾은 경우
              <>
                <p className="text-sm font-semibold" style={{ color: "#92750A" }}>
                  📭 ISBN 매칭 실패
                </p>
                <p className="text-xs mt-1" style={{ color: "#A08C40" }}>
                  도서 정보로 ISBN을 확인하지 못해 도서관 검색이 어렵습니다.
                  제목·저자를 조정하거나 직접 도서관 홈페이지에서 검색해 보세요.
                </p>
              </>
            ) : (
              // [D] 실제 미소장 — ISBN은 있지만 소장 도서관이 없는 경우
              <>
                <p className="text-sm font-semibold text-ink-900">
                  📚 소장 도서관 없음
                </p>
                <p className="text-xs mt-1 text-ink-800/50">
                  {searchMeta?.isbnCount}개 ISBN 기준으로 전국 {searchMeta?.regionCount ?? 17}개 지역을 검색했지만,
                  정보나루 참여 도서관에 소장 기록이 없습니다.
                  절판·독립출판물이거나 미참여 도서관 소장일 수 있습니다.
                </p>
              </>
            )}
          </div>
        )}


// ──────────────────────────────────────────────────────────
// [7] (선택) 소장 도서관 헤더에 "어떤 ISBN으로 찾았는지" 뱃지 표시
//     library 목록 렌더링 내부 li 태그 안에 추가
// ──────────────────────────────────────────────────────────
// 기존 library li 내부:
                        <p className="text-sm font-semibold text-ink-900 break-words">{library.libraryName}</p>

// 변경 (foundByIsbn 뱃지 추가):
                        <p className="text-sm font-semibold text-ink-900 break-words">{library.libraryName}</p>
                        {library.foundByIsbn && (
                          <p className="text-[10px] text-ink-800/30 mt-0.5 font-mono">
                            ISBN {library.foundByIsbn}
                          </p>
                        )}
