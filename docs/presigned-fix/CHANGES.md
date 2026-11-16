# Presigned 업로드 수정: FE 변경 설명

- 기준 구현서: [docs/presigned-upload-fix-implementation-guide-20261009.md](../presigned-upload-fix-implementation-guide-20261009.md) (확정본, 2026-10-30)
- 브랜치: `feat/sync-backend-ui-ux`
- 라인 번호는 이 문서를 작성한 시점의 최종 커밋 기준이다.
- 표의 "구현서" 열은 근거가 되는 구현서 절 번호다.
- BE 변경은 BE 저장소의 `docs/presigned-fix/CHANGES.md`에 따로 정리했다.

## 한눈에 보기

| 항목 | 커밋 | 한 줄 요약 |
|---|---|---|
| — | `36948bd`, `bb765a4` | 구현서 원본을 추가하고 개정·확정본으로 교체 |
| F02 | `17882ec` | ZIP을 마지막에 선택하면 버튼이 비활성으로 남던 문제 수정 |
| F04 | `b332a9b` | 새로고침 후 개발목록이 비어 보이던 문제 수정 |
| F01 | `7c309d9` | 서버 ZIP 검증 결과를 조회해, 검증에 성공한 뒤에만 완료 안내 |
| F05 | `613aa14` | 접수 배너를 최신 검증 결과로 갱신하고, 대기 안내를 단계별로 구분 |
| F06 | `9fb493b` | S3 업로드에 덮어쓰기 차단 헤더를 보내고, 412·409 응답 처리 |

## 사용자가 보는 흐름 (변경 후)

1. 파일 선택 → "파일 확인 중입니다." → 제출할 수 없으면 이유를 목록으로 표시
2. 등록 확정 → "게임 파일 업로드 중 · N%"
3. 100% → "파일 전송이 끝났습니다. 서버 응답을 기다리고 있습니다. 아직 등록이 끝나지 않았습니다."
4. 등록 API 처리 중 → "검수 요청을 처리 중입니다. 아직 등록이 끝나지 않았습니다." (30초가 넘으면 지연 안내)
5. 접수 응답 → 개발목록으로 이동, 배너 "검수 요청 완료" + "서버 파일 검증을 기다리고 있습니다."
6. 서버 검증 결과에 따라 새로고침 없이 아래 중 하나로 바뀐다.
   - 성공: "게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다."
   - 실패: "게임 파일 검증에 실패했습니다." + 사유

## F02: ZIP을 마지막에 고르면 버튼이 비활성으로 남는 문제

**원인 (테스트로 확인):**
- 버튼 비활성 조건 `blocked` 식에서, 파일이 없을 때는 `(requiresFile && !file)`가 true라 식이 거기서 끝난다(단락 평가). 그래서 첫 렌더에 `formState.isValid`가 한 번도 읽히지 않는다.
- react-hook-form은 렌더 중에 읽힌 formState 값만 구독한다. 따라서 `isValid`가 초기값 false에서 갱신되지 않는다.
- 결과적으로 ZIP을 마지막에 고르면 비활성으로 남는다. 제목을 다시 입력하면 그때 재검증이 일어나 활성화된다.
- 테스트에서 ZIP 검사가 즉시 끝나면 재현되지 않았고, 실제 브라우저처럼 늦게 끝나게 하자 재현됐다. 수정 전 코드에서는 실패하고 수정 후에는 통과하는 것을 확인했다.

