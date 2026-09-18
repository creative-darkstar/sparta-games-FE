import { useState } from "react";
export function useSaveVerification() {
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const verify = async (read: () => Promise<{ data: Record<string, unknown> }>, draft: Record<string, unknown>) => {
    setChecking(true); setMessage("저장 결과를 확인하고 있습니다.");
    try {
      const current = await read();
      const labels: Record<string, string> = { title: "제목", content: "설명", contact: "연락처", purpose: "목적", duration: "기간", meeting_type: "진행 방식" };
      const matched = Object.keys(labels).filter(key => draft[key] !== undefined && current.data?.[key] === draft[key]).map(key => labels[key]);
      setMessage(matched.length ? `${matched.join(", ")} 항목이 제출값과 일치합니다. 이미지 처리 결과와 나머지 항목은 상세에서 확인해주세요. 입력 내용은 유지됩니다.` : "저장 여부를 확인하지 못했습니다. 상세에서 현재 내용을 확인해주세요. 입력 내용은 유지됩니다.");
    } catch { setMessage("저장 여부를 확인하지 못했습니다. 상세에서 현재 내용을 확인해주세요. 입력 내용은 유지됩니다."); }
    finally { setChecking(false); }
  };
  return { message, setMessage, checking, verify };
}
