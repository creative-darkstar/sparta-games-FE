# Step 6 — PC 접근성 및 흐름·계약 검증

- 작업일: 2026-09-18, Asia/Seoul.
- 단계 작업 시간: 20:55 이후 ~ 최종 커밋 시각. 개별 테스트 실행 시각은 tests.txt 참조.
- 프로젝트 기준: sparta-games-FE, 작업 브랜치 feat/sync-backend-ui-ux.
- 기준 main: 0d86a1ea3a80da6c3eb94ff5ec22da7ecffcd198. origin/main pull --ff-only로 최신임을 확인한 뒤 분기했다.
- BE 계약: refact/testing 54d5a6936a4dd66836dc17f7a3abed4275ccc9d0. BE 파일은 수정하지 않았다.

## 작업 내용 및 파일별 변경

### 접근성·이탈·입력

- `src/share/Router.tsx`: 동일 경로를 data router로 옮겨 useBlocker 기반 SPA 이탈 확인을 지원한다. Footer는 공통 루트에 유지한다.
- `GameUploadForm.tsx`, `useGameUpload.ts`, `api/game.ts`, `api/upload.ts`: 실행 중에만 beforeunload 등록, SPA 확인, unmount 시 AbortController 정리. 사용자 이탈 후 완료 콜백이 다시 개발목록으로 이동하지 않게 한다. 브라우저 이탈 경고가 항상 보장되거나 서버 저장이 취소된다고 가정하지 않는다.
- `SpartaModal.tsx`: dialog/aria-modal, 진입 초점, Tab·Shift+Tab 순환, Escape, 종료 후 기존 초점 복귀.
- `SpartaPhraseCheckModal.tsx`: 삭제 전용으로 축소하고 공용 접근성 모달 재사용. 삭제 확인 문구 및 대상 표시는 유지. 닫고 다시 열면 입력 초기화.
- `SpartaReactionModal.tsx`: 기존 줄바꿈/강조 표현은 유지하면서 HTML을 제한된 태그로 정화한다. 반려 사유는 별도 패널에서 React 텍스트로 출력한다.
- `GameUploadFields.tsx`, `GameMediaFields.tsx`, `GameDescriptionField.tsx`, `SpartaChipSelect.tsx`: 파일 선택/변경 버튼, 이미지 미리보기, 입력 경계, 선택 상자·편집기 도구의 접근성 이름. 실행 중 편집기 readOnly.
- `Note.tsx`, `common/CheckBox.tsx`: 키보드 가능한 체크박스·접기 버튼, 개별 동의 이름, 접었다 펼쳐도 동의 유지. 접힌 영역이 탭 순서에 남지 않음.

### 검증 중 확인한 흐름 보완

- 일반 수정 요약에서 재검수처럼 읽히는 문구를 제거하고 기존 파일 유지/저장으로 안내.
- 반려 수정은 ZIP 선택 전에도 버튼 이름을 재검수 요청으로 표시하고 실행은 차단.
- 2xx의 명시적 fail/error를 완료로 해석하지 않는다. 사용자별 bookmark 키를 분리.
- `GamePlaySection.tsx`: 공개 상태에만 게임 플레이/플레이 기록 요청. 검수중·반려는 상태 텍스트 표시.
- `GameDetail.tsx`, `MyGame.tsx`: 본인 검수중 게임에만 30초 재조회. 오류/재시도, 삭제 pending 복구.
- `AlarmModal.tsx`: 진입 초점·Escape·종료 초점 복귀, 읽음 실패 시 목록 유지.
- `ProfileDetail.tsx`, `RecruitDetail.tsx`: 삭제 warning 완료 반영, 삭제된 화면 숨김, 목록 갱신, 키보드 가능한 삭제 버튼. 프로필/팀빌딩 활동 조회의 로딩·오류 분리.
- `Logs.tsx`, `MypageLogModal.tsx`, `TeamBuildLogModal.tsx`: 정상 빈 목록과 통신 오류/재시도를 구분.
- 파일·폼·관리자 task 검사에서 발견한 회귀를 수정하고 기존 미사용 import 일부를 정리.

### 테스트 환경 및 의존성

- `vitest.config.ts`, `tests/setup.ts`, `tests/*.test.ts(x)` 생성: Vitest/jsdom/Testing Library 기반 네트워크·시간·컴포넌트 흐름 검증.
- `package.json`: test, typecheck 스크립트 추가 및 테스트 의존성 등록.
- `package-lock.json`, `yarn.lock`: 기존 npm ci가 보고한 플랫폼 의존성 누락을 복구하고 테스트 의존성을 반영. npm ci --dry-run --ignore-scripts --offline 통과.
- `tests/preview.html`, `tests/preview.tsx`: 실제 컴포넌트를 PC 브라우저에서 확인할 수 있는 개발 전용 모킹 fixture. 서비스 요청은 adapter로 가로채며 프로덕션 번들 진입점에 포함되지 않는다. 실행: npm run dev 후 /tests/preview.html.
- 기준 main 사본을 임시로 만들어 타입/lint 결과를 측정한 뒤 사본과 ZIP은 삭제했다. 측정 결과만 보존한다.

