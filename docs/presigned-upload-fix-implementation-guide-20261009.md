# Presigned 게임 등록 테스트 후속 수정 구현 지침서

작성일: 2026-10-09 KST  
상태: 구현 전 지침. 이번 작업은 문서 작성으로 종료하며 코드 변경, 마이그레이션, 서비스 실행 및 배포는 수행하지 않는다.

## 1. 목적과 적용 범위

게임 등록의 접수, 서버 ZIP 검증, 관리자 검수 및 공개를 구분하고, 정상 입력으로 제출할 수 있으며 새로고침 후에도 등록 상태를 확인할 수 있게 한다. FE와 BE의 변경 지점, 상태 계약, 구현 순서 및 인수 기준을 정의한다.

첨부 자료의 개선 제안과 실행 절차는 분석 근거다. 이를 현재 구현이나 테스트 실행을 허가하는 지시로 취급하지 않는다. 아래 API 필드와 상태 이름, 조회 간격은 구현 권장 계약이며 현재 제공되는 기능이 아니다.

기존 `ui-ux-implementation-guide.md`는 수정하지 않는다. 기존 `register_state` 0·1·2의 의미와 접수 문구 `검수 요청 완료`를 유지하면서 기존 Celery 결과에 ZIP 판정을 담고 기존 상태 조회 API를 재사용하는 후속 지침이다. DB 스키마는 변경하지 않는다. ZIP 검증 성공은 관리자 승인이나 게임 공개 완료를 의미하지 않는다.

## 2. 근거와 수정 우선순위

주요 근거:

- [기본 테스트 README](../log/local-test-20261009-presigned-2004/README.md), [발견 사항 F01~F05](../log/local-test-20261009-presigned-2004/FINDINGS.md)
- [Maze 추가 테스트 README](../log/local-test-20261009-presigned-maze-2100/README.md), [추가 발견 사항](../log/local-test-20261009-presigned-maze-2100/FINDINGS.md)
- [기본 테스트 코드 흐름](../log/local-test-20261009-presigned-2004/flow.md)

| 항목 | 우선순위 | 확인된 현상 | 수정 방향 |
|---|---|---|---|
| F01 | P1 필수 | 서버 ZIP 검증 성공 뒤 별도 완료 안내가 없음 | 기존 Celery 결과 저장소와 get_task_status 활용, FE 최종 안내 |
| F02 | P1 필수 | ZIP을 마지막에 선택하면 검사 통과 후에도 제출 불가. 제목 재입력으로 활성화 | 비동기 검사와 폼 유효성 동기화, 비활성 사유 표시 |
| F03 | P1 필수 기반 | Celery SUCCESS/null인데 실제 ZIP은 invalid이고 자동 반려됨 | 작업 실행 상태와 파일 유효성 결과 분리 |
| F04 | P1 필수 | 등록 직후 있던 개발목록이 새로고침 후 비어 보임. DB와 직접 상세는 유지 | 인증 복원·요청 경로·캐시·서버 조건 진단 후 수정 |
| F05 | P2 개선 | API 완료 문구가 접수 시점에 반환되고 장기 대기 단계가 부족함. 반려 후 접수 배너 잔존 | 접수 표현 통일, 단계별 안내, 최신 결과로 배너 갱신 |

P1은 정상 등록 또는 결과 확인을 방해하므로 출시 전 해결 대상으로 권고한다. P2 문구 변경은 관련 상태 구현과 함께 반영한다. F03은 자동 반려 기능 자체의 실패가 아니라 잘못된 성공 판정을 방지하기 위한 계약 문제다.

F02의 구체적 원인과 F04의 근본 원인은 아직 확정되지 않았다. 아래 소스 관찰은 진단 후보이며 실행 증거를 대체하지 않는다. Maze 시험의 후보 task_id는 game20과 연결이 입증되지 않았으므로 ZIP 성공 증거로 쓰지 않는다. 성공 시점 판단의 기준은 기본 시험 T03이다.

## 3. 유지할 동작과 범위 밖 항목

