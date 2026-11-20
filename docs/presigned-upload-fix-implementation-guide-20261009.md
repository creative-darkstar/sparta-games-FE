# Presigned 게임 등록 테스트 후속 수정 구현 지침서

최초 작성: 2026-10-09 KST
개정: 2026-10-26 KST (변경 내용은 [11. 변경 이력](#11-변경-이력) 참고)
상태: **확정본 (2026-10-30 사용자 확정).** 이 문서를 기준으로 구현한다.

## 1. 목적과 적용 범위

게임 등록의 **접수**, **서버 ZIP 검증**, **관리자 검수·공개**를 구분한다. 정상 입력으로 제출할 수 있어야 하고, 새로고침한 뒤에도 등록 상태를 확인할 수 있어야 한다. 이 문서는 FE와 BE의 변경 지점, 상태 계약, 구현 순서, 인수 기준을 정의한다.

첨부 자료의 개선 제안과 실행 절차는 분석 근거다. 현재 구현이나 테스트 실행을 허가하는 지시로 취급하지 않는다.

기존 `ui-ux-implementation-guide.md`는 수정하지 않는다. 다음은 유지한다.

- `register_state` 0·1·2의 의미와 접수 문구 `검수 요청 완료`
- DB 스키마. 모델, 필드, 마이그레이션을 추가하지 않는다.

ZIP 검증 성공은 관리자 승인이나 게임 공개 완료를 의미하지 않는다.

## 2. 근거와 수정 우선순위

주요 근거:

- [기본 테스트 README](../log/local-test-20261009-presigned-2004/README.md), [발견 사항 F01~F05](../log/local-test-20261009-presigned-2004/FINDINGS.md)
- [Maze 추가 테스트 README](../log/local-test-20261009-presigned-maze-2100/README.md), [추가 발견 사항](../log/local-test-20261009-presigned-maze-2100/FINDINGS.md)
- [기본 테스트 코드 흐름](../log/local-test-20261009-presigned-2004/flow.md)

| 항목 | 우선순위 | 확인된 현상 | 수정 방향 |
|---|---|---|---|
| F01 | P1 필수 | 서버 ZIP 검증 성공 뒤 별도 완료 안내가 없음 | task_id를 계산 가능하게 하고, 기존 get_task_status로 결과를 조회해 FE가 최종 안내 |
| F02 | P1 필수 | ZIP을 마지막에 선택하면 검사 통과 후에도 제출 불가. 제목을 다시 입력해야 활성화됨 | 비동기 검사와 폼 유효성 동기화, 비활성 사유 표시 |
| F03 | P1 필수 기반 | Celery는 SUCCESS/null인데 실제 ZIP은 invalid이고 자동 반려됨 | task 실행 상태와 파일 유효성 결과 분리 |
| F04 | P1 필수 | 등록 직후 있던 개발목록이 새로고침 후 비어 보임. DB와 직접 상세 진입은 정상 | 인증 복원·조회 모드·캐시 키·서버 빈 목록 응답 수정 |
| F05 | P2 개선 | 접수 시점에 API가 "등록 완료" 문구를 반환. 장기 대기 안내가 부족함. 반려 후에도 접수 배너가 남음 | 접수 표현 통일, 단계별 안내, 최신 결과로 배너 갱신 |
| F06 | P1 보안 | 업로드 키 재사용과, 검증 후 같은 presigned URL로 파일을 바꿔치기하는 것을 막지 못함 | DB 조회로 재사용 차단, S3 조건부 업로드(`If-None-Match`)로 덮어쓰기 차단 |

P1은 정상 등록, 결과 확인, 업로드 무결성에 영향을 주므로 출시 전 해결 대상이다. P2 문구 변경은 관련 상태 구현과 함께 반영한다. F03은 자동 반려 기능 자체가 고장 난 것이 아니라, 잘못된 성공 판정을 막기 위한 계약 문제다.

Maze 시험의 후보 task_id는 game20과의 연결이 입증되지 않았다. 따라서 ZIP 성공 증거로 쓰지 않는다. 성공 시점 판단의 기준은 기본 시험 T03이다.

## 3. 유지할 동작과 범위 밖 항목

- **업로드 진행률:** 실제 S3 전송 바이트 기준 진행률과 `게임 파일 업로드 중 · N%` 표시를 유지한다. 100%는 전체 등록 완료가 아니다. PUT 응답과 등록 API 처리가 남아 있을 수 있다.
- **잠금과 중복 제출 차단:** 업로드·API 대기 중 입력과 확인 버튼 잠금을 유지한다. 기존 시험에서는 반복 클릭해도 presign/PUT/등록 POST가 각각 1회였다.
- **실패 처리:** S3 PUT 실패 시 재시도, 서버 검증 실패 시 자동 반려·사유 표시·수정 진입을 유지한다.
- **ZIP 상한 500MiB:** 그대로 유지한다. 582,998,091바이트 Mazegamebig.zip이 거부된 것은 정상 동작이다. 화면 단위는 `500MiB`로 명확히 표시할 수 있다.
- **범위 밖:** Unity 실제 실행, 이메일 인증 회원가입, 관리자 승인·공개 절차 개편. 이들 기능이 정상이라고 이번 테스트 결과로 주장하지 않는다.

## 4. BE: ZIP 검증 결과 계약 (DB 스키마 변경 없음)

### 4.1 채택안

현재 의존성과 설정:

- Celery 5.4.0, django-celery-results 2.5.1
- `CELERY_RESULT_BACKEND='django-db'`, `CELERY_TASK_TRACK_STARTED=True`

채택안은 다음 네 가지의 조합이다.

1. Celery 기본 상태를 그대로 사용한다.
2. task가 구조화된 dict를 반환한다.
3. task_id를 **계산으로 정한다**(결정적 task_id).
4. 기존 `get_task_status`에 `game_id` 기반 권한 검사를 추가한다.

기존 django-celery-results 결과 테이블을 그대로 쓰므로 스키마는 바뀌지 않는다.

| 대안 | 판단 |
|---|---|
| 기본 상태 유지 + 반환값에 outcome | **채택.** get_task_status가 SUCCESS일 때 반환값을 내려주는 기존 구조를 활용 |
| 결정적 task_id (게임 ID + 파일 키로 계산) | **채택.** 서버가 현재 DB만으로 언제든 같은 ID를 다시 계산할 수 있어 별도 저장소가 필요 없음 |
| Redis에 task_id↔게임·소유자 매핑 저장 | **채택하지 않음.** 저장소가 하나 더 생겨 DB/Redis 불일치, 만료, 유실, 중간 실패 처리가 필요해짐 |
| 별도 제출 ID(submission_id UUID) | **채택하지 않음.** 업로드 파일 키가 이미 제출마다 고유하므로 파일 키가 제출 식별자 역할을 함 |
| VALID/INVALID 커스텀 종료 상태 | 비권장. 기본 완료 상태 집합이나 successful()과 달라 API와 클라이언트의 완료 판정을 바꿔야 함 |
| S3 is_used 태그로 판정 | 파일 유효성 결과나 실패 사유를 대신하지 못함 |

Celery의 일반적인 task 반환은 최종 SUCCESS로 기록된다. `update_state('VALID')` 후 return해도 커스텀 종료 상태가 보존된다고 가정하지 않는다. [Celery 5.4 상태 문서](https://docs.celeryq.dev/en/v5.4.0/userguide/tasks.html#states)

### 4.2 결정적 task_id

```python
ZIP_TASK_NAMESPACE = uuid.UUID("<구현 시 한 번 생성해 코드에 고정>")

def zip_validation_task_id(game_id: int, file_key: str) -> str:
    return str(uuid.uuid5(ZIP_TASK_NAMESPACE, f"game_zip:{game_id}:{file_key}"))
```

- `file_key`는 presign 발급 때 서버가 `zips/<YYYYmmddHHMMSSffffff>_<파일명>.zip` 형식으로 생성한다. F06의 재사용 차단까지 적용하면 게임마다 고유하다.
- 이 함수는 BE 한 곳(`games/utils.py` 등)에만 둔다. 등록·교체 시 작업 발행, 상태 조회의 권한 확인, serializer가 모두 이 함수를 쓴다.
- 파일 키 안의 시각 문자열은 제출 시각으로도 쓴다. 보관기간이 지났는지 판단할 때 사용한다(4.5).

### 4.3 task 인자와 반환값

`validate_game_zip_task(game_id, file_key)`로 인자를 바꾼다. 검증 대상 파일 키를 인자로 고정해서, 작업 도중 게임 파일이 바뀌어도 어떤 파일을 검사했는지가 분명하도록 한다.

반환값은 JSON 직렬화 가능한 dict다.

```json
{"kind":"game_zip_validation","schema_version":1,"game_id":15,"file_key":"zips/20261026...._game.zip","outcome":"valid","reason_code":null,"reason":null}
```

| Celery 상태와 결과 | 의미 | UI 처리 |
|---|---|---|
| SUCCESS + valid | 유효 판정과 보존 태그 적용 완료 | 파일 검증 완료 안내. register_state=0 유지 |
| SUCCESS + invalid | 파일 부적합 판정과 자동 반려 완료 | register_state=2, 사유 표시 |
| SUCCESS + skipped | 게임 삭제나 파일 교체로 이 결과를 적용하지 않음 | 현재 파일 기준으로 재조회 |
| FAILURE | 검증을 실행하지 못함(파일 부적합과 다름) | 검증 처리 실패 안내 |
| PENDING / STARTED / RETRY | 대기 / 실행 중 / 재시도 중 | 단계별 대기 안내 |
| REVOKED | 작업 중단 | 중단 안내 |
| SUCCESS + null 또는 알 수 없는 형식 | 구형 작업이거나 호환 불가 | 성공으로 처리하지 않음 |

구현 규칙:

1. **None 반환 제거:** 기존 `return`(None) 경로를 모두 위 dict 반환으로 바꾼다. 게임이 없거나 검수 대기 상태가 아니면 `skipped`를 반환한다.
2. **재시도 소진:** 지금은 `MaxRetriesExceededError`를 잡아 그냥 return하므로 SUCCESS/null이 된다. 예외를 다시 발생시켜 **FAILURE로 기록**되게 한다. 실제 FAILURE 기록을 시험으로 확인한다.
3. **보존 태그 실패:** `safe_s3_tag`는 실패 시 예외를 던진다(spartagames/utils.py). 따라서 태깅이 실패하면 valid를 반환하지 않고 재시도 경로로 간다. 이 동작을 유지하고 시험한다.
4. **구형 인자 작업:** 배포 전에 큐에 남아 있던 `validate_game_zip_task(game_id)` 형식의 작업은 file_key가 없다. 이 경우 `skipped`(reason_code `LEGACY_ARGS`)를 반환한다. 운영자가 4.6의 재처리 절차로 다시 발행한다.

### 4.4 기존 get_task_status 재사용과 권한

endpoint는 기존 `GET /directs/api/list/task-status/{task_id}/`(`qnas.views.get_task_status`)를 그대로 쓴다. ZIP 전용 endpoint는 추가하지 않는다. 응답 필드 `task_id`/`status`/`result`와, 관리자 공개 처리 작업(`game_register_task`)의 반환 형식은 유지한다.

권한 규칙:

| 호출 형태 | 허용 대상 | 서버 확인 내용 |
|---|---|---|
| `?game_id={id}` 포함 (ZIP 검증 조회) | 해당 게임의 제작자 또는 관리자 | ① 로그인 ② 게임 존재(`is_visible=True`) ③ 요청자 == 제작자 또는 `is_staff` ④ `zip_validation_task_id(game.id, game.gamefile.name)` == 요청한 task_id |
| `game_id` 없음 (기존 관리자 공개 처리 조회) | 관리자만 | `is_staff` |

| 상황 | 응답 |
|---|---|
| 비로그인 | 401 |
| 권한 없음 | 403 |
| 게임 없음 | 404 |
| ④ 불일치(이전 파일의 작업이거나 잘못된 ID) | 409. 메시지 "현재 제출된 파일의 작업이 아닙니다." |

> 현재 이 API는 인증 검사가 없다. FE에서 이 API를 호출하는 곳은 관리자 승인 모달(`AdminGameApproveModal`)뿐이므로, `game_id` 없는 호출을 관리자 전용으로 바꿔도 기존 화면은 영향받지 않는다. 구현 시 다른 호출처가 없는지 다시 검색한다.

추가 규칙:

1. **응답 래퍼:** 이 API는 `DRFStandardResponseMiddleware`의 공통 응답 래퍼를 거친다. FE는 `response.data.data`를 읽는다. Celery 상태(`data.status`)와 래퍼의 `status`를 혼동하지 않는다.
2. **FAILURE 응답:** 원시 exception이나 traceback을 내보내지 않는다. `result=null`을 유지하고, 필요하면 안전한 `error_code`/`message`만 추가한다.
3. **블로킹 금지:** HTTP 요청 안에서 `AsyncResult.get()`으로 완료를 기다리지 않는다.
4. **조회 상태 필드:** `game_id`가 있는 호출에는 `lookup_status`를 추가한다.
   - `ok`: 정상 조회
   - `expired`: 상태가 PENDING이면서, 파일 키의 제출 시각이 보관기간(7일)보다 오래됨
   - Celery `status` 값 자체는 바꾸지 않는다.

### 4.5 task_id 전달·복원과 보관기간

**등록 직후:**
- 등록 POST와 ZIP 교체 PUT은 응답 `data`에 `game_id`와 `task_id`를 담는다.
- message는 `검수 요청이 접수되었습니다`로 바꾼다(F05).
- 파일을 바꾸지 않는 일반 수정은 새 검증 작업을 발행하지 않으며 `task_id`도 내려주지 않는다.

**새로고침·재진입:**
- 내 개발목록(`users.views.my_games`, 본인 조회일 때)과 게임 상세(제작자·관리자 조회일 때) 응답에 `zip_task_id`를 추가한다.
- 값은 `zip_validation_task_id(game.id, game.gamefile.name)`로 계산한다. DB나 Redis 조회가 없다.
- 결과 테이블은 목록 항목마다 조회하지 않는다. FE가 필요한 게임(`register_state=0`)에 한해 4.4 API로 조회한다.
- 로컬 저장소(sessionStorage 등)는 복원 근거로 쓰지 않는다.

**보관기간 (사용자 결정: 7일):**
- `CELERY_RESULT_EXPIRES = timedelta(days=7)`로 설정한다. Celery 기본값은 1일이다.
- 이 설정은 전역이다. 관리자 공개 처리나 칩 배정 등 모든 task 결과도 7일간 보관되므로 결과 테이블이 그만큼 커진다.
- django-db 백엔드는 celery-beat의 `celery.backend_cleanup` 작업이 만료된 결과를 지운다. 구현 시 beat 일정에 이 작업이 실제로 등록되는지 확인한다.
- 보관기간이 지나 결과가 지워지면 Celery는 PENDING을 반환한다. 이때 서버는 `lookup_status=expired`를 내려준다. FE는 `검증 결과 확인 불가`와 기존 관리자 검수 상태를 함께 보여준다.
- PENDING은 존재하지 않는 task_id에도 반환되므로 "영구 대기"로 해석하지 않는다. 시간이 지났다는 것만으로 valid/invalid를 판정하지 않는다.
- 기존 register_state=0이나 SUCCESS/null을 valid로 보정하지 않는다.
- 이 설계는 영구적인 ZIP 성공 이력을 보장하지 않는다. 7일보다 오래 증명해야 한다면 별도 영속 기록이 필요하다(이번 범위 밖).

### 4.6 작업 발행과 파일 교체 경합

1. **발행:** 트랜잭션 안에서 task_id를 계산한다. `transaction.on_commit` 이후 `validate_game_zip_task.apply_async(args=[game_id, file_key], task_id=task_id)`로 발행한다.
2. **오래된 파일 판정:** worker는 시작할 때와 결과를 적용하기 직전에 `game.gamefile.name == file_key`인지 확인한다. 다르면 `skipped`(reason_code `FILE_REPLACED`)를 반환한다. 다운로드·검사하는 동안에는 행 잠금을 잡지 않는다.
3. **반려 적용(조건부 갱신):** 반려는 `Game.objects.filter(pk=game_id, gamefile=file_key, register_state=0).update(register_state=2)`로 적용한다.
   - 갱신된 행이 1개일 때만 반려 로그와 알림을 만든다.
   - 같은 작업이 다시 실행되거나 파일이 바뀐 경우에는 반려 로그·알림이 중복으로 생기지 않는다.
   - 외부 알림의 "정확히 한 번" 전달까지 보장한다고 표현하지 않는다.
4. **FE 반영:** FE도 현재 `zip_task_id`와 일치하는 결과만 반영한다.
5. **발행 실패 격리:** 알림 on_commit 콜백의 실패와 검증 작업 발행을 서로 격리한다.
   - 큐 발행이 실패하면 로그를 남긴다.
   - DB는 이미 커밋되어 접수는 유효하므로 사용자에게 재등록을 유도하지 않는다.
6. **재처리 절차:** 조회 GET에서 작업을 재발행하지 않는다. 복구는 운영자가 한다.
   - `zip_validation_task_id(game.id, game.gamefile.name)`로 같은 ID를 계산한다.
   - `apply_async(args=[game.id, game.gamefile.name], task_id=...)`로 재발행한다.
   - 이 절차를 문서에 남긴다.

### 4.7 업로드 키 재사용·덮어쓰기 방지 (F06)

원래 지침의 "업로드 키는 제출마다 고유하고 불변이어야 하며 같은 키의 덮어쓰기·재사용을 허용하지 않는다"를 다음과 같이 구체화한다.

**재사용 차단 (BE)**
- 등록 POST와 ZIP 교체 PUT에서, 전달된 `file_key`를 이미 어떤 Game이든(삭제 처리된 게임 포함) 사용하고 있으면 409를 반환한다. 메시지는 "이미 사용된 업로드 파일입니다. 파일을 다시 선택해주세요."
- **동시 요청 방어:** 같은 키로 두 요청이 동시에 들어오는 경우에 대비한다. 요청을 처리하는 동안만 기존 Redis에 단기 잠금(`SET upload_key_lock:{file_key} NX EX 60`)을 건다.
  - 이것은 영구 매핑이 아니라 요청 처리 중에만 쓰는 잠금이다.
  - 잠금을 얻지 못하면 409를 반환한다.
- **부수 효과:** 등록 결과가 불확실해서(uncertain) 같은 키로 다시 제출하는 경우, 이 검사가 중복 게임 생성을 막는다. FE는 이 409를 받으면 "이미 접수된 파일일 수 있습니다. 개발목록을 확인해주세요."를 표시한다.
- **알려진 한계(이번 범위 밖):** 다른 사용자가 발급받았지만 아직 등록하지 않은 키를 추측해 먼저 등록하는 경우는 막지 않는다. 키에 마이크로초 시각과 파일명이 들어 있어 추측이 어렵다.

**덮어쓰기 차단 (BE + FE + S3)**
- **BE:**
  - presign 서명에 `IfNoneMatch='*'`를 포함한다.
  - 현재 설치된 boto3/botocore 1.34.119에는 PutObject의 `IfNoneMatch` 파라미터가 없다(2026-10-26 확인). 지원하는 버전으로 **boto3/botocore를 업그레이드**하고 requirements.txt를 갱신한다.
  - 정확한 최소 버전은 구현 시 botocore 서비스 모델에서 `IfNoneMatch` 지원 여부로 확인한다.
  - 서명 이벤트를 가로채는 우회 코드는 쓰지 않는다.
- **FE:** S3 PUT 요청 헤더에 `If-None-Match: *`를 추가한다. 서명된 헤더이므로 반드시 보내야 한다.
- **효과:** 객체가 이미 있으면 S3가 412를 반환한다. 따라서 검증을 통과한 뒤 같은 URL로 파일을 바꿔치기할 수 없다.
- **사전 조건 (저장소 밖, 사용자가 확인·변경):**
  1. S3 버킷 CORS `AllowedHeaders`에 `If-None-Match`, `Content-Type`, `x-amz-tagging`이 허용되어 있어야 한다. 허용되지 않으면 **모든 업로드가 실패**한다.
     - 2026-10-30 확인: 현재 버킷 CORS는 `AllowedHeaders: ["*"]`, `AllowedMethods: GET/PUT/HEAD`이므로 이미 충족된다. 이후 헤더를 개별 지정으로 좁힐 때는 `If-None-Match`를 반드시 포함한다.
  2. 배포 순서: 새 BE의 서명은 이 헤더를 요구한다. 그래서 구형 FE와 함께 쓰면 업로드가 실패한다. FE와 BE를 함께 배포한다.
- **FE 처리:** 412를 받으면 "업로드 파일이 이미 존재합니다. 파일을 다시 선택해주세요."를 표시한다. 캐시된 키를 지우고 새 presign부터 다시 시작한다.

## 5. FE: 단계와 최종 안내

`useGameUpload`의 현재 `completed`는 등록 API 응답 시점이다. 의미를 **접수**(`accepted`)로 바꾸고, 응답의 `game_id`/`task_id`를 호출자에게 전달한다. ZIP 검증 때문에 폼에서 대기를 강제하지 않는다. 접수 후에는 개발목록으로 이동하고, 거기서 결과를 조회한다.

| 단계 | 안내 |
|---|---|
| 로컬 검사 | 파일 확인 중입니다. 제출 차단 |
| S3 전송 | 게임 파일 업로드 중 · N%. 입력과 중복 제출 잠금 |
| 등록 API 처리 | 검수 요청을 처리 중입니다. 잠금 유지 |
| 접수 / PENDING | 검수 요청 완료. 서버 파일 검증을 기다리고 있습니다 |
| STARTED / RETRY | 파일 검증 중 / 검증 재시도 중 |
| SUCCESS + valid | 게임 파일 검증이 완료되었습니다. 관리자 검수 후 공개됩니다 |
| SUCCESS + invalid | 게임 파일 검증에 실패했습니다. 사유와 수정 진입 표시 |
| FAILURE / REVOKED | 검증 처리 실패 / 중단. 재조회와 운영 문의 안내 |
| skipped / null / 409 | 현재 파일의 결과를 다시 확인. 성공으로 처리하지 않음 |
| lookup_status=expired | 검증 결과 확인 불가(보관기간 경과). 관리자 검수 상태는 그대로 표시 |

조회와 화면 규칙:

- **공용 조회 함수:** `src/api`에 `getZipValidationStatus(taskId, gameId)`를 둔다. 4.4 API를 `?game_id=`와 함께 호출한다. 관리자 모달의 `getApprovalTask`는 기존 호출을 유지한다.
- **배너:** 같은 게임의 최신 결과로 접수 배너를 갱신하거나 제거한다. 관리자 검수 배지와 ZIP 결과를 구분하며, 관리자 승인·공개 상태를 자동으로 바꾸지 않는다.
- **조회 간격:** 처음 2분은 5초 간격, 이후 15초 간격, 최대 10분까지 자동 조회한다.
  - SUCCESS/FAILURE/REVOKED, 409, expired, 조회 오류가 나오면 자동 조회를 멈춘다.
  - 자동 조회가 멈춘 뒤에도 사용자가 다시 조회할 수 있는 "결과 다시 확인" 버튼을 제공한다.
  - 10분이 지나도 결과가 없으면 "검증이 지연되고 있습니다"로 안내한다. 실패로 단정하지 않는다.
- **복원:** 새로고침·재진입 시 목록/상세의 `zip_task_id`로 복원한다. WebSocket 없이도 동작해야 한다.
- **장기 대기:** 업로드·API 대기가 30초를 넘으면 지연 안내를 추가한다. 완료 예정 시간을 약속하지 않는다.
- **이탈 안내:** 업로드·API 대기 중 이탈 위험과, 접수 후에는 이동해도 된다는 점을 구분해 안내한다.

## 6. F02: ZIP 선택 후 버튼 비활성 수정

코드 관찰(2026-10-26): `GameUploadForm.tsx`는 `thumbnail`과 `content`만 `register`한다. `gameFile`은 등록하지 않은 채 `setValue(..., { shouldValidate: true })`만 호출한다. 이것이 유력한 원인이다. 구현 시 ZIP 선택 전후의 `checking`, `fileError`, `gameFile`, `formState.isValid`, `formState.errors`를 확인해 원인을 확정한다. 옵션만 추가하고 해결됐다고 판단하지 않는다.

구현 요건:

1. **검사 상태:** 파일 검사 상태를 `미선택/검사중/통과/실패`로 명확히 관리한다. 파일을 바꾸면 기존 통과 상태와 업로드 키 캐시를 즉시 무효화한다.
2. **반영 순서:** 최신 파일 검사가 성공한 뒤 폼 값을 반영하고 검증(`trigger` 등)을 완료한다. 검사 완료와 폼 유효성 판정의 순서를 보장한다.
3. **오래된 결과 무시:** 기존 selection 버전 방어를 유지한다. 파일 A 검사 중 B를 선택하면, A의 늦은 성공·실패가 B 상태를 덮어쓰면 안 된다.
4. **우회 금지:** 제목 재입력, 임의 타이머, 강제 활성화, `isValid` 무시로 우회하지 않는다. 최종 submit에서도 같은 유효성 조건을 검사한다.
5. **비활성 사유:** 실제 조건에 맞게 표시한다. 필수 입력 누락, ZIP 검사 중, 검사 실패, 동의 누락, 결과 불확실을 구분한다.
6. **모드별 조건 보존:** 신규 등록, 반려 후 파일 필수 교체, 일반 수정 시 기존 파일 유지 조건을 각각 보존한다.

## 7. F04: 새로고침 후 개발목록 복원

코드 관찰(2026-10-26, 유력 원인. 구현 시 재현으로 확정한다):

1. **FE — 잘못된 API 호출:** 새로고침 직후 로그인 정보를 복원하는 동안 `MyPage`의 `isMyPage`가 `null`이다. 이때 `MyGame`이 **공개 목록 API**(`getUserGameList`)를 호출한다. 공개 목록은 미승인 게임을 제외하므로 결과가 비어 있다.
2. **FE — 캐시 혼용:** query key가 `["myGameList", user_id, page]`라 본인/공개 조회가 구분되지 않는다. 그래서 인증이 복원된 뒤에도 빈 공개 결과가 캐시로 쓰인다.
3. **BE — 빈 목록 404:** `users.views.my_games`는 게임이 하나도 없으면 404를 반환한다. 그러면 FE는 실제 빈 목록을 "목록을 불러오지 못했습니다"로 표시한다.

진단 순서:

1. 새로고침 전후 로그인 복원 완료 시점, URL 사용자 ID, `isMyPage`, 실제 요청 URL·인증 유무·응답·페이지 번호를 기록한다. 토큰 값은 로그에 남기지 않는다.
2. 공개 목록과 본인 개발목록 중 어느 API가 실행되는지, 인증 복원 뒤 올바른 API가 다시 호출되는지 확인한다.
3. BE의 작성자 조건, `register_state`, `is_visible`, 페이지네이션을 실제 게임 소유자와 대조한다.

수정 요건:

- **인증 상태 구분:** `userStore`에 인증 초기화 상태(진행 중/완료/로그아웃)를 둔다. 인증 초기화가 끝나고 조회 모드가 정해질 때까지 목록 query를 비활성화한다.
- **query key:** 조회 대상 사용자, 본인/공개 조회 모드, 페이지를 key에 넣는다. queryFn의 분기와 key가 같은 의미를 갖게 한다. 사용자나 모드가 바뀌면 페이지를 1로 초기화한다.
- **화면 상태 구분:** 로딩, 인증 실패, 조회 실패, 실제 빈 목록을 따로 표시한다. 본인 목록 API가 성공하고 빈 배열을 돌려줄 때만 `개발중인 게임이 없습니다`를 표시한다.
- **BE 빈 목록:** `my_games`는 빈 목록을 200과 빈 페이지로 응답한다. 타인 조회 시 미승인 게임을 숨기는 기존 필터는 유지한다.
- **상세 진입:** 해당 게임에 직접 상세로 들어와도 서버 상태를 복원한다. 목록 조회 실패를 등록 실패로 안내하거나 재등록을 유도하지 않는다.
- **공개 목록:** 접근 제한과 미승인 게임 비공개 조건을 풀어서 문제를 해결하지 않는다.

## 8. 수정 대상 지도와 구현 순서

신규 모델, 필드, 마이그레이션을 만들지 않는다.

| 저장소 | 파일 | 책임 | 항목 |
|---|---|---|---|
| BE | 기존 모델·마이그레이션 | 변경 없음 | — |
| BE | `games/utils.py` | `zip_validation_task_id` | F01 |
| BE | `games/tasks.py` | 파일 키 고정 검증, dict 반환, 조건부 반려, 재시도 소진 시 FAILURE | F03 |
| BE | `games/views.py` | 등록·교체 응답(`game_id`/`task_id`, 접수 문구), apply_async 발행, 재사용 차단 | F01, F05, F06 |
| BE | `games/serializers.py`, `users/serializers.py` | 제작자·관리자에게 `zip_task_id` 제공 | F01 |
| BE | `users/views.py` | 빈 목록 200, 본인 조회 시 `zip_task_id` | F04, F01 |
| BE | `qnas/views.py` | get_task_status 권한·`game_id`·`lookup_status` | F01 |
| BE | `commons/views.py`, `requirements.txt` | presign `IfNoneMatch`, boto3 업그레이드 | F06 |
| BE | `spartagames/settings.py` | `CELERY_RESULT_EXPIRES` 7일 | F01 |
| FE | `src/api/upload.ts` | `If-None-Match` 헤더, 412 처리 | F06 |
| FE | `src/api/game.ts`, `src/api/direct.ts`, `src/types/index.ts` | ZIP 상태 조회 함수, 관리자 호출 호환 | F01 |
| FE | `src/hook/useGameUpload.ts` | 전송/접수 의미 분리, 식별자 전달, 409 처리 | F01, F05, F06 |
| FE | `src/components/gameUploadComponents/GameUploadForm.tsx`, `GameUploadFields.tsx` | 폼 동기화, 비활성 사유, 대기 안내 | F02, F05 |
| FE | `src/share/store/userStore.ts`, `src/App.tsx` | 인증 초기화 상태 | F04 |
| FE | `src/page/MyPage.tsx`, `src/components/mypageComponents/MyGame.tsx`, `MyGameCard.tsx` | 조회 모드·캐시 키, 상태 배지, 결과 배너 | F04, F01, F05 |
| FE | `src/page/GameDetail.tsx` | 상세의 검증 상태 복원 | F01 |

구현 순서:

1. F02/F04를 재현하고 원인 확정을 기록한다. 확정 전에는 추정에 기반한 대규모 리팩터링을 하지 않는다.
2. BE: F03(task) → F01(task_id·조회 API·serializer·보관기간) → F04(빈 목록) → F05(문구) → F06(재사용·덮어쓰기).
3. FE: F02 → F04 → F01 → F05 → F06.
4. 아래 인수 시험을 수행한다.

## 9. 인수 시험과 완료 기준

아래는 구현 후 수행할 계획이다. 단위·통합 시험은 상태 전이, 경합, 폼과 query 동작을 검증한다. 실제 UI·S3·API·worker 시험은 단계 사이의 연결을 확인한다.

| 시험 | 조작 | 통과 기준 |
|---|---|---|
| T01/F02 기본 등록 | 모든 필수 입력·동의 후 ZIP을 마지막에 선택 | 검사 완료 후 추가 입력 없이 버튼 활성화. 한 번 제출로 정상 접수 |
| F02 입력 순서 | ZIP 먼저/중간/마지막, 썸네일·동의 마지막, 파일 A→B 빠른 교체 | 순서와 무관하게 조건 충족 시 활성화. 오래된 검사 결과 무시 |
| T02 API 지연 | PUT 성공 후 등록 응답을 지연 | 100%를 전체 완료로 표시하지 않음. 처리 문구와 잠금 유지 |
| T03/F01 성공 | 전용 큐 소비를 멈추고 접수를 확인한 뒤 worker 재개 | 접수 시 대기 안내. 해당 task_id의 SUCCESS + valid 확인 후 완료 안내. 새로고침 없이 자동 갱신 |
| T04/F03 무효 | 서버에서 거부되는 심볼릭 링크 ZIP 제출 | Celery SUCCESS여도 UI는 invalid/반려. 사유와 수정 진입 표시, 접수 배너 갱신 |
| 반려 후 재제출 | 수정한 정상 ZIP으로 재검수 제출 | 새 task_id로 검증하고 성공 안내. 이전 반려 결과가 새 제출을 덮어쓰지 않음 |
| 일반 수정 | 파일 변경 없이 제목 등만 수정 | 새 검증 작업과 task_id를 만들지 않음. 기존 결과 보존 |
| T05 업로드 실패 | 특정 S3 PUT 실패 후 재시도 | 실패 시 등록 POST가 실행되지 않음. 재시도 성공, 중복 게임 없음 |
| T06 장기 대기 | API 120초 지연과 ZIP 큐 대기를 각각 시험 | 단계별 지연 안내. 반복 클릭해도 중복 요청 없음. 접수 후 이동 가능 |
| F04 새로고침 | 접수/valid/invalid 각 상태에서 새로고침, 새 탭으로 직접 진입 | `zip_task_id`와 결과 복원. 인증 로딩 중을 빈 목록으로 표시하지 않음 |
| F04 권한·실패 | 인증 복원 지연, 401, 목록 5xx, 게임이 없는 계정 | 로딩/로그인 필요/오류/빈 목록 구분. 공개·본인 캐시 혼용 없음. 빈 계정은 200 빈 목록 |
| 조회 권한 | 비로그인·타인·제작자·관리자로 `?game_id=` 조회. `game_id` 없이 일반 사용자 조회 | 401/403/200/200. `game_id` 없는 호출은 관리자만 허용 |
| 이전 파일 task 조회 | 파일 교체 후 이전 task_id로 조회 | 409. 이전 결과를 현재 결과로 표시하지 않음 |
| 파일 교체 경합 | 이전 파일 작업 중 새 ZIP 제출, 이후 이전 작업 완료 | 이전 작업은 skipped. 현재 결과·반려·알림에 영향 없음 |
| 중복 실행 | 같은 task_id 재실행 | 반려 로그·알림이 중복으로 생기지 않음 |
| worker 복구 | 큐 발행 실패, 재시도 소진, 태깅 실패 | 무한 대기 없음. FAILURE와 invalid 구분. 재처리 절차로 같은 task_id 재발행 |
| 보관기간 | 결과 삭제 후 조회, 알 수 없는 UUID | 성공이나 영구 대기로 오판하지 않음. 오래된 제출은 `lookup_status=expired` |
| F06 재사용 | 이미 등록된 file_key로 다시 등록·교체. 동시 2회 요청 | 409. 게임이 하나만 생성됨 |
| F06 덮어쓰기 | 업로드 완료된 presigned URL로 두 번째 PUT | S3 412. 기존 객체 유지. FE가 새 presign으로 재시작 |
| 기존 API 호환 | 관리자 공개 처리 작업 조회 | 관리자 승인 모달이 기존과 같이 동작 |
| 결과 판별 | SUCCESS + valid/invalid/skipped/null, FAILURE/RETRY/REVOKED | ZIP valid만 완료 안내 |
| Maze 전송 | 58,623,752바이트 ZIP을 실제 업로드 | 바이트 기준 진행률, PUT→API→검증 연결. game_id/file_key/task_id 증거 확보 |
| T07 용량 | 500MiB 초과 ZIP 선택 | FE에서 차단. presign/PUT/등록 POST 없음 |
| 스키마 제약 | 변경 파일과 마이그레이션 확인 | 새 모델·필드·마이그레이션 없음 |

각 실통합 시험은 입력 조건, 응답, 화면, DB와 Celery 결과, `game_id/file_key/task_id` 연결을 기록으로 남긴다. 장비 간 시계 오차를 기록하고, 타임스탬프 비교만으로 순서를 확정하지 않는다. API 200, PUT 200, Celery SUCCESS 중 어느 것도 단독으로 ZIP 성공 근거가 되지 않는다.

출시 판단은 P1 항목과 관련 회귀 시험의 통과를 기준으로 한다. 다음 중 하나라도 해당하면 정상 등록 흐름 통과로 판정하지 않는다.

- 제목 재입력 같은 우회가 필요하다.
- 검증 성공 후 완료 안내가 없다.
- 새로고침 후 목록이 비어 보인다.

미실행 항목은 완료로 표시하지 않는다.

## 10. 구현 진행 방식

- **브랜치:** FE는 `feat/sync-backend-ui-ux`, BE는 `refact/testing`에서 진행한다. 진행하기 어려운 사정이 있으면 현재 브랜치에서 분기한다.
- **커밋:** 항목(F01~F06)별로 나눈다. 커밋 메시지 형식은 `fix(Fxx): <요약>`.
- **변경 설명 파일:** 저장소마다 `docs/presigned-fix/CHANGES.md` 하나를 작성한다. 작업 로그와 별개다.
  - 항목별 섹션 `## Fxx — <제목>`
  - 각 섹션 안의 표: `파일:라인 | 무엇을 바꿨나 | 왜 바꿨나(구현서 절 번호)`
  - 문장은 짧은 평서문으로 쓰고, 약어나 내부 용어는 처음 나올 때 풀어 쓴다.
  - 라인 번호는 최종 커밋 기준으로 적는다.
- **push·배포:** 하지 않는다. F06의 S3 CORS 설정 변경은 사용자가 수행한다.

## 11. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-09 | 최초 작성 |
| 2026-10-26 | **상태 문구:** "구현 전 지침·코드 변경 안 함" → "개정안·사용자 확인 대기" |
| 2026-10-26 | **Redis 매핑·submission_id 삭제(4.4 원안):** task_id를 게임 ID + 파일 키로 계산하는 결정적 방식으로 대체(4.2, 4.5). 파일 키가 제출 식별자 역할을 한다 |
| 2026-10-26 | **get_task_status 권한:** `?game_id=` 기반 제작자·관리자 검사와 현재 파일 일치 확인을 추가. `game_id` 없는 호출은 관리자 전용(4.4). 사용자 결정 |
| 2026-10-26 | **결과 보관기간:** `CELERY_RESULT_EXPIRES` 7일로 확정. 만료는 `lookup_status=expired`로 구분(4.5). 사용자 결정 |
| 2026-10-26 | **F06 신설:** 원안 105행 "덮어쓰기·재사용 금지"를 DB 재사용 차단 + S3 `If-None-Match` 조건부 업로드로 구체화. boto3 업그레이드와 S3 CORS 사전 조건 명시(4.7). 사용자 결정 |
| 2026-10-26 | **반려 처리:** 행 잠금 대신 조건부 update로 중복 반려 방지(4.6) |
| 2026-10-26 | **코드 관찰 반영:** F02 `gameFile` 미등록(6장), F04 공개 API 호출·캐시 키·빈 목록 404(7장), `safe_s3_tag` 예외 동작(4.3) |
| 2026-10-26 | **구현 진행 방식 추가:** 브랜치, 항목별 커밋, 변경 설명 파일 형식(10장) |
| 2026-10-30 | **사용자 확정:** 상태 문구를 "확정본"으로 변경. 내용 변경 없음 |