## 검증 결과

- 최종 자동 테스트: 10개 파일, 46개 테스트 통과. tests.txt 참조. 네트워크·시간을 모킹한 사용자 결과와 API 계약 테스트다.
- 프로덕션 build: 통과. 기존 대형 chunk, 오래된 Browserslist 데이터 및 동적 icon 참조 경고는 build.txt에 기록.
- 타입/lint: 전체 저장소 기준 기존 오류가 남아 실패한다. 타입 오류는 main 26건 → 최종 21건, lint는 main 50 errors/21 warnings → 최종 47 errors/14 warnings. 새 타입·lint 오류는 0건이다. 기준 main과 최종본의 정확한 수치 및 새 오류 여부는 regression-comparison.json에 기록한다. 전체 검사가 모두 통과했다고 주장하지 않는다.
- `git diff --check`: 공백 오류 없음. Windows 자동 CRLF 변환 경고는 동작 오류가 아니다.
- 검수 기간/확장자/확인 모달 문구 검색: 관련 등록·검수 화면의 2일/7일 확약, 7z 허용, 등록·수정 문구 입력 호출 없음. copy-audit.txt의 2일은 별도 회원탈퇴 유예 안내로 이번 검수 기간 변경 대상이 아니다.

## 지침서 시나리오와 검증 근거

| 시나리오 | 검증 및 관찰 |
|---|---|
| U01 | 폼 필수값/미동의 차단 테스트, 브라우저 신규 폼 비활성 상태 확인 |
| U02 | 확장자·크기·손상 ZIP·WebGL 필수 구조 테스트. TemplateData를 잘못 필수로 요구하지 않음 |
| U03 | 선택 취소와 느린 이전 검사 결과 무시 테스트 |
| U04 | S3 완료 후 file_key 전달 및 별도 결과 배너 테스트 |
| U05 | 전송 100% 이후에도 submitting/pending 유지 테스트 |
| U06 | S3 실패 시 생성 API 미호출, 사용자 재시도 시 업로드 재실행 테스트 |
| U07 | HTTP 400·401·403은 완료로 처리하지 않음 |
| U08 | 연결 종료·408·500·504 불확실 결과에서 반복 생성 차단 |
| U09 | 일반 수정 gamefile 생략, old_screenshots 유지, saved 결과 테스트 |
| U10 | ZIP 교체 새 키, 반려 새 ZIP 필수 및 재검수 버튼 차단 테스트 |
| U11 | URL ID 조회 복구, 타인 게임 권한 차단 테스트 |
| U12 | 수정 요약에 문구 입력 없음, 삭제 문구 입력 유지 테스트 |
| U13 | 중복 제출 차단 및 SPA 이동 확인 테스트. beforeunload 코드는 정적 검토; 브라우저별 종료 경고는 별도 실환경 확인 대상 |
| U14 | 검수 요청 완료 배너와 목록 오류 동시 표시, router state 소비 테스트 |
| U15 | WebSocket ID 중복 방지, 관련 캐시 무효화 테스트. 포커스/재진입 재조회 설정 검토 |
| U16 | 미읽음 존재, 읽음 실패 유지, 빈/오류, 다음 페이지 중복 제거 테스트 |
| U17 | 모집글 생성/삭제 warning 컴포넌트 테스트. 프로필 warning 및 finally 복구 분기는 코드 검토 |
| U18 | 저장 재조회 일치 텍스트만 확인, 재조회 실패·pending 해제 테스트. 실제 DB commit 후 S3 실패 재현은 별도 통합 환경 대상 |
| U19 | 202→PENDING→SUCCESS 및 실제 공개 상태 확인 테스트 |
| U20 | FAILURE/406/SKIPPED/SUCCESS+null/미정의 상태/2분 제한/정리 테스트 |
| U21 | 닉네임 4·11·12자, 경계값, 대문자·특수문자 비밀번호 테스트 |
| U22 | 즐겨찾기·최근 플레이·팀빌딩 활동의 정상 빈 화면과 오류 재시도 테스트 |
| U23 | 모달 Tab/Shift+Tab/Escape/복귀 자동 테스트 및 실제 브라우저 관찰 |
| U24 | 관련 소스 전체 문구 검색. 회원탈퇴 유예 문구는 유지 |

각 테스트는 개별 계약과 컴포넌트를 검증하며 운영 S3/Celery를 관통하는 end-to-end 성공을 의미하지 않는다.

## 실제 PC 브라우저 확인

