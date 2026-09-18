# Step 2 — S3 업로드·등록/수정 통합
- 작업일: 2026-09-18 (Asia/Seoul)
- 생성: src/api/upload.ts, src/hook/useGameUpload.ts, src/util/gameZipValidation.ts.
- 수정: GameUploadForm, GameUploadFields, GameMediaFields 및 TGameUploadInput.gameFile.
- 구현: JWT 없는 독립 S3 클라이언트, 실제 진행 이벤트, file_key 문자열 제출, 기존 ZIP 생략, old_screenshots 유지, 반려 게임 새 ZIP 필수.
- 구현: 파일 선택 취소/손상/확장자/크기 검사 및 검사 세대 번호로 오래된 결과 무시. 이미지 미리보기와 URL 해제.
- 오류 처리: 업로드 실패 재시도, 성공한 키 세션 재사용, 접수 불확실 시 자동 재전송 차단, 입력 보존.
- 영향: 업로드 100%와 요청 완료를 구분하며 실행 중 편집·중복 제출 잠금. 탭 종료 안내는 작업 중에만 등록.
- 검증: BE WebGL 필수 확장자 목록 대조. 빌드/흐름 및 SPA 이탈 검증은 6단계에서 수행.
