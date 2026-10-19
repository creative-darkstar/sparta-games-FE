import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { zipTaskMessage, shouldPollZip } from "../src/util/zipTaskStatus";
import { TaskStatus } from "../src/types";
import ZipValidationStatus from "../src/components/gameUploadComponents/ZipValidationStatus";
import { getTaskStatus } from "../src/api/direct";
vi.mock("../src/api/direct", () => ({ getTaskStatus: vi.fn() }));
const submission = { task_id: "task", submission_id: "submission", publish_status: "published" };
const outcome = { kind: "game_zip_validation", schema_version: 1, game_id: 42, submission_id: "submission", outcome: "valid" };
it.each([null, {}, { ...outcome, outcome: "skipped" }, { ...outcome, submission_id: "old" }, { ...outcome, game_id: 99 }])("F03: unknown or old SUCCESS never means valid: %j", (result) => {
  expect(zipTaskMessage({ task_id: "task", status: "SUCCESS", result }, submission, 42)).not.toContain("검증이 완료");
});
it.each(["SUCCESS", "FAILURE", "REVOKED"])("F01: terminal %s stops polling", (status) => {
  expect(shouldPollZip({ task_id: "task", status, result: null })).toBe(false);
});
it.each(["PENDING", "STARTED", "RETRY"])("F01: %s polls only while lookup is available", (status) => {
  expect(shouldPollZip({ task_id: "task", status, result: null })).toBe(true);
  expect(shouldPollZip({ task_id: "task", status, result: null, lookup_status: "unconfirmed" })).toBe(false);
});
it("F01: restored identifier fetches valid result without router state or WebSocket", async () => {
  vi.mocked(getTaskStatus).mockResolvedValue({ task_id: "task", status: "SUCCESS", result: outcome } as TaskStatus);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ZipValidationStatus gameId={42} submission={submission} /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText("게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다.")).toBeTruthy();
  expect(getTaskStatus).toHaveBeenCalledWith("task");
});
it("F03: invalid renders reason and correction link", async () => {
  vi.mocked(getTaskStatus).mockResolvedValue({ task_id: "task", status: "SUCCESS", result: { ...outcome, outcome: "invalid", reason: "심볼릭 링크" } });
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ZipValidationStatus gameId={42} submission={submission} /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText(/검증에 실패했습니다. 심볼릭 링크/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "파일 수정하기" }).getAttribute("href")).toBe("/game-edit/42");
});
