import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MyGame from "../src/components/mypageComponents/MyGame";
import { getUserGameList, getUserGameMadeList } from "../src/api/user";
import { TUserData } from "../src/types";

// F04: 인증 복원 중 공개 목록 결과가 본인 목록 캐시로 쓰이지 않는지 확인한다.
vi.mock("../src/api/user", () => ({
  getUserGameList: vi.fn(),
  getUserGameMadeList: vi.fn(),
}));
vi.mock("../src/components/mypageComponents/MyGameCard", () => ({
  default: ({ item }: { item: { title: string } }) => <p>{item.title}</p>,
}));

const user = { user_id: 5, nickname: "maker" } as TUserData;
const page = (titles: string[]) => ({
  status: "success",
  data: titles.map((title, index) => ({ id: index + 1, title, register_state: 0 })),
  pagination: { count: titles.length },
});

beforeEach(() => {
  vi.mocked(getUserGameList).mockReset().mockResolvedValue(page([]));
  vi.mocked(getUserGameMadeList).mockReset().mockResolvedValue(page(["검수 중 게임"]));
});

function view(client: QueryClient, isMyPage: boolean | null) {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/my-page/5"]}>
        <Routes>
          <Route path="/my-page/:id" element={<MyGame user={user} isMyPage={isMyPage} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

it("인증 복원 중(isMyPage=null)에는 어떤 목록도 조회하지 않는다", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(view(client, null));
  await act(async () => {});
  expect(getUserGameList).not.toHaveBeenCalled();
  expect(getUserGameMadeList).not.toHaveBeenCalled();
});

it("공개 조회 결과(빈 목록)가 본인 조회로 바뀌어도 캐시로 재사용되지 않는다", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { rerender } = render(view(client, false));
  await act(async () => {});
  expect(await screen.findByText("개발중인 게임이 없습니다.")).toBeTruthy();
  rerender(view(client, true));
  expect(await screen.findByText("검수 중 게임")).toBeTruthy();
  expect(getUserGameMadeList).toHaveBeenCalledWith(5, 1);
});

it("본인 목록 API가 실패하면 빈 목록이 아니라 오류로 표시한다", async () => {
  vi.mocked(getUserGameMadeList).mockRejectedValue(new Error("500"));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(view(client, true));
  expect(await screen.findByText(/목록을 불러오지 못했습니다/)).toBeTruthy();
  expect(screen.queryByText("개발중인 게임이 없습니다.")).toBeNull();
});
