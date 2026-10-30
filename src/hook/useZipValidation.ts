import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getZipValidationStatus } from "../api/zipValidation";
import { isZipValidationPending, toZipValidationErrorView, toZipValidationView } from "../util/zipValidationState";
import { ZipValidationView } from "../types";

// 조회 간격: 처음 2분은 5초, 이후 15초. 10분이 지나면 자동 조회를 멈추고 수동 재조회만 제공한다.
export const ZIP_POLL_FAST_MS = 5_000;
export const ZIP_POLL_SLOW_MS = 15_000;
export const ZIP_POLL_FAST_WINDOW_MS = 2 * 60_000;
export const ZIP_POLL_LIMIT_MS = 10 * 60_000;

/**
 * 현재 파일의 ZIP 검증 결과를 주기적으로 조회한다. WebSocket 없이 동작한다.
 * 같은 task_id는 같은 query key를 쓰므로 목록 카드와 배너가 함께 써도 요청은 한 번이다.
 */
export function useZipValidation(taskId: string | null | undefined, gameId: number | undefined) {
  const startedAt = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    startedAt.current = Date.now();
    setTimedOut(false);
  }, [taskId]);

  const query = useQuery({
    queryKey: ["zipValidation", taskId, gameId],
    enabled: !!taskId && !!gameId,
    retry: false,
    queryFn: () => getZipValidationStatus(taskId!, gameId!),
    refetchInterval: (q) => {
      if (q.state.status === "error" || !q.state.data) return false;
      if (!isZipValidationPending(toZipValidationView(q.state.data, taskId!, gameId!))) return false;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed > ZIP_POLL_LIMIT_MS) {
        setTimedOut(true);
        return false;
      }
      return elapsed < ZIP_POLL_FAST_WINDOW_MS ? ZIP_POLL_FAST_MS : ZIP_POLL_SLOW_MS;
    },
  });

  let view: ZipValidationView | null = null;
  if (query.isError) view = toZipValidationErrorView(query.error);
  else if (query.data && taskId && gameId) view = toZipValidationView(query.data, taskId, gameId);

  const recheck = () => {
    startedAt.current = Date.now();
    setTimedOut(false);
    void query.refetch();
  };
  return { view, reason: query.data?.result?.reason ?? null, timedOut, isFetching: query.isFetching, recheck };
}
