import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { approveRegisterGame, getApprovalTask, getRegisterGameDetail } from "../../api/direct";
import SpartaModal from "../../spartaDesignSystem/SpartaModal";
import SpartaButton from "../../spartaDesignSystem/SpartaButton";
export default function AdminGameApproveModal({ game_id }: { game_id: number }) {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "processing" | "complete" | "failed" | "delayed">("idle");
  const busy = useRef(false);
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["adminGameDetail", game_id], queryFn: () => getRegisterGameDetail(game_id), enabled: open });
  const complete = () => {
    setState("complete");
    for (const key of ["adminGameList", "registerGameStat", "adminGameDetail", "gameDetail", "gameList", "myGameList"]) void client.invalidateQueries({ queryKey: [key] });
  };
  const check = async () => {
    const game = await getRegisterGameDetail(game_id);
    if (game.data?.register_state === 1) { complete(); return true; }
    return false;
  };
  useEffect(() => {
    if (!open || !taskId || state !== "processing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 120000;
    const poll = async () => {
      try {
        const task = await getApprovalTask(taskId);
        if (cancelled) return;
        if (task.status === "FAILURE") { setState("failed"); return; }
        if (task.status === "SUCCESS" || task.status === "SKIPPED") {
          const game = await getRegisterGameDetail(game_id);
          if (cancelled) return;
          const validResult = task.status === "SKIPPED" || (task.result?.status === "success" && task.result.game_id === game_id);
          if (validResult && game.data?.register_state === 1) complete(); else setState("delayed");
          return;
        }
      } catch { if (!cancelled) { setState("delayed"); return; } }
      if (cancelled) return;
      if (Date.now() >= deadline) { setState("delayed"); return; }
      timer = setTimeout(poll, 3000);
    };
    timer = setTimeout(poll, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, taskId, state, game_id]);
  const approve = async () => {
    if (busy.current || state !== "idle") return;
    busy.current = true; setState("processing");
    try {
      const response = await approveRegisterGame(game_id);
      if (response.data?.task_id) setTaskId(response.data.task_id); else setState("delayed");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 406) { try { if (!await check()) setState("delayed"); } catch { setState("delayed"); } }
      else setState("delayed");
    } finally { busy.current = false; }
  };
  return <><SpartaButton content="승인" size="medium" onClick={() => setOpen(true)} />
    <SpartaModal isOpen={open} modalId={`approve-${game_id}`} title="게임 승인" onClose={() => setOpen(false)}>
      <div className="text-white space-y-4 max-w-xl">
        <p>대상: {detail.data?.data?.title || `게임 #${game_id}`}</p>
        <p role="status">{state === "complete" ? "공개 완료" : state === "processing" ? "승인 처리중" : state === "failed" ? "공개 처리에 실패했습니다." : state === "delayed" ? "처리가 지연되고 있습니다. 목록에서 상태를 확인해주세요." : "게임 내용을 확인한 후 승인해주세요."}</p>
        <p>모달을 닫아도 서버 처리는 취소되지 않습니다.</p>
        <button disabled={state !== "idle"} onClick={approve}>승인</button>
        <button className="ml-6" disabled={busy.current} onClick={async () => { try { if (!await check()) setState("delayed"); } catch { setState("delayed"); } }}>상태 확인</button>
        <button className="ml-6" onClick={() => setOpen(false)}>닫기</button>
      </div>
    </SpartaModal></>;
}
