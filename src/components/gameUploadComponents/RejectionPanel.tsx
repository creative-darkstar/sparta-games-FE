import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRegisterGameRejectLog } from "../../api/direct";
export default function RejectionPanel({ gameId }: { gameId: number }) {
  const query = useQuery({ queryKey: ["gameLog", gameId], queryFn: () => getRegisterGameRejectLog(gameId), refetchOnMount: "always" });
  return <details open className="p-5 my-4 rounded bg-gray-800 text-white">
    <summary>반려 사유</summary>
    {query.isPending ? <p role="status">사유를 불러오는 중입니다.</p> : query.isError ? <p role="alert">반려 사유를 불러오지 못했습니다. <button onClick={() => query.refetch()}>다시 시도</button></p> : <p className="whitespace-pre-wrap">{query.data?.data?.content || "등록된 반려 사유가 없습니다."}</p>}
    <Link to={`/game-edit/${gameId}`}>파일 수정 후 재검수 요청</Link>
  </details>;
}
