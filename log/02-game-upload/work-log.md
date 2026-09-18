# Step 2 — S3 업로드·등록/수정 통합
- 작업일: 2026-09-18 (Asia/Seoul)
- 생성: src/api/upload.ts, src/hook/useGameUpload.ts, src/util/gameZipValidation.ts.
- 수정: GameUploadForm, GameUploadFields, GameMediaFields 및 TGameUploadInput.gameFile.
- 구현: JWT 없는 독립 S3 클라이언트, 실제 진행 이벤트, file_key 문자열 제출, 기존 ZIP 생략, old_screenshots 유지, 반려 게임 새 ZIP 필수.
- 구현: 파일 선택 취소/손상/확장자/크기 검사 및 검사 세대 번호로 오래된 결과 무시. 이미지 미리보기와 URL 해제.
- 오류 처리: 업로드 실패 재시도, 성공한 키 세션 재사용, 접수 불확실 시 자동 재전송 차단, 입력 보존.
- 영향: 업로드 100%와 요청 완료를 구분하며 실행 중 편집·중복 제출 잠금. 탭 종료 안내는 작업 중에만 등록.
- 검증: BE WebGL 필수 확장자 목록 대조. 빌드/흐름 및 SPA 이탈 검증은 6단계에서 수행.

## 완료 시각 및 파일별 변경 범위
- 단계 커밋: `f043eab`
- 단계 완료 시각: 2026-09-18T20:47:26+09:00
- A: 생성, M: 수정. 기존 사용자 문서와 BE 소스는 변경하지 않음.

```text
A	src/api/upload.ts
M	src/components/gameUploadComponents/GameMediaFields.tsx
M	src/components/gameUploadComponents/GameUploadFields.tsx
M	src/components/gameUploadComponents/GameUploadForm.tsx
A	src/hook/useGameUpload.ts
M	src/types/index.ts
A	src/util/gameZipValidation.ts
```

이 단계의 구현 이후 발견한 접근성·흐름 보완과 최종 검증은 [6단계 로그](../06-validation/work-log.md)에 함께 기록한다. 단계별 커밋은 구현 경계를 보존하며 최종 실행 검증의 기준은 전체 6단계 반영본이다.
