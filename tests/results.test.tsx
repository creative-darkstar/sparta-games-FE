import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import MyPage from "../src/page/MyPage";
import GameUpload from "../src/page/GameUpload";
import { getUserGameMadeList } from "../src/api/user";
import { getGameDetail } from "../src/api/game";
const fixtureUser = vi.hoisted(() => ({ user_id: 1, nickname: "메이커" }));
vi.mock("../src/share/store/userStore", () => ({ userStore: () => ({ userData: { data: fixtureUser } }) }));
vi.mock("../src/api/user", () => ({ getUserGameMadeList: vi.fn(), getUserGameList: vi.fn(), getUserData: vi.fn() }));
vi.mock("../src/api/game", () => ({ getGameDetail: vi.fn() }));
vi.mock("../src/components/mypageComponents/ProfileHeader", () => ({ default: () => null }));
vi.mock("../src/components/mypageComponents/Logs", () => ({ default: () => null }));
vi.mock("../src/components/mypageComponents/Settting", () => ({ default: () => null }));
vi.mock("../src/components/communityComponents/TeamBuilding/Profile/ProfileDetail", () => ({ default: () => null }));
vi.mock("../src/components/gameUploadComponents/GameUploadForm", () => ({
  default: ({ previousGameData }: { previousGameData?: { title: string } }) => (
    <div>복구된 폼: {previousGameData?.title}</div>
  ),
}));
beforeEach(() => {
  vi.mocked(getUserGameMadeList)
    .mockReset()
    .mockResolvedValue({ data: [], pagination: { count: 0 } });
  vi.mocked(getGameDetail).mockReset();
});
function mount(path: string, state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: "/my-page/:id", element: <MyPage /> },
      { path: "/game-edit/:gameId", element: <GameUpload /> },
    ],
    {
      initialEntries: [
        { pathname: path.split("?")[0], search: path.includes("?") ? "?" + path.split("?")[1] : "", state },
      ],
    },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router };
}
it("U04/U14: review banner survives list failure and consumes router state", async () => {
  vi.mocked(getUserGameMadeList).mockRejectedValue(new Error());
  const { router } = mount("/my-page/1?tab=develop", { gameResult: "review" });
  expect(await screen.findByText("검수 요청 완료")).toBeTruthy();
  expect(screen.getByText(/관리자 검수 결과는 알림으로 안내합니다/)).toBeTruthy();
  await screen.findByText("검수 요청은 완료되었지만 목록을 불러오지 못했습니다.");
  expect(router.state.location.state).toBeNull();
  expect(screen.getByRole("button", { name: "목록 다시 불러오기" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(screen.queryByText("검수 요청 완료")).toBeNull();
});
it("U11: direct edit URL recovers data, rejects non-owner, never shows a blank new form", async () => {
  vi.mocked(getGameDetail).mockResolvedValue({
    data: { title: "복구 게임", maker_data: { id: 1 }, register_state: 1 },
  });
  const view = mount("/game-edit/42");
  await screen.findByText("복구된 폼: 복구 게임");
  expect(getGameDetail).toHaveBeenCalledWith(42);
  view.unmount();
  vi.mocked(getGameDetail).mockResolvedValue({
    data: { title: "다른 게임", maker_data: { id: 9 }, register_state: 1 },
  });
  mount("/game-edit/99");
  await screen.findByText("본인의 게임만 수정할 수 있습니다.");
  expect(screen.queryByText(/복구된 폼/)).toBeNull();
});
it("U22: empty developer list is a normal state", async () => {
  mount("/my-page/1?tab=develop");
  await waitFor(() => expect(screen.getByText("개발중인 게임이 없습니다.")).toBeTruthy());
  expect(screen.queryByRole("alert")).toBeNull();
});
