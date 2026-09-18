import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminGameApproveModal from "../src/components/adminComponents/AdminGameApproveModal";
import { approveRegisterGame, getApprovalTask, getRegisterGameDetail } from "../src/api/direct";
vi.mock("../src/api/direct", () => ({
  approveRegisterGame: vi.fn(),
  getApprovalTask: vi.fn(),
  getRegisterGameDetail: vi.fn(),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(approveRegisterGame)
    .mockReset()
    .mockResolvedValue({ data: { task_id: "task-1" } });
  vi.mocked(getApprovalTask).mockReset().mockResolvedValue({ status: "PENDING", result: null });
  vi.mocked(getRegisterGameDetail)
    .mockReset()
    .mockResolvedValue({ data: { title: "테스트 게임", register_state: 0 } });
});
async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <AdminGameApproveModal game_id={42} />
    </QueryClientProvider>,
  );
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "승인" })));
  await act(async () => fireEvent.click(screen.getAllByRole("button", { name: "승인" })[1]));
  return view;
}
it("U19: does not announce completion at 202 or while task pending", async () => {
  await mount();
  expect(screen.getByText("승인 처리중")).toBeTruthy();
  expect(screen.queryByText("공개 완료")).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByText("승인 처리중")).toBeTruthy();
  vi.mocked(getApprovalTask).mockResolvedValue({ status: "SUCCESS", result: { status: "success", game_id: 42 } });
  vi.mocked(getRegisterGameDetail).mockResolvedValue({ data: { register_state: 1 } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByText("공개 완료")).toBeTruthy();
});
it.each(["FAILURE", "SKIPPED", "SUCCESS"])("U20: handles %s without assuming publication", async (status) => {
  vi.mocked(getApprovalTask).mockResolvedValue({ status, result: null });
  await mount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.queryByText("공개 완료")).toBeNull();
  expect(
    screen.getByText(
      status === "FAILURE" ? "공개 처리에 실패했습니다." : "처리가 지연되고 있습니다. 목록에서 상태를 확인해주세요.",
    ),
  ).toBeTruthy();
});
it("U20: 406 checks existing state without resubmission", async () => {
  vi.mocked(approveRegisterGame).mockRejectedValue({ isAxiosError: true, response: { status: 406 } });
  await mount();
  expect(approveRegisterGame).toHaveBeenCalledOnce();
  expect(getRegisterGameDetail).toHaveBeenCalled();
  expect(screen.queryByText("공개 완료")).toBeNull();
});
it("U20: unknown/pending task stops after 2 minutes and modal close cleans polling", async () => {
  vi.mocked(getApprovalTask).mockResolvedValue({ status: "UNKNOWN", result: null });
  const view = await mount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(123000);
  });
  expect(screen.getByText("처리가 지연되고 있습니다. 목록에서 상태를 확인해주세요.")).toBeTruthy();
  const count = vi.mocked(getApprovalTask).mock.calls.length;
  view.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(getApprovalTask).toHaveBeenCalledTimes(count);
});
