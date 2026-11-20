import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getUserRecentGameList, getUserLikedGameList } from "../../api/user";
import { TGameDataResponse } from "../../types";
import log from "../../assets/Log.svg";
import SpartaPagination from "../../spartaDesignSystem/SpartaPagination";
import { Link } from "react-router-dom";
import GameCard from "../homeComponents/GameCard";

type Props = {
  user_name: string;
  user_id: number;
  recent: boolean;
};

const MypageLogModal = ({ user_name, user_id, recent }: Props) => {
  const [page, setPage] = useState<number>(1);
  const myRecentGameData = useQuery<TGameDataResponse>({
    queryKey: ["myRecentGameList", user_id, page],
    queryFn: () => getUserRecentGameList(user_id, page),
  });

  const myLikedData = useQuery<TGameDataResponse>({
    queryKey: ["myLikesList", user_id, page],
    queryFn: () => getUserLikedGameList(user_id, page),
  });

  const recentGameData = myRecentGameData.data && myRecentGameData.data?.data;
  const recentGameCount = myRecentGameData.data && myRecentGameData.data?.pagination.count;

  const likedData = myLikedData.data && myLikedData.data?.data;
  const likedCount = myLikedData.data && myLikedData.data?.pagination.count;

  const data = recent ? recentGameData : likedData;
  const query = recent ? myRecentGameData : myLikedData;

  return (
    <div className="flex flex-col gap-6 overflow-hidden w-[1170px]">
      <div className="flex items-center gap-4 justify-start ">
        <img src={log} />
        <p className="font-DungGeunMo text-heading-32 text-white font-[400]">
          {user_name}의 {recent ? "Playlist" : "Bookmark"}
        </p>
      </div>
      {query.isPending && <p role="status">목록을 불러오는 중입니다.</p>}
      {query.isError && (
        <p role="alert">
          목록을 불러오지 못했습니다. <button onClick={() => query.refetch()}>다시 시도</button>
        </p>
      )}
      {!query.isPending && !query.isError && !data?.length && (
        <p className="text-white">{recent ? "최근 플레이한 게임이 없습니다." : "즐겨찾기한 게임이 없습니다."}</p>
      )}
      <div className="flex gap-3">
        {data?.map((item, idx) => (
          <div key={idx} className="cursor-pointer">
            <Link to={`/game-detail?id=${item.id}`}>
              <GameCard item={item} />
            </Link>
          </div>
        ))}
      </div>
      <SpartaPagination
        dataTotalCount={recent ? recentGameCount : likedCount}
        countPerPage={4}
        onChangePage={(_e, page) => setPage(page)}
      />
    </div>
  );
};

export default MypageLogModal;
