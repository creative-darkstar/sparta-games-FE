# F01 변경 설명

구현서: presigned-upload-fix-implementation-guide-20261009.md, F01

서버 식별자 복원과 공용 상태 조회를 목록·상세에 연결. 제한된 polling, 수동 재조회, ZIP 결과 안내와 덮어쓰기 방지 헤더 구현. FE 전체 61개 테스트 통과.

- `src/types/index.ts` 코드 라인: 269, 398, 400 (해당 커밋 기준)
- `src/api/direct.ts` 코드 라인: 122, 126 (해당 커밋 기준)
- `src/api/upload.ts` 코드 라인: 22 (해당 커밋 기준)
- `src/hook/useGameUpload.ts` 코드 라인: 47 (해당 커밋 기준)
- `src/hook/useNotifications.ts` 코드 라인: 43, 66 (해당 커밋 기준)
- `src/components/gameUploadComponents/GameUploadForm.tsx` 코드 라인: 128, 134 (해당 커밋 기준)
- `src/components/gameUploadComponents/ZipValidationStatus.tsx` 코드 라인: 1 (해당 커밋 기준)
- `src/components/mypageComponents/MyGameCard.tsx` 코드 라인: 1, 85 (해당 커밋 기준)
- `src/page/GameDetail.tsx` 코드 라인: 1, 43, 61, 134 (해당 커밋 기준)
- `tests/presigned.test.ts` 코드 라인: 29 (해당 커밋 기준)
- `tests/upload.test.ts` 코드 라인: 9, 25, 29 (해당 커밋 기준)
- `tests/zip-status.test.tsx` 코드 라인: 1 (해당 커밋 기준)
