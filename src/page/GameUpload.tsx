import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Note from "../components/gameUploadComponents/Note";
import GameUploadForm from "../components/gameUploadComponents/GameUploadForm";
import RejectionPanel from "../components/gameUploadComponents/RejectionPanel";
import { getGameDetail } from "../api/game";
import { TGamePlayDataResponse } from "../types";
import { userStore } from "../share/store/userStore";
export default function GameUpload() {
  const { gameId } = useParams();
  const { userData } = userStore();
  const [note, setNote] = useState({ 1: false, 2: false, 3: false });
  const query = useQuery<TGamePlayDataResponse>({
    queryKey: ["gameDetail", Number(gameId), userData?.data.user_id],
    queryFn: () => getGameDetail(Number(gameId)),
    enabled: !!gameId,
    refetchOnMount: "always",
  });
  if (!userData) return <p role="status">로그인 정보를 확인하는 중입니다.</p>;
  if (gameId && query.isPending) return <p role="status">등록 내용을 불러오는 중입니다.</p>;
  if (gameId && query.isError)
    return (
      <p role="alert">
        등록 내용을 불러오지 못했습니다. <button onClick={() => query.refetch()}>다시 시도</button>
      </p>
    );
  if (gameId && query.data?.data.maker_data.id !== userData?.data.user_id)
    return <p role="alert">본인의 게임만 수정할 수 있습니다.</p>;
  return (
    <main>
      <h1 className="my-8 text-center text-white text-2xl font-DungGeunMo">{gameId ? "게임 수정" : "게임 등록"}</h1>
      {gameId ? (
        <p className="text-white">게임 파일을 변경하면 다시 검수합니다. 검수 중에는 공개 목록에서 제외됩니다.</p>
      ) : (
        <Note state={note} onClickHandler={(key) => setNote((value) => ({ ...value, [key]: !value[key] }))} />
      )}
      {query.data?.data.register_state === 2 && <RejectionPanel gameId={Number(gameId)} />}
      <GameUploadForm
        key={gameId || "new"}
        note={note}
        previousGameData={gameId ? query.data?.data : undefined}
        isEditMode={!!gameId}
      />
    </main>
  );
}