- 실제 S3 전송 바이트 기반 진행률과 `게임 파일 업로드 중 · N%`를 유지한다. 100%는 전체 등록 완료가 아니며 PUT 응답과 등록 API 처리가 남을 수 있다.
- 업로드 및 API 대기 중 입력·확인 버튼 잠금과 중복 제출 차단을 유지한다. 기존 시험에서는 반복 클릭에도 presign/PUT/등록 POST가 각각 1회였다.
- S3 PUT 실패 시 재시도, 서버 검증 실패 시 자동 반려·사유·수정 진입을 유지한다. 반려 후 실제 재제출 완료는 기존 시험에서 검증하지 않았으므로 후속 인수 시험에 포함한다.
- ZIP 상한 500MiB를 유지한다. 582,998,091바이트의 Mazegamebig.zip 거부는 정상 동작이며 결함이 아니다. 필요하면 화면 단위를 `500MiB` 또는 `500MB(524,288,000바이트)`로 명확하게 표시한다.
- Unity 실제 실행, 이메일 인증 회원가입, 관리자 승인·공개 절차 개편은 이번 수정 범위 밖이다. 이들 기능의 정상 동작을 이번 테스트 결과로 주장하지 않는다.

## 4. DB 스키마 변경 없는 ZIP 검증 결과 계약

### 4.1 조사 결과와 채택안

사용자 추가 요구에 따라 신규 검증 테이블, Game 필드, DB 마이그레이션을 추가하지 않는다. 기존 register_state도 유지한다. 저장소의 의존성은 Celery 5.4.0, django-celery-results 2.5.1이며 현재 설정은 `CELERY_RESULT_BACKEND='django-db'`, `CELERY_TASK_TRACK_STARTED=True`다. 실행 환경의 override는 구현 시 확인한다.

채택안은 **Celery 기본 상태 + 구조화된 task 반환값 + 기존 get_task_status 재사용**이다. 기존 django-celery-results 결과 테이블을 재사용하므로 스키마 변경은 없다. 기존 결과 테이블에 대한 데이터 기록까지 없앤다는 뜻은 아니다. result backend 전체 교체는 범위에 포함하지 않는다.

| 대안 | 판단 |
|---|---|
| 기본 상태 유지 + result.outcome 반환 | 권장. 현재 get_task_status가 SUCCESS 때 반환값을 내려주는 구조 활용 |
| VALIDATING/PROGRESS 커스텀 중간 상태 | 가능하나 선택 사항. STARTED로 충분하며, 도입 시 현재 API에 안전한 meta 응답 보완 필요 |
| VALID/INVALID 커스텀 종료 상태 | 비권장. 기본 완료 상태 집합 및 successful()과 다르므로 현재 API와 클라이언트 완료 판정 변경 필요 |
| Redis에 검증 결과 직접 저장 | 가능하지만 기존 result backend와 중복. 이번에는 복원·권한용 매핑에만 활용 |
| S3 is_used 태그로 판정 | 파일 유효성 결과·실패 사유를 대체하지 못함 |

