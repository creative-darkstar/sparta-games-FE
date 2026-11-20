import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useNotifications } from "../src/hook/useNotifications";
import AlarmModal from "../src/components/headerComponents/AlarmModal";
import { getAlarm, patchReadAlarm } from "../src/api/alarm";
vi.mock("../src/share/store/userStore", () => ({ userStore: () => ({ userData: { data: { user_id: 1 } } }) }));
vi.mock("../src/api/alarm", () => ({ getAlarm: vi.fn(), patchReadAlarm: vi.fn() }));
const alarm = {
  id: 9,
  content_id: 42,
  is_read: false,
  message: "반려",
  noti_type: "게임",
  create_dt: new Date().toISOString(),
};
const response = (data = [alarm], next: string | null = null) => ({
  status: "success",
  data,
  pagination: { count: data.length, next, previous: null },
  message: null,
  error_code: null,
});
let socket: { onmessage?: (event: { data: string }) => void };
beforeEach(() => {
  vi.stubEnv("VITE_PROXY_HOST", "https://api.example.test/");
  sessionStorage.setItem("accessToken", "test-token");
  vi.stubGlobal(
    "WebSocket",
    class {
      onmessage?: (event: { data: string }) => void;
      close() {}
      constructor() {
        socket = { onmessage: (event) => this.onmessage?.(event) };
      }
    },
  );
  vi.mocked(getAlarm).mockReset().mockResolvedValue(response());
  vi.mocked(patchReadAlarm).mockReset().mockResolvedValue({ status: "success" });
});
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  };
}
it("U15/U16: unread presence derives from loaded pages and failed read leaves it unread", async () => {
  const context = wrapper();
  const { result } = renderHook(useNotifications, context);
  await waitFor(() => expect(result.current.hasUnread).toBe(true));
  vi.mocked(patchReadAlarm).mockRejectedValueOnce(new Error());
  await act(async () => {
    await expect(result.current.handleAlarmClick(9)).rejects.toThrow();
  });
  expect(result.current.hasUnread).toBe(true);
  vi.mocked(getAlarm).mockResolvedValue(response([{ ...alarm, is_read: true }]));
  await act(async () => {
    await result.current.handleAlarmClick(9);
  });
  await waitFor(() => expect(result.current.hasUnread).toBe(false));
});
it("U15: duplicate socket IDs are not appended twice and invalidate game caches", async () => {
  const context = wrapper();
  renderHook(useNotifications, context);
  await waitFor(() => expect(getAlarm).toHaveBeenCalled());
  const invalidate = vi.spyOn(context.client, "invalidateQueries");
  await act(async () => {
    socket.onmessage?.({ data: JSON.stringify(alarm) });
    socket.onmessage?.({ data: JSON.stringify(alarm) });
  });
  const data = context.client.getQueryData<{ pages: { data: (typeof alarm)[] }[] }>(["alarm", 1]);
  expect(data?.pages.flatMap((page) => page.data).filter((item) => item.id === 9)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["gameLog"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["gameDetail"] });
});
it("U16: empty and error are different states; next-page failure is retryable", async () => {
  vi.mocked(getAlarm).mockResolvedValueOnce(response([]));
  const context = wrapper();
  const view = render(<AlarmModal modalClose={vi.fn()} handleAlarmClick={vi.fn()} />, context);
  await screen.findByText("아직 받은 알림이 없습니다.");
  view.unmount();
  vi.mocked(getAlarm).mockRejectedValue(new Error());
  render(<AlarmModal modalClose={vi.fn()} handleAlarmClick={vi.fn()} />, wrapper());
  await screen.findByText("알림을 불러오지 못했습니다.");
  expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
});
it("U16: loads another page and deduplicates overlapping IDs", async () => {
  vi.mocked(getAlarm)
    .mockResolvedValueOnce(response([alarm], "/commons/api/alarm/?page=2"))
    .mockResolvedValueOnce(response([alarm, { ...alarm, id: 10, message: "승인" }]));
  render(<AlarmModal modalClose={vi.fn()} handleAlarmClick={vi.fn()} />, wrapper());
  fireEvent.click(await screen.findByRole("button", { name: "알림 더보기" }));
  await screen.findByText("승인");
  expect(screen.getAllByText("반려")).toHaveLength(1);
});
