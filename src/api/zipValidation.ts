import { TApiResponse, TZipTaskStatusResponse } from "../types";
import { sparta_games_auth } from "./axios";

/**
 * 기존 task 상태 조회 API로 ZIP 검증 결과를 조회한다.
 * game_id를 함께 보내야 서버가 제작자·관리자 권한과 현재 파일 일치 여부를 확인한다.
 * (관리자 공개 처리 조회는 direct.ts의 getApprovalTask를 그대로 사용한다.)
 */
export const getZipValidationStatus = async (taskId: string, gameId: number) => {
  const response = await sparta_games_auth.get<TApiResponse<TZipTaskStatusResponse>>(
    `/directs/api/list/task-status/${encodeURIComponent(taskId)}/`,
    { params: { game_id: gameId }, timeout: 10000 },
  );
  return response.data.data;
};
