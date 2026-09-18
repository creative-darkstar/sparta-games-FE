# Step 4 — 알림·캐시·관리자 비동기 승인
- 작업일: 2026-09-18 (Asia/Seoul)
- 수정: useNotifications/AlarmModal/Header에 사용자별 infinite query 공유, 페이지 ID 중복 제거, 읽음 성공 후 캐시 반영, 로딩·빈 상태·오류 및 재시도.
- 알림 수신 시 상세/사유/개발목록/공개목록 무효화. 전체 미읽음 숫자를 추정하지 않고 확인된 미읽음 존재만 점으로 표시.
- 수정: direct API task 조회, AdminGameApproveModal에 3초 간격/2분 제한 polling, FAILURE·SKIPPED·406·알 수 없는 결과 처리.
- 공개 완료는 작업 result와 실제 register_state를 확인. 모달 종료 후 polling 정리, 서버 처리 계속 안내. 관리자 목록·통계 함께 갱신.
- 근거: BE refact/testing qnas/views.py 및 qnas/tasks.py에서 task 응답 및 성공 result 확인.
- 기대 효과: 접수를 승인완료로 오인하지 않고 비동기 검수 결과가 관련 캐시에 반영됨.
- 검증: 네트워크/시간 모킹은 6단계 예정. 실제 worker 운영 여부는 별도 환경 확인 필요.
