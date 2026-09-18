import { ChangeEvent, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import SpartaChipSelect from "../../spartaDesignSystem/SpartaChipSelect";
import { GAME_CATEGORY } from "../../constant/constant";
import { TGamePlayData, TGameUploadInput } from "../../types";
export function ImagePreview({ value }: { value: File | string | undefined }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!value) { setUrl(""); return; }
    const next = typeof value === "string" ? value : URL.createObjectURL(value);
    setUrl(next);
    return () => { if (typeof value !== "string") URL.revokeObjectURL(next); };
  }, [value]);
  return url ? <img src={url} alt="선택한 이미지 미리보기" className="max-h-40 object-contain" /> : null;
}
type Props = { isUploading: boolean; onChangeFileHandler: (event: ChangeEvent<HTMLInputElement>) => Promise<void>; previousGameData: TGamePlayData | undefined };
export default function GameUploadFields({ isUploading, onChangeFileHandler, previousGameData }: Props) {
  const { register, control, watch, formState } = useFormContext<TGameUploadInput>();
  const file = watch("gameFile"); const thumbnail = watch("thumbnail");
  return <div className="flex flex-col gap-4 w-full">
    <label htmlFor="gameThumbnail">썸네일 · 필수 · JPG/JPEG/PNG/GIF, 최대 5MB</label>
    <input id="gameThumbnail" type="file" accept=".jpg,.jpeg,.png,.gif" aria-label={thumbnail ? "썸네일 파일 변경" : "썸네일 파일 선택"} onChange={onChangeFileHandler} />
    <input type="hidden" {...register("thumbnail", { required: "썸네일을 선택해주세요." })} />
    <ImagePreview value={typeof thumbnail === "string" ? thumbnail : thumbnail?.[0]} />
    {typeof thumbnail !== "string" && <p className="break-all">{thumbnail?.[0]?.name}</p>}
    {formState.errors.thumbnail && <p role="alert">{formState.errors.thumbnail.message}</p>}
    <label htmlFor="gameFile">게임 파일 · ZIP 파일, 최대 500MB</label>
    <input id="gameFile" type="file" accept=".zip" aria-label={file || previousGameData ? "게임 파일 변경" : "게임 파일 선택"} onChange={onChangeFileHandler} />
    <p className="break-all" title={file?.name}>{isUploading ? "파일 확인 중입니다." : file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB · ZIP · 로컬 검사 통과` : previousGameData ? "기존 게임 파일 유지" : "파일 선택"}</p>
    <p>루트 index.html과 Build 폴더의 loader, wasm, framework, data 파일이 필요합니다. 최종 검증은 서버에서 진행합니다.</p>
    <label htmlFor="gameTitle">제목 · 필수</label>
    <input id="gameTitle" className="p-3 bg-gray-700" {...register("title", { validate: value => !!value.trim() || "게임 제목을 입력해주세요." })} />
    {formState.errors.title && <p role="alert">{formState.errors.title.message}</p>}
    <label>장르 · 필수</label>
    <SpartaChipSelect label="장르" options={GAME_CATEGORY} control={control} {...register("category", { required: "장르를 선택해주세요." })} placeHolderText="장르를 선택해주세요." />
    {formState.errors.category && <p role="alert">{formState.errors.category.message}</p>}
  </div>;
}
