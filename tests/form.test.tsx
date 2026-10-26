import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GameUploadForm from "../src/components/gameUploadComponents/GameUploadForm";
import { validateGameZip } from "../src/util/gameZipValidation";
import { uploadGameZip } from "../src/api/upload";
import { postGameList, putGameList } from "../src/api/game";
import { TGamePlayData } from "../src/types";
vi.mock("../src/share/store/userStore", () => ({ userStore: () => ({ userData: { data: { user_id: 1 } } }) }));
vi.mock("../src/util/gameZipValidation", () => ({ validateGameZip: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../src/api/upload", () => ({ uploadGameZip: vi.fn().mockResolvedValue("zips/test.zip") }));
vi.mock("../src/api/game", () => ({
  postGameList: vi.fn().mockResolvedValue({ data: { status: "success" } }),
  putGameList: vi.fn().mockResolvedValue({ data: { status: "success" } }),
}));
vi.mock("react-quill", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="게임 설명" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("../src/spartaDesignSystem/SpartaChipSelect", () => ({ default: () => null }));
const existing = {
  id: 42,
  title: "기존 게임",
  category: [{ name: "액션", id: 1 }],
  content: "설명",
  thumbnail: "https://example.test/image.png",
  screenshot: [{ id: 7, src: "https://example.test/screen.png" }],
  register_state: 1,
} as TGamePlayData;
beforeEach(() => {
  vi.mocked(validateGameZip).mockReset().mockResolvedValue(undefined);
});
function mount(game: TGamePlayData | null = existing, note = { 1: true, 2: true, 3: true }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: "/", element: <GameUploadForm previousGameData={game || undefined} isEditMode={!!game} note={note} /> },
    { path: "/my-page/:id", element: <div>개발목록</div> },
    { path: "/other", element: <div>다른 화면</div> },
  ]);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
it("U01/U10: rejected edit requires a new ZIP; unagreed new form cannot submit", async () => {
  mount({ ...existing, register_state: 2 });
  expect((screen.getByRole("button", { name: "재검수 요청" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("새 게임 파일을 선택해주세요.")).toBeTruthy();
});
it("U03: slow previous validation never overwrites a newer file", async () => {
  let resolveOld!: () => void;
  vi.mocked(validateGameZip).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  mount();
  const input = screen.getByLabelText("게임 파일 변경");
  await act(async () => fireEvent.change(input, { target: { files: [new File(["old"], "old.zip")] } }));
  await act(async () => fireEvent.change(input, { target: { files: [new File(["new"], "new.zip")] } }));
  await act(async () => resolveOld());
  expect(screen.getByTitle("new.zip")).toBeTruthy();
  expect(screen.queryByTitle("old.zip")).toBeNull();
  await act(async () => fireEvent.change(input, { target: { files: [] } }));
  expect(screen.getByTitle("new.zip")).toBeTruthy();
});
it("U09/U12: metadata edit opens summary without phrase and retains screenshots", async () => {
  const router = mount();
  await act(async () => {});
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "변경사항 저장" })));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.queryByPlaceholderText(/입력/)).toBeNull();
  await act(async () => fireEvent.click(screen.getAllByRole("button", { name: "변경사항 저장" })[1]));
  expect(putGameList).toHaveBeenCalled();
  const form = vi.mocked(putGameList).mock.calls[0][0];
  expect(form.has("gamefile")).toBe(false);
  expect(form.getAll("old_screenshots")).toEqual(["7"]);
  expect(router.state.location.state).toEqual({ gameResult: "saved" });
});
it("U13: SPA navigation is guarded while uploading", async () => {
  let finish!: (key: string) => void;
  vi.mocked(uploadGameZip).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const router = mount();
  await act(async () =>
    fireEvent.change(screen.getByLabelText("게임 파일 변경"), { target: { files: [new File(["data"], "game.zip")] } }),
  );
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "재검수 요청" })));
  await act(async () => fireEvent.click(screen.getAllByRole("button", { name: "재검수 요청" })[1]));
  await act(async () => {
    void router.navigate("/other");
  });
  expect(screen.getByRole("dialog", { name: "업로드 중 이탈" })).toBeTruthy();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "계속 작성" })));
  await act(async () => finish("zips/test.zip"));
  expect(router.state.location.pathname).toBe("/my-page/1");
});
it("U01: missing inputs and agreement block new submission", async () => {
  mount(null, { 1: false, 2: false, 3: false });
  expect((screen.getByRole("button", { name: "검수 요청" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => fireEvent.change(screen.getByLabelText("게임 파일 선택"), { target: { files: [] } }));
  expect(postGameList).not.toHaveBeenCalled();
});
