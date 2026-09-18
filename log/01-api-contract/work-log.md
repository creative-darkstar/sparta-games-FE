# Step 1 — API 오류 전달·타입·문구
- 작업일: 2026-09-18 (Asia/Seoul)
- 기준: origin/main 최신화 완료, feat/sync-backend-ui-ux 분기. 사용자 제공 docs는 기존 미추적 파일로 보존.
- 수정: src/api/game.ts의 생성·수정·삭제 catch 반환 제거. HTTP 오류를 호출자로 전달.
- 수정: src/types/index.ts에 warning, nullable 공통 pagination 및 paginated/업로드/검수 타입 추가.
- 수정: 업로드 안내의 2일/7일 확약과 7z 허용 제거.
- 기대 효과: 실패 mutation의 성공 처리 방지, 서버 응답 및 검수 안내 일치.
- 확인: BE refact/testing 54d5a69의 games/utils.py 계약 검토. 실행 검증은 의존성 설치 후 수행.
