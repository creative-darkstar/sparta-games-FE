import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import SpartaPagination from "../../../spartaDesignSystem/SpartaPagination";
import { Link, useParams } from "react-router-dom";
import log from "../../../assets/Log.svg";
import { TTeamBuildPostListItem, TTeamBuildPostResponse } from "../../../types";
import CardList from "./CardList";
import { getUserTeambuildPosts } from "../../../api/user";

type Props = {
  userTeamBuildPost: TTeamBuildPostListItem[] | undefined;
  isMyPage?: boolean | null;
};

export default function TeamBuildLogModal({ userTeamBuildPost, isMyPage }: Props) {
  const COUNT_PER_PAGE = 4;

  const { id } = useParams();
  const [page, setPage] = useState<number>(1);

  const { data, isPending, isError, refetch } = useQuery<TTeamBuildPostResponse>({
    queryKey: ["userteamBuildingPost", Number(id), page],
    queryFn: () => getUserTeambuildPosts(Number(id), COUNT_PER_PAGE, page, isMyPage),
  });

  const teambuildPosts = data?.data.teambuild_posts;
  const dataTotalCount = data?.pagination.count;

  return (
    <div className="flex flex-col gap-6 overflow-hidden w-[1168px]">
      <div className="flex items-center gap-4 justify-start ">
        <img src={log} />
        <p className="font-DungGeunMo text-heading-32 text-white font-[400]">
          {userTeamBuildPost && userTeamBuildPost[0]?.author_data.nickname}의 팀빌딩 게시글
        </p>
      </div>
      {isPending && <p role="status">팀빌딩 활동을 불러오는 중입니다.</p>}
      {isError && (
        <p role="alert">
          팀빌딩 활동을 불러오지 못했습니다. <button onClick={() => refetch()}>다시 시도</button>
        </p>
      )}
      {!isPending && !isError && !teambuildPosts?.length && (
        <p className="text-white">아직 등록된 팀빌딩 모집글이 없습니다.</p>
      )}
      <div className="grid grid-cols-4 gap-5">
        {teambuildPosts?.map((post, idx) => (
          <div key={idx} className="cursor-pointer">
            <Link to={`/community/team-building/team-recruit/${post.id}`}>
              <CardList postType="teamBuild" post={post} />
            </Link>
          </div>
        ))}
      </div>

      <SpartaPagination
        dataTotalCount={dataTotalCount}
        countPerPage={COUNT_PER_PAGE}
        onChangePage={(_e, page) => setPage(page)}
      />
    </div>
  );
}
