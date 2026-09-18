import { nicknameValidation, NICKNAME_HELP } from "../../util/accountValidation";
import SpartaTextField from "../../spartaDesignSystem/SpartaTextField";
import { useFormContext } from "react-hook-form";
import SpartaChipSelect from "../../spartaDesignSystem/SpartaChipSelect";
import { GAME_CATEGORY } from "../../constant/constant";

const Profile = () => {
  const {
    register,
    watch,
    formState: { errors },
    control,
  } = useFormContext();

  const nickname = watch("nickname");

  return (
    <>
      <p className="text-primary-400 font-DungGeunMo text-[24px]">프로필 정보</p>
      <SpartaTextField
        label="닉네임"
        type="medium"
        register={register("nickname", nicknameValidation)}
        subLabel={{
          default: NICKNAME_HELP,
          error: errors.nickname?.message as string,
          pass: nickname && !errors.nickname ? "사용 가능한 닉네임입니다" : "",
        }}
        inputProps={{
          placeholder: "닉네임을 입력해주세요",
          className: "text-white placeholder-white",
        }}
        pass={nickname && !errors.nickname}
        error={!!errors.nickname}
      />
      <SpartaChipSelect
        label="추천받을 게임분야"
        options={GAME_CATEGORY}
        control={control}
        name="game_category"
        subLabel={{
          default: "추천받을 게임분야를 3개까지 선택할 수 있어요",
          error: "태그를 하나 이상 선택해주세요",
          pass: "태그가 선택되었습니다",
        }}
        multiple
        maxCount={3}
        placeHolderText="게임분야를 선택해주세요"
      />
    </>
  );
};

export default Profile;
