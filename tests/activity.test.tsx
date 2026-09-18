import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Logs from "../src/components/mypageComponents/Logs";
import TeamBuildLogModal from "../src/components/communityComponents/TeamBuilding/TeamBuildLogModal";
import { getUserLikedGameList, getUserRecentGameList, getUserTeambuildPosts } from "../src/api/user";
import { TUserData } from "../src/types";
vi.mock("../src/api/user", () => ({
  getUserLikedGameList: vi.fn(),
  getUserRecentGameList: vi.fn(),
  getUserTeambuildPosts: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getUserLikedGameList).mockResolvedValue({ data: [] });
  vi.mocked(getUserRecentGameList).mockResolvedValue({ data: [] });
  vi.mocked(getUserTeambuildPosts).mockResolvedValue({ data: { teambuild_posts: [] }, pagination: { count: 0 } });
});
const user = { user_id: 1, nickname: "메이커" } as TUserData;
function mount(component: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
}
it("U22: empty favorites and recent games are normal", async () => {
  mount(<Logs user={user} />);
  await screen.findByText("즐겨찾기한 게임이 없습니다.");
  await screen.findByText("최근 플레이한 게임이 없습니다.");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("U22: request failure has a retry action instead of empty data copy", async () => {
  vi.mocked(getUserLikedGameList).mockRejectedValue(new Error());
  mount(<Logs user={user} />);
  await screen.findByRole("button", { name: "즐겨찾기 다시 시도" });
  expect(screen.queryByText("즐겨찾기한 게임이 없습니다.")).toBeNull();
});
it("U22: empty team activity is normal", async () => {
  mount(<TeamBuildLogModal userTeamBuildPost={[]} />);
  await screen.findByText("아직 등록된 팀빌딩 모집글이 없습니다.");
  expect(screen.queryByRole("alert")).toBeNull();
});
