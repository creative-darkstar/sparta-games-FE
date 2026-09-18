import { ChangeEvent } from "react";
import { useFormContext } from "react-hook-form";
import { TGamePlayData, TGameUploadInput } from "../../types";
import { ImagePreview } from "./GameUploadFields";
type Props = { onChangeFileHandler: (event: ChangeEvent<HTMLInputElement>) => Promise<void>; previousGameData: TGamePlayData | undefined };
export default function GameMediaFields({ onChangeFileHandler, previousGameData }: Props) {
  const { watch, register, formState } = useFormContext<TGameUploadInput>();
  return <div className="w-1/3 space-y-4">
    <label htmlFor="gameVideo">플레이 영상 · 선택</label>
    <input id="gameVideo" className="bg-gray-700 p-3 w-full" {...register("video", { validate: value => !value || /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(value) || "올바른 유튜브 링크를 입력해주세요." })} />
    {formState.errors.video && <p role="alert">{formState.errors.video.message}</p>}
    <p>스틸컷 · 선택 · JPG/JPEG/PNG/GIF, 최대 5MB</p>
    {Array.from({ length: 5 }, (_, index) => <div key={index}>
      <label htmlFor={`stillCut${index}`}>스틸컷 {index + 1} 파일 {watch(`stillCut.${index}`)?.[0] || previousGameData?.screenshot[index] ? "변경" : "선택"}</label>
      <input id={`stillCut${index}`} type="file" accept=".jpg,.jpeg,.png,.gif" onChange={onChangeFileHandler} />
      <p className="break-all">{watch(`stillCut.${index}`)?.[0]?.name}</p>
      <ImagePreview value={watch(`stillCut.${index}`)?.[0] || previousGameData?.screenshot[index]?.src} />
      {formState.errors.stillCut?.[index] && <p role="alert">{formState.errors.stillCut[index]?.message}</p>}
    </div>)}
  </div>;
}
