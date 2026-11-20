import { useQuery } from "@tanstack/react-query";
import { getUserGameList, getUserGameMadeList } from "../../api/user";
import { TApiResponse, TGameData, TUserData } from "../../types";
import MyGameCard from "./MyGameCard";
import log from "../../assets/Log.svg";
import { useEffect, useState } from "react";
import SpartaPagination from "../../spartaDesignSystem/SpartaPagination";
import { useParams } from "react-router-dom";

type TMyGameProps = {
  submissionComplete?: boolean;
  user: TUserData;
  isMyPage: boolean | null;
};

const MyGame = (props: TMyGameProps) => {
  const [page, setPage] = useState<number>(1);
  const { id } = useParams();
  // F04: 본인(owner)/공개(public) 조회를 key에 넣어 캐시가 섞이지 않게 한다. 인증 복원 중(null)에는 조회하지 않는다.
  const mode = props.isMyPage ? "owner" : "public";
  const targetId = props.isMyPage ? props.user.user_id : Number(id);
  useEffect(() => setPage(1), [targetId, mode]);
  //* Hooks
  const { data, isPending, isError, refetch } = useQuery<
    TApiResponse<(TGameData & { register_state: number; zip_task_id?: string | null })[]>
  >({
    queryKey: ["myGameList", targetId, mode, page],
    enabled: props.isMyPage !== null,
    refetchOnMount: "always",
    refetchInterval: (query) =>
      props.isMyPage && query.state.data?.data.some((game) => game.register_state === 0) ? 30000 : false,
    queryFn: () => (props.isMyPage ? getUserGameMadeList(targetId, page) : getUserGameList(targetId, page)),
  });

  const gameData = (data && data?.data) || [];
  const totalCount = (data && data.pagination?.count) || 0;

  return (
    <div className="bg-gray-800 rounded-xl px-7 py-5 flex flex-col gap-4 justify-start items-center">
      <div className="flex  items-center gap-4 w-full mb-3 h-12">
        <img src={log} />
        <p className="font-DungGeunMo text-heading-32 text-white font-[400]">{props.user.nickname}의 개발중인 게임</p>
      </div>
      {/* 만든 게임 */}
      {isPending ? (
        <p role="status">목록을 불러오는 중입니다.</p>
      ) : isError ? (
        <p role="alert" className="text-white">
          {props.submissionComplete
            ? "검수 요청은 완료되었지만 목록을 불러오지 못했습니다."
            : "목록을 불러오지 못했습니다."}
          <button onClick={() => refetch()}>목록 다시 불러오기</button>
        </p>
      ) : gameData && gameData.length > 0 ? (
        gameData.map((game) => <MyGameCard key={game.id} item={game} />)
      ) : (
        <p className="text-white w-full text-center py-20 text-heading-20">개발중인 게임이 없습니다.</p>
      )}
      <SpartaPagination dataTotalCount={totalCount} countPerPage={3} onChangePage={(_e, page) => setPage(page)} />
    </div>
  );
};

export default MyGame;
