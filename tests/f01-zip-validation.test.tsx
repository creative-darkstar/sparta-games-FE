import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ZipValidationStatus from "../src/components/gameUploadComponents/ZipValidationStatus";
import { getZipValidationStatus } from "../src/api/zipValidation";
import { toZipValidationErrorView, toZipValidationView } from "../src/util/zipValidationState";
import { TZipTaskStatusResponse } from "../src/types";

// F01: 서버 ZIP 검증 결과(valid)를 확인한 뒤에만 완료 안내를 표시한다.
vi.mock("../src/api/zipValidation", () => ({ getZipValidationStatus: vi.fn() }));

const TASK = "task-1";
const GAME = 15;
const result = (outcome: "valid" | "invalid" | "skipped", reason: string | null = null) => ({
  kind: "game_zip_validation" as const,
  schema_version: 1,
  game_id: GAME,
  file_key: "zips/x.zip",
  outcome,
  reason_code: null,
  reason,
});
const status = (s: string, extra: Partial<TZipTaskStatusResponse> = {}): TZipTaskStatusResponse => ({
  task_id: TASK,
  status: s,
  result: null,
  lookup_status: "ok",
  ...extra,
});

describe("toZipValidationView", () => {
  it("SUCCESS + valid만 valid", () => {
    expect(toZipValidationView(status("SUCCESS", { result: result("valid") }), TASK, GAME)).toBe("valid");
    expect(toZipValidationView(status("SUCCESS", { result: result("invalid") }), TASK, GAME)).toBe("invalid");
    expect(toZipValidationView(status("SUCCESS", { result: result("skipped") }), TASK, GAME)).toBe("skipped");
  });
  it("SUCCESS/null, 다른 게임, 다른 task, 알 수 없는 형식은 성공으로 보지 않는다", () => {
    expect(toZipValidationView(status("SUCCESS"), TASK, GAME)).toBe("unknown");
    expect(toZipValidationView(status("SUCCESS", { result: { ...result("valid"), game_id: 99 } }), TASK, GAME)).toBe(
      "unknown",
    );
    expect(toZipValidationView(status("SUCCESS", { result: result("valid") }), "other", GAME)).toBe("unknown");
    expect(
      toZipValidationView(status("SUCCESS", { result: { ...result("valid"), schema_version: 2 } }), TASK, GAME),
    ).toBe("unknown");
  });
  it("진행·실패 상태와 보관기간 만료", () => {
    expect(toZipValidationView(status("PENDING"), TASK, GAME)).toBe("waiting");
    expect(toZipValidationView(status("PENDING", { lookup_status: "expired" }), TASK, GAME)).toBe("expired");
    expect(toZipValidationView(status("STARTED"), TASK, GAME)).toBe("running");
    expect(toZipValidationView(status("RETRY"), TASK, GAME)).toBe("retrying");
    expect(toZipValidationView(status("FAILURE"), TASK, GAME)).toBe("failed");
    expect(toZipValidationView(status("REVOKED"), TASK, GAME)).toBe("revoked");
  });
  it("409는 현재 파일의 작업이 아님", () => {
    expect(toZipValidationErrorView({ isAxiosError: true, response: { status: 409 } })).toBe("stale");
    expect(toZipValidationErrorView(new Error("network"))).toBe("error");
  });
});

describe("ZipValidationStatus 자동 갱신", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getZipValidationStatus).mockReset();
  });
  afterEach(() => vi.useRealTimers());

  const mount = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ZipValidationStatus taskId={TASK} gameId={GAME} />
      </QueryClientProvider>,
    );

  it("대기 안내 후 새로고침 없이 검증 성공 안내로 바뀐다", async () => {
    vi.mocked(getZipValidationStatus)
      .mockResolvedValueOnce(status("PENDING"))
      .mockResolvedValueOnce(status("STARTED"))
      .mockResolvedValue(status("SUCCESS", { result: result("valid") }));
    mount();
    expect(await screen.findByText("검수 요청 완료. 서버 파일 검증을 기다리고 있습니다.")).toBeTruthy();
    expect(screen.queryByText(/검증이 완료되었습니다/)).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(await screen.findByText("서버에서 게임 파일을 검증하는 중입니다.")).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(await screen.findByText("게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다.")).toBeTruthy();
    const calls = vi.mocked(getZipValidationStatus).mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(vi.mocked(getZipValidationStatus).mock.calls.length).toBe(calls); // 종료 후 자동 조회 중지
  });

  it("검증 실패 시 사유와 재확인 버튼을 표시한다", async () => {
    vi.mocked(getZipValidationStatus).mockResolvedValue(
      status("SUCCESS", { result: result("invalid", "심볼릭 링크를 확인했습니다.") }),
    );
    mount();
    expect(await screen.findByText("게임 파일 검증에 실패했습니다.")).toBeTruthy();
    expect(screen.getByText("사유: 심볼릭 링크를 확인했습니다.")).toBeTruthy();
  });

  it("10분 동안 대기 상태면 자동 조회를 멈추고 지연 안내와 수동 재조회를 제공한다", async () => {
    vi.mocked(getZipValidationStatus).mockResolvedValue(status("PENDING"));
    mount();
    await screen.findByText("검수 요청 완료. 서버 파일 검증을 기다리고 있습니다.");
    await act(async () => vi.advanceTimersByTimeAsync(11 * 60_000));
    expect(await screen.findByText(/검증이 지연되고 있습니다/)).toBeTruthy();
    const calls = vi.mocked(getZipValidationStatus).mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(vi.mocked(getZipValidationStatus).mock.calls.length).toBe(calls);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "결과 다시 확인" })));
    expect(vi.mocked(getZipValidationStatus).mock.calls.length).toBe(calls + 1);
  });
});
