import { useQuery } from "@tanstack/react-query";
import { getUserGameList, getUserGameMadeList } from "../../api/user";
import { TApiResponse, TGameData, TUserData } from "../../types";
import MyGameCard from "./MyGameCard";
import log from "../../assets/Log.svg";
import { useState } from "react";
import SpartaPagination from "../../spartaDesignSystem/SpartaPagination";
import { AxiosError } from "axios";

type TMyGameProps = {
  submissionComplete?: boolean;
  user: TUserData;
  isMyPage: boolean | null;
};

const MyGame = (props: TMyGameProps) => {
  const [page, setPage] = useState<number>(1);
  const mode = props.isMyPage === null ? "loading" : props.isMyPage ? "owner" : "public";
  //* Hooks
  const { data, isPending, isError, error, refetch } = useQuery<TApiResponse<(TGameData & { register_state: number })[]>>({
    queryKey: ["myGameList", props.user.user_id, mode, page],
    enabled: mode !== "loading",
    refetchOnMount: "always",
    refetchInterval: (query) =>
      props.isMyPage && query.state.data?.data.some((game) => game.register_state === 0) ? 30000 : false,
    queryFn: () => (props.isMyPage ? getUserGameMadeList(props.user.user_id, page) : getUserGameList(props.user.user_id, page)),
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
          {error instanceof AxiosError && error.response?.status === 401 ? "로그인 상태를 확인해주세요." : props.submissionComplete
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
