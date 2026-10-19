import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getTaskStatus } from "../../api/direct";
import { ZipSubmission } from "../../types";
import { currentZipOutcome, shouldPollZip, zipTaskMessage } from "../../util/zipTaskStatus";

export default function ZipValidationStatus({ gameId, submission }: { gameId: number; submission?: ZipSubmission | null }) {
  const client = useQueryClient();
  const [started, setStarted] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setStarted(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [submission?.task_id, submission?.submission_id]);
  const elapsed = now - started;
  const query = useQuery({
    queryKey: ["zipValidation", gameId, submission?.task_id, submission?.submission_id],
    queryFn: () => getTaskStatus(submission!.task_id!),
    enabled: !!submission?.task_id && !!submission?.submission_id && submission.publish_status !== "failed",
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => q.state.error || !shouldPollZip(q.state.data) || elapsed >= 600000 ? false : elapsed >= 30000 ? 15000 : 5000,
  });
  useEffect(() => {
    if (query.data && !shouldPollZip(query.data)) {
      for (const key of ["myGameList", "gameDetail"])
        void client.invalidateQueries({ queryKey: [key] });
    }
  }, [query.data, client]);
  const pending = !!submission?.task_id && submission.publish_status !== "failed" && shouldPollZip(query.data) && !query.isError;
  return <div role="status" className="text-white my-3">
    <p>{query.isError ? "파일 검증 결과를 조회하지 못했습니다. 기존 관리자 검수 상태는 유지됩니다." : zipTaskMessage(query.data, submission, gameId)}</p>
    {pending && elapsed >= 30000 && <p>{elapsed >= 600000 ? "자동 조회를 중지했습니다. 결과는 미확정입니다." : "파일 검증이 지연되고 있습니다. 접수 후에는 이동해도 됩니다."}</p>}
    <button type="button" onClick={() => {
      setStarted(Date.now()); setNow(Date.now());
      void client.invalidateQueries({ queryKey: ["myGameList"] });
      void client.invalidateQueries({ queryKey: ["gameDetail"] });
      if (submission?.task_id) void query.refetch();
    }}>검증 결과 다시 조회</button>
    {currentZipOutcome(query.data, submission, gameId)?.outcome === "invalid" &&
      <Link className="ml-3" to={`/game-edit/${gameId}`}>파일 수정하기</Link>}
  </div>;
}
