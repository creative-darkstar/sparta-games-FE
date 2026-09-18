# Step 5 — 팀빌딩 부분 성공·회원 입력
- 작업일: 2026-09-18 (Asia/Seoul)
- 생성: useSaveVerification, accountValidation.
- 수정: 모집/프로필 생성 및 수정의 warning 안내. 삭제 warning도 완료로 처리하고 이미지 정리 경고 표시. 프로필 삭제 pending은 finally에서 해제.
- 수정 실패 시 초안 유지, 상세 재조회, 일치하는 텍스트 항목만 명시. 이미지 후처리까지 성공으로 추정하지 않음. 상세 확인 제공.
- 수정: 기존 이미지 URL을 파일처럼 전송하던 분기 정리.
- 회원가입/설정/재설정 비밀번호 규칙 공통화. 닉네임 4~12자, 대문자 및 BE 특수문자 허용.
- 근거: BE accounts/constants.py의 NICKNAME_PATTERN/PASSWORD_PATTERN 확인.
- 기대 효과: 저장된 글을 실패로 오해하여 재등록하는 행동 완화, FE와 BE 입력 검증 불일치 해소.
- 검증: 통합 모킹 및 정적 검증은 6단계에 기록.