- 1440×1000 PC 뷰포트에서 다크 테마, 한 페이지 폼, 이미지 미리보기, 입력/장르 선택, 새 ZIP 없는 반려 수정 차단을 확인.
- 수정 요약의 최초 초점(닫기), Shift+Tab으로 마지막 버튼 이동, Escape 종료 후 제출 버튼 복귀를 확인.
- 반려 사유의 `<script>` 문자열이 실행되지 않고 글자로 표시됨을 확인.
- 신규 등록의 필수 입력·동의 차단 및 체크박스 접근성 트리를 확인.
- 브라우저 테스트 후 임시 뷰포트를 복원하고 검증 탭을 닫음. 스크린샷은 대화 도구 관찰이며 저장된 증거 파일로 주장하지 않음.

## 외부 통합 검증의 한계 및 후속 확인

- 로컬 FE 실행에서 유효한 BE 데이터 연결을 확보하지 못해 실제 화면 관찰은 개발 fixture로 수행했다.
- S3 CORS(PUT, Content-Type, x-amz-tagging), 서명 URL 만료·실제 업로드, Celery worker/broker·실제 공개 반영은 검증하지 못했다.
- 자동 ZIP 검증과 관리자 승인 경합, 검증 재시도 소진 후 검수중 잔류는 서버/운영 확인이 필요하다. FE가 시간으로 반려·실패 상태를 생성하지 않는다.
- 생성 ID 및 idempotency 부재 때문에 불확실한 생성 결과를 완전히 자동 복구하지 않는다.
- 모바일 개편은 이번 범위에서 제외했다.

## 기대 효과

파일 선택, 전송 완료, 검수 요청 완료, 공개 완료를 명확히 구분한다. 일반 실패에서 입력을 보존하고 불확실한 결과의 중복 등록을 줄인다. 비동기 처리와 알림·목록·상세 상태를 함께 갱신하며, PC 키보드로 주요 확인·닫기·재시도를 수행할 수 있다.

## 최종 단계 변경 파일 목록

아래 M은 이 단계에서 수정한 파일이다. 1~5단계 구현에 대한 검증 중 보완 및 형식 정리를 포함한다.

```text
M	package-lock.json
M	package.json
M	src/api/direct.ts
M	src/api/game.ts
M	src/api/upload.ts
M	src/components/Header.tsx
M	src/components/adminComponents/AdminGameApproveModal.tsx
M	src/components/common/CheckBox.tsx
M	src/components/communityComponents/TeamBuilding/Profile/ProfileDetail.tsx
M	src/components/communityComponents/TeamBuilding/Profile/ProfileRegisterForm.tsx
M	src/components/communityComponents/TeamBuilding/TeamBuildLogModal.tsx
M	src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitCommentSection.tsx
M	src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitDetail.tsx
M	src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitForm.tsx
M	src/components/gameDetailComponents/GamePlaySection/GamePlay.tsx
M	src/components/gameDetailComponents/GamePlaySection/GamePlaySection.tsx
M	src/components/gameUploadComponents/GameDescriptionField.tsx
M	src/components/gameUploadComponents/GameMediaFields.tsx
M	src/components/gameUploadComponents/GameUploadFields.tsx
M	src/components/gameUploadComponents/GameUploadForm.tsx
M	src/components/gameUploadComponents/Note.tsx
M	src/components/gameUploadComponents/RejectionPanel.tsx
M	src/components/headerComponents/AlarmModal.tsx
M	src/components/mypageComponents/Logs.tsx
M	src/components/mypageComponents/MyGame.tsx
M	src/components/mypageComponents/MyGameCard.tsx
M	src/components/mypageComponents/MypageLogModal.tsx
M	src/components/mypageComponents/setting/AccountModal.tsx
M	src/components/signUpComponents/Account.tsx
M	src/components/signUpComponents/Profile.tsx
M	src/hook/useGameUpload.ts
M	src/hook/useNotifications.ts
M	src/hook/useSaveVerification.ts
M	src/page/GameDetail.tsx
M	src/page/GameUpload.tsx
M	src/page/MyPage.tsx
M	src/page/ResetPassword.tsx
M	src/share/Router.tsx
M	src/spartaDesignSystem/SpartaChipSelect.tsx
M	src/spartaDesignSystem/SpartaModal.tsx
M	src/spartaDesignSystem/SpartaPhraseCheckModal.tsx
M	src/spartaDesignSystem/SpartaReactionModal.tsx
M	src/types/index.ts
M	src/util/accountValidation.ts
M	src/util/gameZipValidation.ts
M	yarn.lock
```

생성: vitest.config.ts, tests/ 아래 테스트·setup·preview fixture, log/README.md 및 이 폴더의 검증 기록. 1~5단계 로그에는 커밋 완료 시각과 해당 단계 파일 목록을 보강했다.
