export const NICKNAME_HELP = "4~12자의 한글, 영문, 숫자를 사용해주세요.";
export const PASSWORD_HELP = "8~32자의 영문(대·소문자), 숫자, 특수문자를 각각 포함해주세요.";
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{4,12}$/;
export const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[~`!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/]).{8,32}$/;
export const nicknameValidation = {
  required: "닉네임을 입력해주세요.",
  pattern: { value: NICKNAME_PATTERN, message: NICKNAME_HELP },
};
export const passwordValidation = {
  required: "비밀번호를 입력해주세요.",
  pattern: { value: PASSWORD_PATTERN, message: PASSWORD_HELP },
};
