import axios from "axios";
import { TZipTaskStatusResponse, ZipValidationView } from "../types";

/**
 * Celery 상태와 task 반환값을 화면 단계로 바꾼다.
 * SUCCESS만으로 성공 처리하지 않는다. 반환값의 kind·schema_version·game_id가 맞고 outcome이 valid일 때만 valid다.
 */
export function toZipValidationView(data: TZipTaskStatusResponse, taskId: string, gameId: number): ZipValidationView {
  if (data.task_id !== taskId) return "unknown";
  switch (data.status) {
    case "PENDING":
      return data.lookup_status === "expired" ? "expired" : "waiting";
    case "STARTED":
      return "running";
    case "RETRY":
      return "retrying";
    case "FAILURE":
      return "failed";
    case "REVOKED":
      return "revoked";
    case "SUCCESS": {
      const result = data.result;
      if (!result || result.kind !== "game_zip_validation" || result.schema_version !== 1 || result.game_id !== gameId)
        return "unknown";
      if (result.outcome === "valid" || result.outcome === "invalid" || result.outcome === "skipped") return result.outcome;
      return "unknown";
    }
    default:
      return "unknown";
  }
}

/** 조회 자체가 실패했을 때. 409는 현재 파일의 작업이 아님(파일이 바뀜)을 뜻한다. */
export function toZipValidationErrorView(error: unknown): ZipValidationView {
  if (axios.isAxiosError(error) && error.response?.status === 409) return "stale";
  return "error";
}

/** 자동 조회를 계속할 단계 */
export const isZipValidationPending = (view: ZipValidationView) =>
  view === "waiting" || view === "running" || view === "retrying";

export const ZIP_VALIDATION_MESSAGES: Record<ZipValidationView, string> = {
  waiting: "검수 요청 완료. 서버 파일 검증을 기다리고 있습니다.",
  running: "서버에서 게임 파일을 검증하는 중입니다.",
  retrying: "게임 파일 검증을 다시 시도하는 중입니다.",
  valid: "게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다.",
  invalid: "게임 파일 검증에 실패했습니다.",
  skipped: "현재 게임 파일의 검증 결과를 다시 확인해주세요.",
  failed: "게임 파일 검증을 처리하지 못했습니다. 잠시 후 다시 확인하고, 계속되면 운영팀에 문의해주세요.",
  revoked: "게임 파일 검증이 중단되었습니다. 운영팀에 문의해주세요.",
  stale: "게임 파일이 변경되었습니다. 최신 상태를 다시 확인해주세요.",
  expired: "검증 결과 확인 불가(보관기간 경과). 관리자 검수 상태를 확인해주세요.",
  unknown: "검증 결과를 확인할 수 없습니다. 다시 확인해주세요.",
  error: "검증 상태를 불러오지 못했습니다. 다시 확인해주세요.",
};