| 파일:라인 | 무엇을 바꿨나 | 왜 (구현서) |
|---|---|---|
| [GameUploadForm.tsx:37](../../src/components/gameUploadComponents/GameUploadForm.tsx#L37) | 렌더를 시작할 때 `const { isValid } = formState`로 항상 먼저 읽음 | 위 원인의 직접 수정. 우회 방법(재입력, 타이머, 강제 활성화)은 쓰지 않았다 (6장-4) |
| [GameUploadForm.tsx:61](../../src/components/gameUploadComponents/GameUploadForm.tsx#L61) | `blocked`가 위에서 읽은 `isValid`를 사용 | 최종 submit도 같은 조건을 쓴다 (6장-4) |
| [GameUploadForm.tsx:70](../../src/components/gameUploadComponents/GameUploadForm.tsx#L70) | `blockReasons`: 제목, 장르, 설명, 썸네일, 검사 중, 검사 실패, 파일 미선택, 동의, 결과 불확실을 각각 판정 | 전에는 "유의사항 동의, 필수 입력과 파일 검사 결과를 확인해주세요." 한 문장뿐이었다 (6장-5) |
| [GameUploadForm.tsx:116](../../src/components/gameUploadComponents/GameUploadForm.tsx#L116) | 최신 선택의 ZIP 검사가 끝난 뒤 값을 반영하고 `trigger()`로 전체 폼을 다시 검증 | 검사 완료와 유효성 판정의 순서를 보장한다. 기존 선택 버전 방어는 유지 (6장-2·3) |
| [GameUploadForm.tsx:133](../../src/components/gameUploadComponents/GameUploadForm.tsx#L133) | 이미지 선택 후에도 `trigger()` | 썸네일을 마지막에 골라도 같은 방식으로 갱신된다 |
| [GameUploadForm.tsx:241](../../src/components/gameUploadComponents/GameUploadForm.tsx#L241) | 비활성 사유를 `<ul aria-label="제출할 수 없는 이유">` 목록으로 표시 | 화면 낭독기에서도 이유를 읽을 수 있게 한다 |
| [tests/f02-input-order.test.tsx](../../tests/f02-input-order.test.tsx) | ZIP 먼저·마지막, 썸네일 마지막, 사유 표시 시험. ZIP 검사는 30ms 지연 | 즉시 끝나면 결함이 재현되지 않기 때문 |

## F04: 새로고침 후 개발목록이 비어 보이는 문제

**원인 (테스트로 확인):**
- 새로고침 직후 로그인을 복원하는 동안 `isMyPage=null`이고, 이때 `MyGame`이 **공개 목록 API**를 호출했다.
- 공개 목록은 미승인 게임을 제외하므로 결과가 비어 있다.
- 그 빈 결과가 본인/공개 구분 없는 query key `["myGameList", user_id, page]`로 캐시되어, 로그인 복원 뒤에도 그대로 쓰였다.
- 테스트 2개가 수정 전 코드에서 실패하는 것을 확인했다.

| 파일:라인 | 무엇을 바꿨나 | 왜 (구현서) |
|---|---|---|
| [userStore.ts:7](../../src/share/store/userStore.ts#L7) | `authStatus`: loading(복원 중) / authenticated / anonymous | 로그인 복원 중과 비로그인을 구분한다 (7장) |
| [userStore.ts:21](../../src/share/store/userStore.ts#L21) | 초기값: 저장된 토큰이 있으면 loading, 없으면 anonymous | 첫 렌더부터 복원 중임을 알 수 있다 |
| [userStore.ts:22](../../src/share/store/userStore.ts#L22) | `initAuth()` 추가 | 앱 시작 시 한 번만 복원한다 |
| [userStore.ts:36](../../src/share/store/userStore.ts#L36) | 이미 로그인된 상태의 갱신(프로필 수정 등)은 loading으로 바꾸지 않음 | 화면이 깜빡이지 않게 한다 |
| [App.tsx:17](../../src/App.tsx#L17) | 두 개의 effect가 `setUser`를 중복 호출하던 것을 `initAuth()` 1회로 정리 | 중복 초기화 제거 |
| [MyPage.tsx:44](../../src/page/MyPage.tsx#L44) | 복원 중이면 `isMyPage=null`, 비로그인이면 false | 본인 여부가 확정되기 전에는 판단하지 않는다 |
| [MyPage.tsx:66](../../src/page/MyPage.tsx#L66) | 공개 프로필 조회는 `isMyPage === false`일 때만 | 복원 중에 공개 데이터로 화면을 그리지 않는다 |
| [MyPage.tsx:94](../../src/page/MyPage.tsx#L94) | 복원 중에는 "로그인 정보를 확인하는 중입니다." 표시 | 인증 로딩을 빈 목록으로 보이지 않게 한다 (7장) |
| [MyGame.tsx:20](../../src/components/mypageComponents/MyGame.tsx#L20) | 조회 모드 `owner`/`public`과 대상 ID 계산 | queryFn 분기와 key가 같은 의미를 갖게 한다 (7장) |
| [MyGame.tsx:22](../../src/components/mypageComponents/MyGame.tsx#L22) | 대상이나 모드가 바뀌면 1페이지로 초기화 | (7장) |
| [MyGame.tsx:27](../../src/components/mypageComponents/MyGame.tsx#L27) | query key `["myGameList", 대상, 모드, 페이지]` | 공개 결과와 본인 결과의 캐시가 섞이지 않는다 |
| [MyGame.tsx:28](../../src/components/mypageComponents/MyGame.tsx#L28) | `isMyPage === null`이면 조회 비활성 | 복원 중 잘못된 API 호출을 막는다 |
| [tests/f04-list-restoration.test.tsx](../../tests/f04-list-restoration.test.tsx) | 복원 중 미조회, 공개→본인 전환 시 캐시 미재사용, API 실패와 빈 목록 구분 | — |

BE도 함께 수정했다. 게임이 없을 때 404 대신 200 빈 목록을 반환해, "목록을 불러오지 못했습니다"와 "개발중인 게임이 없습니다"가 구분된다.

## F01: 서버 ZIP 검증 결과 확인 후 완료 안내

| 파일:라인 | 무엇을 바꿨나 | 왜 (구현서) |
|---|---|---|
| [types/index.ts:400](../../src/types/index.ts#L400) | 업로드 단계 `completed` → `accepted` | 등록 API 응답은 "접수"일 뿐, 검증 완료가 아니다 (5장) |
| [types/index.ts:404](../../src/types/index.ts#L404) | 응답 타입 추가: `TGameSubmitResult`, `TZipValidationResult`, `TZipTaskStatusResponse`, `ZipValidationView` | BE 계약(구현서 4.3·4.4)을 타입으로 고정한다 |
| [types/index.ts:306](../../src/types/index.ts#L306) | 게임 상세 타입에 `zip_task_id` | 새로고침·직접 진입 시 복원용 (4.5) |
| [api/game.ts:6](../../src/api/game.ts#L6) | 등록·수정 응답 타입을 `TGameSubmitResult`로 | 응답의 game_id/task_id를 사용한다 |
| [hook/useGameUpload.ts:25](../../src/hook/useGameUpload.ts#L25) | `submit()`이 성공 시 `{game_id, task_id}`, 실패 시 null을 반환 | 호출자가 접수 식별자로 결과 조회를 이어간다 (5장) |
| [hook/useGameUpload.ts:49](../../src/hook/useGameUpload.ts#L49) | 접수 시 단계를 `accepted`로 | 위와 같음 |
| [GameUploadForm.tsx:152](../../src/components/gameUploadComponents/GameUploadForm.tsx#L152) | 접수 후 개발목록으로 이동하면서 `gameId`, `taskId`를 함께 전달 | 폼에서 검증 대기를 강제하지 않는다 (5장) |
| [api/zipValidation.ts:9](../../src/api/zipValidation.ts#L9) | `getZipValidationStatus(taskId, gameId)`: 기존 task-status API를 `?game_id=`와 함께 호출 | 관리자용 `getApprovalTask`는 그대로 둔다. 전용 endpoint는 추가하지 않았다 (4.4, 5장) |
| [util/zipValidationState.ts:8](../../src/util/zipValidationState.ts#L8) | `toZipValidationView()`: SUCCESS이면서 kind·schema_version·game_id가 맞고 outcome이 valid일 때만 valid | SUCCESS/null이나 형식이 맞지 않는 결과는 unknown으로 처리한다 (4.3 표) |
| [util/zipValidationState.ts:34](../../src/util/zipValidationState.ts#L34) | 409 응답이면 stale(파일이 바뀜) | 이전 파일의 결과를 현재 결과로 보이지 않게 한다 (4.4) |
| [util/zipValidationState.ts:43](../../src/util/zipValidationState.ts#L43) | 단계별 안내 문구 | 구현서 5장 표 그대로 |
| [hook/useZipValidation.ts:30](../../src/hook/useZipValidation.ts#L30) | 자동 조회 간격: 처음 2분 5초, 이후 15초. 결과 확정·오류 시 중지 | 구현서 5장 조회 간격 |
| [hook/useZipValidation.ts:35](../../src/hook/useZipValidation.ts#L35) | 10분이 지나면 자동 조회를 멈추고 `timedOut` 표시 | 무한 조회 방지. 지연을 실패로 단정하지 않는다 (5장) |
| [hook/useZipValidation.ts:46](../../src/hook/useZipValidation.ts#L46) | `recheck()`: 수동 재조회 | "결과 다시 확인" 버튼에서 사용 |
| [ZipValidationStatus.tsx:12](../../src/components/gameUploadComponents/ZipValidationStatus.tsx#L12) | 검증 단계 안내 컴포넌트. 실패 사유와 "결과 다시 확인" 버튼 포함 | 관리자 검수 배지와는 별개로 표시한다 (5장) |
| [ZipValidationStatus.tsx:17](../../src/components/gameUploadComponents/ZipValidationStatus.tsx#L17) | 결과가 확정되면 목록·상세를 한 번 다시 불러옴 | 반려(register_state=2) 등을 새로고침 없이 반영한다 |
| [MyGameCard.tsx:86](../../src/components/mypageComponents/MyGameCard.tsx#L86) | 검수중(0) 카드에 검증 단계 표시 | 목록의 `zip_task_id`로 조회 (4.5) |
| [GameDetail.tsx:167](../../src/page/GameDetail.tsx#L167) | 상세에서 검수중이고 `zip_task_id`가 있으면 표시 | 서버가 제작자·관리자에게만 `zip_task_id`를 준다 |
| [tests/f01-zip-validation.test.tsx](../../tests/f01-zip-validation.test.tsx) | 결과 판별 7가지, PENDING→STARTED→valid 자동 전환, 종료 후 조회 중지, 실패 사유, 10분 상한과 수동 재조회 | — |

## F05: 접수 배너와 대기 안내

| 파일:라인 | 무엇을 바꿨나 | 왜 (구현서) |
|---|---|---|
| [MyPage.tsx:25](../../src/page/MyPage.tsx#L25) | 이동할 때 받은 `gameId`, `taskId` 보관 | 배너를 해당 제출의 결과와 연결한다 |
| [MyPage.tsx:151](../../src/page/MyPage.tsx#L151) | "검수 요청 완료" 배너 안에 검증 단계 표시 | 반려 후에도 "검수 요청 완료"만 남던 문제 해결. 카드와 같은 query key를 써서 요청은 한 번만 나간다 (5장) |
| [MyPage.tsx:153](../../src/page/MyPage.tsx#L153) | "관리자 검수 결과는 알림으로 안내합니다. 다른 화면으로 이동해도 서버 검증은 계속됩니다." | 관리자 검수와 서버 검증을 구분한다 |
| [GameUploadForm.tsx:45](../../src/components/gameUploadComponents/GameUploadForm.tsx#L45) | 전송·접수 대기가 30초를 넘으면 `slow` 상태로 | (5장) |
| [GameUploadForm.tsx:226](../../src/components/gameUploadComponents/GameUploadForm.tsx#L226) | 100% 이후 "파일 전송이 끝났습니다. 서버 응답을 기다리고 있습니다. 아직 등록이 끝나지 않았습니다." | 100%를 완료로 오해하지 않게 한다 (3장) |
| [GameUploadForm.tsx:228](../../src/components/gameUploadComponents/GameUploadForm.tsx#L228) | 등록 API 처리 중에도 "아직 등록이 끝나지 않았습니다." | 위와 같음 |
| [GameUploadForm.tsx:229](../../src/components/gameUploadComponents/GameUploadForm.tsx#L229) | 지연 안내. 완료 시간은 약속하지 않음 | (5장) |
| [GameUploadForm.tsx:291](../../src/components/gameUploadComponents/GameUploadForm.tsx#L291) | 확인 모달: 서버 검증 → 관리자 검수 순서를 안내하고, 접수 후에는 이동해도 된다고 안내 | 이탈 위험(업로드 중)과 접수 후 이동 가능성을 구분한다 (5장) |
| [GameUploadFields.tsx:51](../../src/components/gameUploadComponents/GameUploadFields.tsx#L51), [uploadErrorMessages.tsx:16](../../src/components/gameUploadComponents/uploadErrorMessages.tsx#L16), [gameZipValidation.ts:5](../../src/util/gameZipValidation.ts#L5) | 용량 표기 "500MB" → "500MiB(524,288,000바이트)" | 실제 제한(500×1024×1024)과 표기를 맞춘다 (3장) |
| [tests/f05-banner.test.tsx](../../tests/f05-banner.test.tsx) | 배너가 검증 성공·실패 결과로 갱신되는지 시험 | — |

## F06: S3 덮어쓰기 차단 헤더

| 파일:라인 | 무엇을 바꿨나 | 왜 (구현서) |
|---|---|---|
| [api/upload.ts:23](../../src/api/upload.ts#L23) | S3 PUT 헤더에 `If-None-Match: *` 추가 | BE가 이 헤더를 서명에 포함하므로 반드시 보내야 한다. 객체가 이미 있으면 S3가 412로 거부한다 (4.7) |
| [hook/useGameUpload.ts:57](../../src/hook/useGameUpload.ts#L57) | 412: "업로드 파일이 이미 존재합니다. 파일을 다시 선택해주세요." 표시, 캐시 키 폐기 | 다음 시도는 새 presign부터 시작한다 (4.7) |
| [hook/useGameUpload.ts:62](../../src/hook/useGameUpload.ts#L62) | 등록 409: "이미 접수된 파일일 수 있습니다. 개발목록을 확인해주세요." 표시, 불확실 상태로 전환 | 앞선 요청이 접수되었을 수 있으므로 재등록 전에 확인하게 한다 (4.7) |

**배포 조건:**
- S3 버킷 CORS는 `AllowedHeaders: ["*"]`이라 이미 충족된다(2026-10-30 확인).
- FE와 BE는 함께 배포해야 한다. 서명 조건이 서로 맞아야 업로드가 성공한다.

## N07: 검증 실패 결과에 재확인 버튼 대신 파일 수정 링크 (통합 테스트 후속, 2026-11-16)

통합 테스트(`log/local-test-20261109-presigned/FINDINGS.md` N07)에서 확정된 실패(invalid)에도 "결과 다시 확인" 버튼이 나와, 다음 행동(파일 수정)과 맞지 않는다는 점을 확인해 고쳤다.

| 파일:라인 | 무엇을 바꿨나 | 왜 |
|---|---|---|
| [ZipValidationStatus.tsx:33](../../src/components/gameUploadComponents/ZipValidationStatus.tsx#L33) | 재확인 버튼 조건에서 valid와 invalid를 모두 제외 | 확정된 결과는 다시 조회해도 바뀌지 않는다 |
| [ZipValidationStatus.tsx:38](../../src/components/gameUploadComponents/ZipValidationStatus.tsx#L38) | invalid일 때 "파일 수정하기" 링크(`/game-edit/{게임 ID}`) 표시 | 실패 사유 바로 아래에서 수정 화면으로 이동하게 한다 |
| [tests/f01-zip-validation.test.tsx](../../tests/f01-zip-validation.test.tsx) | 실패 시 링크 표시·재확인 버튼 미표시 검증, 라우터 감싸기 | — |

## 검증

- Vitest 14개 파일, 64개 테스트 통과(`npm test`). F02와 F04는 수정 전 코드에서 실패하는 것도 확인했다.
- `npm run build` 통과. 큰 번들 경고는 기존과 같다.
- `npm run typecheck`: 21개 오류가 있으나 모두 이번에 변경하지 않은 파일의 기존 오류다. 변경한 파일에서는 오류가 없다.
- 위 시험은 모두 API를 mock한 것이다. 실제 브라우저·S3·Celery worker를 연결한 통합 시험(T01~T06)은 아직 하지 않았다.
