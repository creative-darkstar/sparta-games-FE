import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { uploadGameZip } from "../api/upload";
import { postGameList, putGameList } from "../api/game";
import { UploadStage } from "../types";
export function useGameUpload() {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  const cached = useRef<{ file: File; key: string } | null>(null);
  const invalidateFile = () => {
    cached.current = null;
    setProgress(null);
    setMessage("");
  };
  const submit = async (form: FormData, file: File | null, gameId?: number) => {
    if (running.current || stage === "uncertain") return false;
    running.current = true;
    setMessage("");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    let phase: "uploading" | "submitting" = "uploading";
    try {
      if (file) {
        setStage("uploading");
        if (cached.current?.file !== file)
          cached.current = { file, key: await uploadGameZip(file, setProgress, signal) };
        form.set("gamefile", cached.current.key);
      }
      phase = "submitting";
      setStage("submitting");
      const result = gameId ? await putGameList(form, gameId, signal) : await postGameList(form, signal);
      if (signal.aborted) return false;
      if (!["success", "warning"].includes(result.data.status)) {
        setStage("failed");
        setMessage("입력 조건을 확인해주세요. 요청을 완료하지 못했습니다.");
        return false;
      }
      setStage("completed");
      return true;
    } catch (error) {
      if (signal.aborted) return false;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (phase === "submitting" && (!status || status >= 500 || status === 408)) {
        setStage("uncertain");
        setMessage("요청 결과를 확인하지 못했습니다. 개발목록에서 등록 여부를 먼저 확인해주세요.");
      } else {
        setStage("failed");
        setMessage(
          phase === "uploading"
            ? "파일 업로드에 실패했습니다. 연결 상태를 확인하고 다시 시도해주세요."
            : status === 401
              ? "로그인 상태를 확인해주세요."
              : status === 403
                ? "요청 권한이 없습니다."
                : "입력값과 파일 조건을 확인해주세요. 요청을 완료하지 못했습니다.",
        );
      }
      return false;
    } finally {
      running.current = false;
    }
  };
  return { stage, progress, message, submit, invalidateFile, pending: stage === "uploading" || stage === "submitting" };
}
