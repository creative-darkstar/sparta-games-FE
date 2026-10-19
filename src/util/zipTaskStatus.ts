import { TaskStatus, ZipOutcome, ZipSubmission } from "../types";

export function currentZipOutcome(task: TaskStatus | undefined, submission: ZipSubmission | null | undefined, gameId: number) {
  if (!submission?.task_id || !submission.submission_id || task?.status !== "SUCCESS" || task.task_id !== submission?.task_id) return null;
  const result = task.result as Partial<ZipOutcome> | null;
  return result?.kind === "game_zip_validation" && result.schema_version === 1 &&
    result.game_id === gameId && result.submission_id === submission?.submission_id ? result : null;
}

export function zipTaskMessage(task: TaskStatus | undefined, submission: ZipSubmission | null | undefined, gameId: number) {
  if (!submission?.task_id || !submission.submission_id) return "파일 검증 결과를 확인할 수 없습니다. 기존 관리자 검수 상태를 확인해주세요.";
  if (submission.publish_status === "failed") return "검수 요청은 접수되었으나 검증 작업을 시작하지 못했습니다. 운영자에게 재처리를 요청해주세요.";
  if (!task) return "검수 요청 완료. 서버 파일 검증을 기다리고 있습니다. 접수 후에는 이동해도 됩니다.";
  if (task.task_id !== submission.task_id || (task.lookup_status && task.lookup_status !== "available"))
    return "파일 검증 결과가 미확정입니다. 다시 조회하거나 운영자에게 확인해주세요.";
  if (task.status === "SUCCESS") {
    const result = currentZipOutcome(task, submission, gameId);
    if (!result)
      return "현재 파일의 검증 결과를 확인할 수 없습니다. 다시 조회해주세요.";
    if (result.outcome === "valid") return "게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다.";
    if (result.outcome === "invalid") return `게임 파일 검증에 실패했습니다. ${result.reason || "파일을 수정해주세요."}`;
    return "현재 파일의 결과를 다시 확인해주세요.";
  }
  if (task.status === "FAILURE") return "검증 처리에 실패했습니다. 운영자에게 재처리를 요청해주세요.";
  if (task.status === "REVOKED") return "검증 처리가 중단되었습니다. 운영자에게 재처리를 요청해주세요.";
  if (task.status === "RETRY") return "파일 검증 재시도 중입니다.";
  if (task.status === "STARTED") return "서버에서 파일 검증 중입니다.";
  return "검수 요청 완료. 서버 파일 검증을 기다리고 있습니다. 접수 후에는 이동해도 됩니다.";
}

export function shouldPollZip(task?: TaskStatus) {
  return !task || ((!task.lookup_status || task.lookup_status === "available") && ["PENDING", "STARTED", "RETRY"].includes(task.status));
}