Celery는 update_state로 커스텀 상태를 지원하지만, 일반적인 task 반환은 최종 SUCCESS로 기록된다. update_state('VALID') 뒤 단순 return으로 커스텀 종료 상태가 보존된다고 가정하지 않는다. [Celery 5.4 상태 문서](https://docs.celeryq.dev/en/v5.4.0/userguide/tasks.html#states), [완료 상태 정의](https://docs.celeryq.dev/en/v5.4.0/reference/celery.states.html)

### 4.2 task 반환값

validate_game_zip_task는 아래 구조의 JSON 직렬화 가능한 dict를 반환한다. 새로운 DB 상태 필드나 Celery 상태를 추가하는 것이 아니다.

```json
{"kind":"game_zip_validation","schema_version":1,"game_id":15,"submission_id":"제출 UUID","outcome":"valid","reason_code":null,"reason":null}
```

| Celery 상태와 결과 | 의미와 UI 처리 |
|---|---|
| SUCCESS + valid | 유효 판정 및 필요한 후속 처리 완료. 파일 검증 완료 안내, register_state=0 유지 |
| SUCCESS + invalid | 파일 부적합 판정과 기존 자동 반려 처리 완료. register_state=2, 사유 표시 |
| SUCCESS + skipped | 삭제·파일 교체 등으로 해당 결과를 적용하지 않음. 최신 제출 재조회 |
| FAILURE | 검증 실행 실패. 파일 부적합과 구분 |
| PENDING / STARTED / RETRY | 미확정/실행중/재시도중 |
| REVOKED | 작업 중단 |
| SUCCESS + null 또는 알 수 없는 결과 형식 | 구형 작업 또는 호환 불가. 검증 성공으로 처리하지 않음 |

기존 None 반환 경로를 모두 점검한다. 재시도 소진 시 예외를 삼켜 SUCCESS/null로 끝내지 않는다. retry(exc=...)는 상황에 따라 원래 예외를 다시 발생시킬 수 있으므로 MaxRetriesExceededError만 처리하면 충분하다고 가정하지 말고 실제 FAILURE 기록을 시험한다.

### 4.3 기존 get_task_status 재사용

등록 POST 및 ZIP 교체 PUT은 기존 envelope의 data에 game_id/task_id/submission_id를 추가하고 message를 `검수 요청이 접수되었습니다`로 맞춘다. 파일 유지 수정은 새 검증 작업을 발행하지 않는다.

조회는 기존 `GET /directs/api/list/task-status/{task_id}/` 및 `qnas.views.get_task_status()`를 사용한다. ZIP 전용 상태 endpoint를 추가하지 않는다. 기존 task_id/status/result 필드와 관리자 공개 처리 작업의 반환 형식을 유지한다.

```json
{"task_id":"작업 UUID","status":"SUCCESS","result":{"kind":"game_zip_validation","schema_version":1,"game_id":15,"submission_id":"제출 UUID","outcome":"invalid","reason_code":"SYMLINK_NOT_ALLOWED","reason":"심볼릭 링크를 확인했습니다."}}
```

현재 함수의 successful() 분기에서 위 dict를 그대로 반환할 수 있다. 다만 다음 보완이 필요하다.

1. 현재 함수에 명시적인 작업 소유자 검사가 없으므로 인증·권한을 추가한다. 서버의 작업 매핑과 현재 게임 소유자를 확인해 ZIP 작업은 소유자/관리자, 관리자 공개 작업은 관리자에게만 허용한다. UUID를 아는 것만으로 권한을 인정하지 않는다.
2. FE getApprovalTask()는 response.data.data를 읽으므로 공통 응답 래퍼를 거친 실제 JSON을 확인한다. Celery status와 envelope status를 구분하고 공용 조회 함수를 재사용한다.
3. FAILURE에서 원시 exception/traceback을 노출하지 않는다. 기존 result=null을 유지하면서 필요하면 안전한 error_code/message를 추가한다.
4. HTTP 요청에서 AsyncResult.get()으로 완료를 기다리지 않는다.
5. 존재하지 않는 작업, 만료·유실, 조회 저장소 장애는 HTTP 오류나 별도 lookup_status로 구별한다. Celery 상태값을 임의로 변조하지 않는다.

### 4.4 작업 ID 복원과 보관기간

task 반환값만 바꾸면 현재 화면에서는 조회할 수 있지만 새 탭에서 task_id를 복원할 수 없다. DB 스키마 추가 없이 이를 보완하기 위해 기존 Redis에 TTL이 있는 서버 매핑을 두는 방식을 권장한다.

- task_id → kind, owner_id, game_id, submission_id, file_key, created_at, publish_status
- game_id + 현재 file_key → 최신 task_id, submission_id

이는 복원과 권한 확인용 인덱스다. 최종 결과는 기존 Celery backend에 둔다. 업로드 키는 제출마다 고유하고 불변이어야 하며 같은 키의 덮어쓰기·재사용을 허용하지 않는다. submission_id는 UUID로 발급하고 DB 버전 필드를 추가하지 않는다.

매핑을 작업 발행 전에 기록한다. 파일별 키와 원자적 갱신으로 늦은 구형 콜백이 현재 제출을 대체하지 못하게 한다. 본인 개발목록/상세의 기존 serializer에서 현재 파일의 task_id/submission_id만 부가 정보로 제공하고 상태는 기존 get_task_status에서 가져온다. 결과 DB를 목록의 각 항목마다 반복 조회하지 않는다. 로컬 저장소는 보조 수단이며 복원의 유일한 근거로 사용하지 않는다.

조회 보장 기간의 기본 제안은 접수 후 7일이다. result backend의 보관기간·cleanup과 Redis TTL·영속성 설정을 확인해 같은 기간을 맞춘다. Celery 기본 result_expires는 1일이므로 현재 설정으로 7일이 보장된다고 가정하지 않는다. 전역 보관기간 변경은 관리자 작업과 저장량에도 영향을 준다. [결과 보관 설정](https://docs.celeryq.dev/en/v5.4.0/userguide/configuration.html#result-expires)

매핑/결과의 만료나 유실은 결과 확인 불가로 처리하고 기존 게임·관리자 검수 상태를 계속 표시한다. Celery PENDING은 알 수 없는 task_id에도 반환되므로 영구 대기로 해석하지 않는다. 매핑과 발행 성공 기록이 있어도 실제 큐 소비를 증명하지는 않는다. 대기 한도 초과는 미확정 안내이며 시간 경과만으로 valid/invalid를 판정하지 않는다.

이 설계는 영구적인 ZIP 성공 이력을 보장하지 않는다. 조회 보장 기간 이후에도 과거 성공 증명이 필요하다면 결과 장기 보존이나 별도 영속 기록이 필요하다. 기존 register_state=0 또는 SUCCESS/null을 valid로 보정하지 않는다. F04의 게임 목록 복원 자체는 task 기록 만료와 무관하게 해결한다.

### 4.5 작업 발행과 파일 교체 경합

1. task_id/submission_id를 미리 발급하고 transaction.on_commit 이후 apply_async(task_id=...)로 같은 ID를 발행한다. 작업 인자로 대상 game_id와 불변 file_key를 고정한다.
2. worker는 현재 Game 파일 키와 작업 대상 키를 비교한다. 반려·로그 변경 시 기존 Game 행 잠금이나 조건부 갱신으로 파일 교체와의 경합을 막는다. 검사 내내 잠금을 유지하지 않는다.
3. 오래된 파일 작업은 skipped로 처리한다. FE도 현재 task_id/submission_id와 일치하는 결과만 반영한다.
4. 기존 자동 반려·사유를 유지하고 동일 작업 재실행 시 중복 로그·알림을 방지한다. 외부 알림의 정확히 한 번 전달까지 보장한다고 표현하지 않는다.
5. safe_s3_tag의 실패 처리 방식을 확인한다. 필요한 보존 태그가 적용되지 않았는데 valid를 반환하지 않도록 검사하고 재시도한다.
6. 알림 on_commit 콜백 실패와 검증 발행을 격리한다. Redis 매핑/큐 발행 실패는 접수 결과와 구분해 기록·안내하고 재등록을 유도하지 않는다.
7. 상태 조회 GET에서 작업을 재발행하지 않는다. 복구는 동일 제출에 대한 운영 재처리로 수행한다. DB와 Redis/브로커 사이의 원자성은 이 설계만으로 완전히 보장되지 않으므로 중간 실패 시험을 포함한다.

## 5. FE 단계와 최종 안내

useGameUpload의 현재 completed는 등록 API 응답 시점이다. 의미를 accepted처럼 접수로 명확히 하고 반환된 task_id로 기존 API를 polling한다. ZIP 검증 때문에 폼에서 대기를 강제하지 않는다.

| 단계 | 안내 |
|---|---|
| 로컬 검사 | 파일 확인 중입니다. 제출 차단 |
| S3 전송 | 게임 파일 업로드 중 · N%. 입력·중복 제출 잠금 |
| 등록 API 처리 | 검수 요청을 처리 중입니다. 잠금 유지 |
| 접수/PENDING | 검수 요청 완료. 서버 파일 검증을 기다리고 있습니다 |
| STARTED/RETRY | 파일 검증 중 / 검증 재시도 중 |
| SUCCESS + valid | 게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다 |
| SUCCESS + invalid | 게임 파일 검증에 실패했습니다. 사유 및 수정 진입 표시 |
| FAILURE/REVOKED | 검증 처리 실패/중단. 재조회 및 운영 재처리 안내 |
| skipped/null/조회 불가 | 현재 파일의 결과 재확인. 자동 성공 처리 금지 |

같은 게임·제출의 최신 결과로 접수 배너를 갱신하거나 제거한다. 관리자 검수 배지와 ZIP 결과를 구분하며 관리자 승인·공개 상태를 자동 변경하지 않는다.

예를 들어 진행 중 5초 간격, 장기 대기 시 15~30초 간격으로 조회한다. 간격은 제안값이며 django-db 부하를 고려한다. SUCCESS/FAILURE/REVOKED 및 식별자 만료·조회 불가에서 무한 polling을 종료하고 수동 재조회 경로를 제공한다. 관리자 검수 상태 조회는 별도로 유지한다.

새로고침·재진입 때 목록/상세에서 task_id를 복원한다. 보관기간 내 최신 결과를 복구하며 이후에는 검증 결과 확인 불가와 기존 검수 상태를 구분한다. WebSocket 없이도 동작해야 한다. 30초 이상 대기 시 지연 안내를 추가할 수 있으나 완료 예정 시간을 보장하지 않는다. 업로드/API 대기 중 이탈 위험과 접수 후 이동 가능성을 구분한다.


## 6. ZIP 선택 후 버튼 비활성 수정

진단 시 `GameUploadForm`의 `checking`, `fileError`, `gameFile`, `formState.isValid`, `formState.errors`, 동의 상태를 ZIP 선택 전후로 확인한다. 현행 코드는 이미 `setValue(..., { shouldValidate: true })`를 호출하므로 옵션을 추가하는 것만으로 해결했다고 판단하지 않는다. `gameFile`의 폼 등록 여부, 수동 등록 필드, 비동기 검사 완료 시 전체 검증 완료 순서를 확인한다.

구현 요건:

1. 파일의 검사 상태를 `미선택/검사중/통과/실패`로 명확히 관리한다. 파일 교체 직후 기존 통과 상태와 캐시 키를 무효화한다.
2. 최신 파일 검사 성공 뒤 폼 값을 반영하고 필요한 필드 또는 전체 폼 검증을 완료한다. `trigger` 사용 여부는 진단 결과에 따라 정하되 검사 완료와 폼 유효성 판정의 순서를 보장한다.
3. 기존 selection 버전 방어를 유지한다. 파일 A 검사 중 B를 선택했을 때 A의 늦은 성공·실패가 B 상태를 덮어쓰면 안 된다.
4. 제목 재입력, 임의의 타이머, 강제 활성화, `isValid` 무시로 우회하지 않는다. 최종 submit에서도 동일한 유효성 조건을 검사한다.
5. 비활성 사유를 실제 조건에 맞게 표시한다. 필수 입력 누락, ZIP 검사중, 검사 실패, 동의 누락, 결과 불확실을 구분한다.
6. 신규 등록, 반려 후 파일 필수 교체, 일반 수정 시 기존 파일 유지 조건을 각각 보존한다.

## 7. 새로고침 후 개발목록 복원

현재 `MyPage`는 인증 정보 로딩 중 `isMyPage=null`이 될 수 있다. `MyGame`은 이를 false 분기로 처리할 수 있으며 query key에 본인/공개 조회 구분이 없다. 인증 복원 중 공개 조회 결과가 본인 목록 캐시와 섞일 가능성이 있는 구체적인 진단 후보다. 이를 원인 확정으로 취급하지 않는다.

진단 순서:

1. 새로고침 전후 로그인 복원 완료 시점, URL 사용자 ID, `isMyPage`, 실제 요청 URL·인증 유무·응답·페이지 번호를 기록한다. 토큰 값은 로그에 남기지 않는다.
2. 공개 목록과 본인 개발목록 중 어떤 API가 실행되는지, 인증 복원 뒤 올바른 API가 재호출되는지 확인한다.
3. BE의 작성자 조건, `register_state`, `is_visible`, 페이지네이션과 실제 게임 소유자를 대조한다. DB 잔존만으로 API가 정상이라고 단정하지 않는다.

진단에 따른 수정 요건:

- 인증 초기화가 끝나고 대상 ID·조회 모드가 결정될 때까지 본인 목록 query를 비활성화한다. 로그인되지 않은 상태와 인증 복원 중인 상태를 구별한다.
- query key에 조회 대상 사용자, 본인/공개 조회 모드, 페이지를 반영한다. queryFn의 분기와 key가 같은 의미를 갖게 하고 사용자·모드 변경 시 페이지 및 캐시 사용을 점검한다.
- 로딩, 인증 실패, 조회 실패, 실제 빈 목록을 별도로 표시한다. 본인 목록 API의 성공 응답이 빈 배열일 때만 `개발중인 게임이 없습니다`를 표시한다.
- 해당 게임의 직접 상세 진입에서도 서버 상태를 복원한다. 목록 실패를 등록 실패로 안내하거나 재등록을 유도하지 않는다.
- 공개 목록의 접근 제한과 미승인 게임 비공개 조건을 풀어서 해결하지 않는다.

## 8. 수정 대상 지도와 구현 순서

경로는 아래에 표시한 FE/BE 저장소를 기준으로 한다. 신규 모델은 만들지 않으며, 작업 매핑 모듈의 파일 분리는 구현 시 기존 구조에 맞춘다.

| 저장소 | 파일 | 책임 |
|---|---|---|
| BE | 기존 모델·마이그레이션 | 변경 없음. register_state 의미 유지 |
| BE | `games/views.py`, `games/serializers.py` | 등록/교체 응답과 상세의 작업 ID 매핑 |
| BE | `games/tasks.py` | 파일 키 고정 검증, dict 반환, 반려·재시도·중복 방어 |
| BE | `users/views.py`, `users/serializers.py` | 본인 목록 조건 진단 및 Redis 매핑의 작업 ID 전달 |
| BE | `qnas/views.py`, Redis 매핑 모듈 | 기존 get_task_status 재사용, 권한·만료 처리 |
| FE | `src/api/game.ts`, `src/api/user.ts`, `src/api/direct.ts`, `src/types/index.ts` | 공용 task 조회와 기존 관리자 호출 호환 |
| FE | `src/hook/useGameUpload.ts` | 전송/접수 의미 분리, 식별자 전달 |
| FE | `src/components/gameUploadComponents/GameUploadForm.tsx`, `GameUploadFields.tsx` | 폼 동기화, 사유·대기 안내 |
| FE | `src/page/MyPage.tsx`, `src/components/myPageComponents/MyGame.tsx`, `MyGameCard.tsx` | 인증 복원, 목록 조회, 상태 배지·결과 배너 |
| FE | `src/page/GameDetail.tsx`, `src/hook/useNotifications.ts` | 상세 상태 복원, 알림 기반 캐시 갱신 |

권장 순서는 다음과 같다.

1. F02/F04 재현과 원인 진단을 먼저 기록한다. 확정 전에는 추정에 기반한 대규모 리팩터링을 하지 않는다.
2. FE·BE가 상태 계약을 확정한 뒤 기존 API/worker와 Redis 매핑을 구현한다. 새 ZIP과 기존 ZIP 유지 수정의 차이를 포함한다.
3. 폼 활성화 및 목록 복원 문제를 수정하고 FE의 ZIP 완료 안내를 연결한다.
4. 장시간 안내·문구·배너를 정리한 뒤 아래 인수 시험을 수행한다.

배포 시 신규 모델과 마이그레이션을 만들지 않는다. 구조화된 반환값, Redis 매핑, 권한을 보완한 기존 조회 API를 먼저 제공하고 FE를 연결한다. 큐에 남은 구형 인자 작업과 SUCCESS/null fallback을 시험한다. 관리자 공개 처리 task의 응답 계약과 권한을 함께 검증한다.

## 9. 인수 시험과 완료 기준

아래는 구현 후 수행할 계획이며 이번 문서 작성 중 실행한 결과가 아니다. 단위/통합 시험은 상태 전이·경합·폼 및 query 동작을 검증하고, 실제 UI·S3·API·worker 시험으로 단계 연결을 확인한다.

| 시험 | 조작 | 통과 기준 |
|---|---|---|
| T01/F02 기본 등록 | 모든 필수 입력·동의 후 ZIP을 마지막에 선택 | 검사 완료 후 추가 입력 없이 버튼 활성화, 한 번 제출로 정상 접수 |
| F02 입력 순서 | ZIP 먼저/중간/마지막, 썸네일·동의 마지막, 파일 A→B 빠른 교체 | 순서와 무관하게 조건 충족 시 활성화. 오래된 검사 결과 무시 |
| T02 API 지연 | PUT 성공 후 등록 응답을 지연 | 100%를 전체 완료로 표시하지 않음. 처리 문구·잠금 유지 |
| T03/F01 성공 | 전용 큐 소비를 멈춰 접수 확인 후 worker 재개 | 접수 때 대기 안내. 기존 API에서 해당 제출의 SUCCESS + valid 확인 후 완료 안내. 관리자 검수는 별도 |
| T04/F03 무효 | 서버에서 거부되는 심볼릭 링크 ZIP 제출 | Celery SUCCESS라도 UI는 invalid/반려, 사유와 수정 진입 표시, 접수 배너 갱신 |
| 반려 후 재제출 | 수정한 정상 ZIP으로 재검수 제출 | 새 제출 검증 및 성공 안내. 이전 반려 결과가 새 제출을 덮어쓰지 않음 |
| 일반 수정 | 파일 변경 없이 제목 등 수정 | 기존 검증 결과 보존, 새 ZIP 검증·업로드 및 완료 안내를 잘못 생성하지 않음 |
| T05 업로드 실패 | 특정 S3 PUT 실패 후 재시도 | 실패 때 등록 POST가 실행되지 않음. 재시도 성공, 중복 게임 없음 |
| T06 장기 대기 | API 120초 지연 및 ZIP 큐 대기를 각각 시험 | 단계별 지연 안내. 반복 클릭 시 중복 요청 없음. 접수 후 이동 가능 |
| F04 새로고침 | 접수/valid/invalid 각 상태에서 새로고침, 새 탭 직접 진입 | 보관기간 내 task_id와 결과 복원. 만료 후에도 게임은 표시. 인증 로딩을 빈 목록으로 표시하지 않음 |
| F04 권한·실패 | 인증 복원 지연, 401, 목록 5xx, 실제 빈 계정 | 올바른 로딩/로그인/오류/빈 상태 구분, 공개·본인 캐시 혼용 없음 |
| Maze 전송 | 58,623,752바이트 ZIP을 실제 업로드 | 바이트 기반 진행률, PUT→API→검증 단계 연결. 게임·작업·제출 식별자 증거 확보 |
| T07 용량 | 500MiB 초과 ZIP 선택 | FE에서 차단, presign/PUT/등록 POST 없음. 제한 우회 없음 |
| worker 복구 | 큐 발행 실패, 재시도 소진, 태깅 실패, 중복 작업 | 무한 대기 방지, error와 invalid 구분, 로그·알림 중복 방지 |
| 파일 교체 경합 | 이전 파일 작업 중 새 ZIP 제출 후 이전 작업 완료 | 이전 작업의 성공/실패가 현재 결과·반려·알림에 영향 없음 |
| 알림 누락 | WebSocket 없이 검증 종료 및 새로고침 | 보관기간 내 polling/재조회로 완료 확인, route state 없이 복원 |
| 기존 API 호환 | 관리자 공개 처리와 ZIP 작업 각각 조회 | 같은 endpoint에서 기존 관리자 결과와 ZIP outcome을 올바르게 해석 |
| 결과 판별 | SUCCESS + valid/invalid/skipped/null, FAILURE/RETRY/REVOKED | ZIP valid만 완료 안내 |
| 조회 권한 | 비로그인·타인·관리자로 조회 | ZIP은 소유자/관리자만, 관리자 작업은 관리자만 조회 |
| 보관기간·유실 | 매핑 만료, 결과 cleanup, Redis 유실, 알 수 없는 UUID | 성공/영구 PENDING으로 오판하지 않음. 기존 게임 목록 유지 |
| 스키마 제약 | 변경 파일과 마이그레이션 확인 | 새 모델·필드·마이그레이션 없음 |

각 실통합 시험은 입력 조건, 응답, 화면, 기존 DB 및 Celery 결과와 `game_id/submission_id/task_id` 연결을 보관한다. 서로 다른 장비의 시계 오차를 기록하고 단순 타임스탬프 비교만으로 순서를 확정하지 않는다. API 200, PUT 200, Celery SUCCESS 각각을 최종 ZIP 성공 근거로 대신 사용하지 않는다.

출시 판단은 P1 항목과 관련 회귀 시험의 통과를 기준으로 한다. 특히 제목 재입력 우회가 필요하거나, 검증 성공 후 안내가 없거나, 새로고침 후 목록이 비어 보이면 정상 등록 흐름 통과로 판정하지 않는다. 미실행 항목은 완료로 표시하지 않는다.


