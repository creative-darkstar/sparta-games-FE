import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useController } from "react-hook-form";
import GameUploadForm from "../src/components/gameUploadComponents/GameUploadForm";
import { validateGameZip } from "../src/util/gameZipValidation";

// F02: 신규 등록에서 입력 순서와 무관하게 조건 충족 시 버튼이 활성화되는지 확인한다.
vi.mock("../src/share/store/userStore", () => ({ userStore: () => ({ userData: { data: { user_id: 1 } } }) }));
// 실제 브라우저처럼 ZIP 검사가 비동기로 늦게 끝나도록 지연시킨다(즉시 resolve하면 결함이 재현되지 않음).
const slowCheck = () => new Promise<void>((resolve) => setTimeout(resolve, 30));
vi.mock("../src/util/gameZipValidation", () => ({ validateGameZip: vi.fn() }));
vi.mock("../src/api/upload", () => ({ uploadGameZip: vi.fn().mockResolvedValue("zips/test.zip") }));
vi.mock("../src/api/game", () => ({
  postGameList: vi.fn().mockResolvedValue({ data: { status: "success", data: { game_id: 1, task_id: "t" } } }),
  putGameList: vi.fn().mockResolvedValue({ data: { status: "success", data: { game_id: 1, task_id: null } } }),
}));
vi.mock("react-quill", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="게임 설명" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("../src/spartaDesignSystem/SpartaChipSelect", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ control, name, rules }: any) => {
    const { field } = useController({ control, name, rules });
    return (
      <select aria-label="장르" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
        <option value="">선택</option>
        <option value="액션">액션</option>
      </select>
    );
  },
}));

beforeEach(() => {
  vi.mocked(validateGameZip).mockReset().mockImplementation(slowCheck);
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: "/", element: <GameUploadForm previousGameData={undefined} isEditMode={false} note={{ 1: true, 2: true, 3: true }} /> },
    { path: "/my-page/:id", element: <div>개발목록</div> },
  ]);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const submitButton = () => screen.getByRole("button", { name: "검수 요청" }) as HTMLButtonElement;

async function fillZip(name = "game.zip") {
  await act(async () =>
    fireEvent.change(screen.getByLabelText(/게임 파일 (선택|변경)/), { target: { files: [new File(["zip"], name)] } }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
}
async function fillThumbnail() {
  await act(async () =>
    fireEvent.change(document.getElementById("gameThumbnail")!, {
      target: { files: [new File(["img"], "thumb.png", { type: "image/png" })] },
    }),
  );
}
async function fillText() {
  await act(async () => fireEvent.change(screen.getByLabelText("제목 · 필수"), { target: { value: "게임" } }));
  await act(async () => fireEvent.change(screen.getByLabelText("장르"), { target: { value: "액션" } }));
  await act(async () => fireEvent.change(screen.getByLabelText("게임 설명"), { target: { value: "<p>설명</p>" } }));
}

it("ZIP을 마지막에 선택해도 추가 입력 없이 활성화된다", async () => {
  mount();
  await fillText();
  await fillThumbnail();
  expect(submitButton().disabled).toBe(true);
  await fillZip();
  expect(submitButton().disabled).toBe(false);
});

it("ZIP을 먼저 선택해도 나머지 입력 후 활성화된다", async () => {
  mount();
  await fillZip();
  await fillText();
  await fillThumbnail();
  expect(submitButton().disabled).toBe(false);
});

it("썸네일을 마지막에 선택해도 활성화된다", async () => {
  mount();
  await fillZip();
  await fillText();
  expect(submitButton().disabled).toBe(true);
  await fillThumbnail();
  expect(submitButton().disabled).toBe(false);
});

it("비활성 사유를 실제 누락 조건으로 표시한다", async () => {
  mount();
  expect(screen.getByText(/제목을 입력해주세요/)).toBeTruthy();
  expect(screen.getByRole("list", { name: "제출할 수 없는 이유" }).textContent).toContain("게임 파일을 선택해주세요.");
  await fillText();
  await fillThumbnail();
  expect(screen.queryByText(/제목을 입력해주세요/)).toBeNull();
  vi.mocked(validateGameZip).mockRejectedValueOnce(new Error("Build 폴더가 없습니다."));
  await fillZip("bad.zip");
  expect(screen.getByText(/게임 파일 검사에 실패했습니다/)).toBeTruthy();
  expect(submitButton().disabled).toBe(true);
});
