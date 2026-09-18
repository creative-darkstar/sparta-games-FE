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

## 완료 시각 및 파일별 변경 범위
- 단계 커밋: `c53c246`
- 단계 완료 시각: 2026-09-18T20:55:21+09:00
- A: 생성, M: 수정. 기존 사용자 문서와 BE 소스는 변경하지 않음.

```text
M	src/components/communityComponents/TeamBuilding/Profile/ProfileDetail.tsx
M	src/components/communityComponents/TeamBuilding/Profile/ProfileRegisterForm.tsx
M	src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitDetail.tsx
M	src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitForm.tsx
M	src/components/mypageComponents/setting/AccountModal.tsx
M	src/components/signUpComponents/Account.tsx
M	src/components/signUpComponents/Profile.tsx
A	src/hook/useSaveVerification.ts
M	src/page/ResetPassword.tsx
A	src/util/accountValidation.ts
```

이 단계의 구현 이후 발견한 접근성·흐름 보완과 최종 검증은 [6단계 로그](../06-validation/work-log.md)에 함께 기록한다. 단계별 커밋은 구현 경계를 보존하며 최종 실행 검증의 기준은 전체 6단계 반영본이다.
