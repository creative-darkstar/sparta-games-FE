# Step 4 — 알림·캐시·관리자 비동기 승인
- 작업일: 2026-09-18 (Asia/Seoul)
- 수정: useNotifications/AlarmModal/Header에 사용자별 infinite query 공유, 페이지 ID 중복 제거, 읽음 성공 후 캐시 반영, 로딩·빈 상태·오류 및 재시도.
- 알림 수신 시 상세/사유/개발목록/공개목록 무효화. 전체 미읽음 숫자를 추정하지 않고 확인된 미읽음 존재만 점으로 표시.
- 수정: direct API task 조회, AdminGameApproveModal에 3초 간격/2분 제한 polling, FAILURE·SKIPPED·406·알 수 없는 결과 처리.
- 공개 완료는 작업 result와 실제 register_state를 확인. 모달 종료 후 polling 정리, 서버 처리 계속 안내. 관리자 목록·통계 함께 갱신.
- 근거: BE refact/testing qnas/views.py 및 qnas/tasks.py에서 task 응답 및 성공 result 확인.
- 기대 효과: 접수를 승인완료로 오인하지 않고 비동기 검수 결과가 관련 캐시에 반영됨.
- 검증: 네트워크/시간 모킹은 6단계 예정. 실제 worker 운영 여부는 별도 환경 확인 필요.

## 완료 시각 및 파일별 변경 범위
- 단계 커밋: `43c63f5`
- 단계 완료 시각: 2026-09-18T20:52:50+09:00
- A: 생성, M: 수정. 기존 사용자 문서와 BE 소스는 변경하지 않음.

```text
M	src/api/direct.ts
M	src/components/Header.tsx
M	src/components/adminComponents/AdminGameApproveModal.tsx
M	src/components/headerComponents/AlarmModal.tsx
M	src/hook/useNotifications.ts
```

이 단계의 구현 이후 발견한 접근성·흐름 보완과 최종 검증은 [6단계 로그](../06-validation/work-log.md)에 함께 기록한다. 단계별 커밋은 구현 경계를 보존하며 최종 실행 검증의 기준은 전체 6단계 반영본이다.
