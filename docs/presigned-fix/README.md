# Presigned 업로드 수정 결과 (2026-10-19 KST)

원본 구현서: FE `docs/presigned-upload-fix-implementation-guide-20261009.md`. 원본 지침서는 수정하지 않았다. 아래 라인은 최종 소스 기준이며 항목별 상세 파일은 같은 폴더의 Fxx-changes.md다. 작업 일지는 `log/presigned-fix/work-log.md`에 별도로 기록했다.

| 항목 | 파일:라인 | 변경 이유와 동작 |
|---|---|---|
| F02 | [src/components/gameUploadComponents/GameUploadForm.tsx:63](../../src/components/gameUploadComponents/GameUploadForm.tsx#L63) | ZIP을 수동 등록하고 최신 검사 뒤 trigger로 전체 유효성을 갱신한다. checking·fileError·gameFile로 미선택/검사중/실패/통과를 구분한다. |
| F02 | [src/components/gameUploadComponents/GameUploadForm.tsx:84](../../src/components/gameUploadComponents/GameUploadForm.tsx#L84) | 선택 버전이 일치할 때만 파일 및 검사 상태를 반영한다. 새 선택은 기존 업로드 키를 무효화한다. |
| F04 | [src/share/store/userStore.ts:15](../../src/share/store/userStore.ts#L15) | 인증 초기화 진행/완료/실패를 구분한다. App에서 초기화를 한 번 시작한다. |
| F04 | [src/components/mypageComponents/MyGame.tsx:22](../../src/components/mypageComponents/MyGame.tsx#L22) | 사용자·owner/public 모드·페이지를 캐시 키에 포함하고 인증 복원 중 요청을 막는다. |
| F04 | [src/page/MyPage.tsx:84](../../src/page/MyPage.tsx#L84) | 인증 로딩·로그인 필요 상태를 빈 개발목록과 구별한다. 대상/모드가 달라지면 목록 페이지를 초기화한다. |
| F03 | [src/util/zipTaskStatus.ts:3](../../src/util/zipTaskStatus.ts#L3) | task_id, submission_id, game_id, kind, schema_version이 일치하는 결과만 현재 ZIP 판정으로 해석한다. SUCCESS/null은 성공이 아니다. |
| F01 | [src/api/direct.ts:122](../../src/api/direct.ts#L122) | 기존 endpoint의 공통 envelope 내부 data를 읽고 관리자 getApprovalTask 호환 호출을 유지한다. |
| F01 | [src/hook/useGameUpload.ts:54](../../src/hook/useGameUpload.ts#L54) | 등록 API 응답은 접수로 표시하고 응답 식별자를 호출자에게 전달한다. 바이트 진행률과 중복 제출 잠금은 유지한다. |
| F01 | [src/components/gameUploadComponents/ZipValidationStatus.tsx:18](../../src/components/gameUploadComponents/ZipValidationStatus.tsx#L18) | 목록·상세가 반환한 현재 식별자로 조회한다. 5초/15초 간격, 10분 상한, 종료 상태 및 조회 오류에서 자동 조회 중지, 수동 재조회 제공. |
| F01 | [src/api/upload.ts:22](../../src/api/upload.ts#L22) | If-None-Match: *로 서명된 S3 PUT 조건을 전달해 기존 객체 덮어쓰기를 차단한다. |
| F05 | [src/page/MyPage.tsx:26](../../src/page/MyPage.tsx#L26) | 목록 로딩 성공 시 일회성 접수 배너를 지우고 게임 카드의 현재 제출 결과로 안내한다. 목록 실패 시에는 접수 안내 유지. |
| F05 | [src/hook/useGameUpload.ts:9](../../src/hook/useGameUpload.ts#L9) | 전송/접수 API 대기를 구분하고 30초 뒤 지연 안내를 표시한다. API 100%와 서버 검증 완료를 구분한다. |

## 검증 결과

- FE: Vitest 12개 파일, 63개 테스트 통과. 신규 ZIP 먼저/마지막 선택, 파일 A→B, 재제출, 캐시 분리, 결과 판별, 복원 및 기존 업로드 회귀 포함.
- BE: 격리된 메모리 SQLite에서 16개 테스트 통과. 유효/무효, 중복 로그, 파일 교체 경합 시뮬레이션, 재시도 소진, 권한, 빈 목록, 응답 래퍼, 메타데이터 수정, 발급 기한, 알림 콜백 실패를 포함. S3/Redis/브로커는 mock이다.
- FE `npm run build` 통과. 큰 번들 및 기존 `${icon}` 경고 있음.
- BE `manage.py check` 통과. `makemigrations --check --dry-run --settings=spartagames.test_settings`: No changes detected. 신규 모델/필드/마이그레이션 없음.
- FE `npm run typecheck`는 미변경 파일의 기존 오류로 실패. 대표적으로 UserProfile의 profileData props 불일치와 미사용 변수들. 원문은 FE `log/presigned-fix/typecheck.txt`. 이번 변경 파일 오류는 출력되지 않았다.

## 미실행 인수 시험 및 배포 조건

실제 UI/S3/API/worker가 연결된 T01~T07, Maze 전송, PostgreSQL 동시 트랜잭션, 브로커 재시작/결과 cleanup/Redis 영속성 유실은 미실행이다. 테스트 성공을 실서비스 인수 완료로 해석하지 않는다.

1. S3 CORS AllowedHeaders에 `If-None-Match`, `Content-Type`, `x-amz-tagging` 허용 여부를 확인한다. 기존 객체에 두 번째 PUT이 412로 거절되는지 실제 버킷에서 확인해야 한다. 원격 버킷 설정은 변경하지 않았다.
2. 새 서명은 If-None-Match 헤더를 요구한다. 구형 FE를 새 BE와 그대로 혼용하면 PUT이 실패하므로 업로드를 잠시 중지한 동시 배포 또는 FE 헤더 지원 선배포가 필요하다. 구형 발급 키는 새 발급자 인덱스가 없으므로 새로 발급해야 한다.
3. Redis AOF/RDB와 eviction 정책을 확인한다. 코드의 TTL 7일과 Celery result_expires 7일만으로 장애 시 보관을 보장하지 않는다. 전역 결과 보관량 및 cleanup 설정을 함께 확인한다.
4. 발행 실패/미확정 결과는 운영자가 DB의 현재 파일과 매핑의 file_key/submission_id를 대조한 뒤 기존 task_id로 재처리한다. 조회 API는 재발행하지 않는다. 구형 인자의 큐 작업은 skipped이며 필요한 경우 운영자가 현재 제출을 확인해야 한다.
5. 파일 예약 뒤 DB 롤백, DB 커밋 뒤 Redis/브로커 실패는 하나의 분산 트랜잭션으로 묶이지 않는다. 이 경우 자동 재등록을 유도하지 않고 접수 여부와 작업 매핑을 먼저 확인한다.
6. 관리자 승인·Unity 실행·회원가입 동작은 이번 구현으로 검증한 것으로 주장하지 않는다.

## 저장소 보존

FE는 `feat/sync-backend-ui-ux`, BE는 `refact/testing`에서 항목별 커밋했다. FE 기존 미추적 docs/log 자료와 BE 사용자의 SQLite DATABASES 변경은 커밋에서 제외하고 보존했다. push/배포는 수행하지 않았다.
