import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useZipValidation } from "../../hook/useZipValidation";
import { isZipValidationPending, ZIP_VALIDATION_MESSAGES } from "../../util/zipValidationState";

type Props = { taskId: string | null | undefined; gameId: number | undefined };

/**
 * ZIP 서버 검증 단계 안내. 관리자 검수·공개 상태와는 별개다.
 * 검증이 끝나면(valid/invalid) 목록·상세를 다시 불러와 register_state(반려 등)를 반영한다.
 */
export default function ZipValidationStatus({ taskId, gameId }: Props) {
  const { view, reason, timedOut, isFetching, recheck } = useZipValidation(taskId, gameId);
  const queryClient = useQueryClient();
  const settled = useRef<string | null>(null);
  useEffect(() => {
    if ((view === "valid" || view === "invalid" || view === "stale") && settled.current !== taskId) {
      settled.current = taskId ?? null;
      for (const key of ["myGameList", "gameDetail"]) void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [view, taskId, queryClient]);

  if (!taskId || !gameId) return null;
  const pending = view === null || isZipValidationPending(view);
  const message =
    view === null
      ? "서버 파일 검증 상태를 확인하는 중입니다."
      : timedOut && pending
        ? "검증이 지연되고 있습니다. 잠시 후 다시 확인해주세요. 지연은 검증 실패를 뜻하지 않습니다."
        : ZIP_VALIDATION_MESSAGES[view];
  // 확정된 결과(valid/invalid)는 다시 조회해도 바뀌지 않으므로 재확인 버튼을 두지 않는다.
  const canRecheck = (!pending || timedOut) && view !== "valid" && view !== "invalid";
  return (
    <div role="status" aria-live="polite" className="text-white text-body-14 my-1" data-zip-view={view ?? "loading"}>
      <p>{message}</p>
      {view === "invalid" && reason && <p className="text-red-400">사유: {reason}</p>}
      {view === "invalid" && (
        <Link to={`/game-edit/${gameId}`} className="underline">
          파일 수정하기
        </Link>
      )}
      {canRecheck && (
        <button type="button" className="underline" disabled={isFetching} onClick={recheck}>
          결과 다시 확인
        </button>
      )}
    </div>
  );
}
