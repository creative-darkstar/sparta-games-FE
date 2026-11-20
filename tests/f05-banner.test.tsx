import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import MyPage from "../src/page/MyPage";
import { getUserGameMadeList } from "../src/api/user";
import { getZipValidationStatus } from "../src/api/zipValidation";

// F05: 접수 배너가 같은 제출의 최신 ZIP 검증 결과로 갱신되는지 확인한다.
const fixtureUser = vi.hoisted(() => ({ user_id: 1, nickname: "메이커" }));
vi.mock("../src/share/store/userStore", () => ({
  userStore: () => ({ userData: { data: fixtureUser }, authStatus: "authenticated" }),
}));
vi.mock("../src/api/user", () => ({ getUserGameMadeList: vi.fn(), getUserGameList: vi.fn(), getUserData: vi.fn() }));
vi.mock("../src/api/zipValidation", () => ({ getZipValidationStatus: vi.fn() }));
vi.mock("../src/components/mypageComponents/ProfileHeader", () => ({ default: () => null }));
vi.mock("../src/components/mypageComponents/Logs", () => ({ default: () => null }));
vi.mock("../src/components/mypageComponents/Settting", () => ({ default: () => null }));
vi.mock("../src/components/communityComponents/TeamBuilding/Profile/ProfileDetail", () => ({ default: () => null }));

beforeEach(() => {
  vi.mocked(getUserGameMadeList).mockReset().mockResolvedValue({ data: [], pagination: { count: 0 } });
  vi.mocked(getZipValidationStatus).mockReset();
});

function mount(state: unknown) {
  const router = createMemoryRouter([{ path: "/my-page/:id", element: <MyPage /> }], {
    initialEntries: [{ pathname: "/my-page/1", search: "?tab=develop", state }],
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

it("검증 성공 결과로 접수 배너 문구가 갱신된다", async () => {
  vi.mocked(getZipValidationStatus).mockResolvedValue({
    task_id: "t-15",
    status: "SUCCESS",
    lookup_status: "ok",
    result: {
      kind: "game_zip_validation",
      schema_version: 1,
      game_id: 15,
      file_key: "zips/x.zip",
      outcome: "valid",
      reason_code: null,
      reason: null,
    },
  });
  mount({ gameResult: "review", gameId: 15, taskId: "t-15" });
  expect(await screen.findByText("검수 요청 완료")).toBeTruthy();
  expect(await screen.findByText("게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다.")).toBeTruthy();
  expect(getZipValidationStatus).toHaveBeenCalledWith("t-15", 15);
});

it("검증 실패 결과로 접수 배너에 실패와 사유가 표시된다", async () => {
  vi.mocked(getZipValidationStatus).mockResolvedValue({
    task_id: "t-15",
    status: "SUCCESS",
    lookup_status: "ok",
    result: {
      kind: "game_zip_validation",
      schema_version: 1,
      game_id: 15,
      file_key: "zips/x.zip",
      outcome: "invalid",
      reason_code: "INVALID_ZIP",
      reason: "Build 폴더가 없습니다.",
    },
  });
  mount({ gameResult: "review", gameId: 15, taskId: "t-15" });
  expect(await screen.findByText("게임 파일 검증에 실패했습니다.")).toBeTruthy();
  expect(screen.getByText("사유: Build 폴더가 없습니다.")).toBeTruthy();
});
