import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { userStore } from "../../share/store/userStore";
import { TGamePlayData, TGameUploadInput } from "../../types";
import { validateGameZip } from "../../util/gameZipValidation";
import { checkFileExtension, checkFileSize } from "../../util/fileValidation";
import { useGameUpload } from "../../hook/useGameUpload";
import GameUploadFields from "./GameUploadFields";
import GameMediaFields from "./GameMediaFields";
import GameDescriptionField from "./GameDescriptionField";
import SpartaModal from "../../spartaDesignSystem/SpartaModal";
import "./Form.css";

type Props = {
  note: { 1: boolean; 2: boolean; 3: boolean };
  previousGameData: TGamePlayData | undefined;
  isEditMode: boolean;
};
const GameUploadForm = ({ note, previousGameData, isEditMode }: Props) => {
  const methods = useForm<TGameUploadInput>({
    mode: "onChange",
    defaultValues: {
      title: previousGameData?.title || "",
      category: previousGameData?.category[0]?.name || "",
      content: previousGameData?.content || "",
      video: previousGameData?.youtube_url || "",
      gameFile: null,
      thumbnail: previousGameData?.thumbnail || "",
      stillCut: [],
    },
  });
  const { register, setValue, handleSubmit, formState, watch, trigger } = methods;
  const [checking, setChecking] = useState(false);
  const [fileError, setFileError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const selection = useRef(0);
  const [screenShotIds, setScreenShotIds] = useState(previousGameData?.screenshot.map((s) => s.id) || []);
  const upload = useGameUpload();
  const navigate = useNavigate();
  const finished = useRef(false);
  const blocker = useBlocker(() => upload.pending && !finished.current);
  const queryClient = useQueryClient();
  const { userData } = userStore();
  const file = watch("gameFile");
  const requiresFile = !isEditMode || previousGameData?.register_state === 2;
  const agreed = isEditMode || (note[1] && note[2] && note[3]);
  const blocked =
    !agreed ||
    checking ||
    upload.pending ||
    !!fileError ||
    (requiresFile && !file) ||
    !formState.isValid ||
    upload.stage === "uncertain";
  const action = !isEditMode
    ? "검수 요청"
    : file || previousGameData?.register_state === 2
      ? "재검수 요청"
      : "변경사항 저장";
  useEffect(() => {
    register("gameFile", { validate: (value) => !requiresFile || !!value || "새 게임 파일을 선택해주세요." });
    register("thumbnail", { required: "썸네일을 선택해주세요." });
    register("content", {
      validate: (value) => !!value?.replace(/<[^>]*>/g, "").trim() || "게임 설명을 입력해주세요.",
    });
    void trigger();
  }, [register, requiresFile, trigger]);
  useEffect(() => {
    if (!upload.pending) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [upload.pending]);
  const onChangeFileHandler = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    const id = event.target.id;
    if (id === "gameFile") {
      const version = ++selection.current;
      upload.invalidateFile();
      setValue("gameFile", null, { shouldValidate: true });
      setChecking(true);
      setFileError("");
      try {
        await validateGameZip(chosen);
        if (version === selection.current) {
          setValue("gameFile", chosen, { shouldDirty: true });
          await trigger();
        }
      } catch (error) {
        if (version === selection.current)
          setFileError(error instanceof Error ? error.message : "파일을 확인하지 못했습니다.");
      } finally {
        if (version === selection.current) setChecking(false);
      }
    } else {
      const field = id === "gameThumbnail" ? "thumbnail" : (`stillCut.${Number(id.replace("stillCut", ""))}` as const);
      if (!checkFileSize(chosen, 5 * 1024 * 1024) || !checkFileExtension(chosen.name)) {
        methods.setError(field, { message: "JPG, JPEG, PNG, GIF 이미지, 최대 5MB를 선택해주세요." });
        setValue(field, field === "thumbnail" ? previousGameData?.thumbnail || "" : []);
        return;
      }
      methods.clearErrors(field);
      setValue(field, [chosen], { shouldValidate: true });
      if (id.startsWith("stillCut")) {
        const oldId = previousGameData?.screenshot[Number(id.replace("stillCut", ""))]?.id;
        setScreenShotIds((ids) => ids.filter((value) => value !== oldId));
      }
    }
  };
  const submit = async (data: TGameUploadInput) => {
    if (blocked) return;
    const body = new FormData();
    body.set("title", data.title);
    body.set("category", data.category);
    body.set("content", data.content);
    body.set("youtube_url", data.video || "");
    if (typeof data.thumbnail !== "string" && data.thumbnail?.[0]) body.set("thumbnail", data.thumbnail[0]);
    data.stillCut?.forEach((files) => {
      if (files?.[0]) body.append("new_screenshots", files[0]);
    });
    screenShotIds.forEach((id) => body.append("old_screenshots", String(id)));
    if (await upload.submit(body, data.gameFile, previousGameData?.id)) {
      for (const key of ["myGameList", "gameDetail", "gameList"])
        void queryClient.invalidateQueries({ queryKey: [key] });
      finished.current = true;
      navigate(`/my-page/${userData?.data.user_id}?tab=develop`, {
        state: { gameResult: !isEditMode || !!data.gameFile ? "review" : "saved" },
      });
    } else setConfirm(false);
  };
  return (
    <FormProvider {...methods}>
      <SpartaModal
        isOpen={blocker.state === "blocked"}
        modalId="upload-leave"
        title="업로드 중 이탈"
        onClose={() => blocker.reset?.()}
      >
        <p className="text-white">
          이탈하면 전송이 중단될 수 있습니다. 새로고침·탭 종료 후에는 파일을 다시 선택해야 할 수 있습니다.
        </p>
        <button onClick={() => blocker.reset?.()}>계속 작성</button>
        <button onClick={() => blocker.proceed?.()}>이동</button>
      </SpartaModal>
      <form
        onSubmit={handleSubmit(() => {
          if (!blocked) setConfirm(true);
        })}
      >
        <fieldset disabled={upload.pending}>
          <div className="flex gap-10 my-10 text-gray-300 text-body-18">
            <div className="w-2/3">
              <GameUploadFields
                isUploading={checking}
                onChangeFileHandler={onChangeFileHandler}
                previousGameData={previousGameData}
              />
              {fileError && (
                <p role="alert" className="text-red-400">
                  {fileError} 파일 다시 선택
                </p>
              )}
              {requiresFile && !file && <p className="text-white">새 게임 파일을 선택해주세요.</p>}
              {isEditMode && previousGameData?.register_state !== 2 && (
                <p className="text-white">
                  {file
                    ? "게임 파일을 변경하면 다시 검수합니다. 검수 중에는 공개 목록에서 제외됩니다."
                    : "게임 파일을 변경하지 않으면 기존 파일이 유지됩니다."}
                </p>
              )}
            </div>
            <GameMediaFields onChangeFileHandler={onChangeFileHandler} previousGameData={previousGameData} />
          </div>
          <GameDescriptionField disabled={upload.pending} />
          {formState.errors.content && (
            <p role="alert" className="text-red-400">
              {formState.errors.content.message}
            </p>
          )}
        </fieldset>
        <div role="status" aria-live="polite" className="text-white my-4">
          {checking && "파일 확인 중입니다."}
          {upload.stage === "uploading" && (
            <>
              <p>게임 파일 업로드 중 {upload.progress !== null && `· ${upload.progress}%`}</p>
              <progress max={100} value={upload.progress ?? undefined} aria-label="게임 파일 업로드" />
            </>
          )}
          {upload.stage === "submitting" && "검수 요청을 처리 중입니다."}
          {upload.pending && (
            <p>이탈하면 전송이 중단될 수 있습니다. 새로고침·탭 종료 후에는 파일을 다시 선택해야 할 수 있습니다.</p>
          )}
          {upload.message && <p>{upload.message}</p>}
        </div>
        {upload.stage === "uncertain" && (
          <button type="button" onClick={() => navigate(`/my-page/${userData?.data.user_id}?tab=develop`)}>
            개발목록 확인
          </button>
        )}
        {blocked && !upload.pending && (
          <p className="text-gray-300">{upload.stage === "uncertain" ? "접수 결과가 불확실합니다. 개발목록을 확인해주세요." : checking ? "ZIP 파일 검사 중입니다." : fileError ? "ZIP 파일 검사에 실패했습니다. 파일을 다시 선택해주세요." : requiresFile && !file ? "새 게임 파일을 선택해주세요." : !agreed ? "유의사항에 모두 동의해주세요." : "제목, 장르, 설명, 썸네일 등 필수 입력을 확인해주세요."}</p>
        )}
        <button
          disabled={blocked}
          className="my-6 p-4 w-full rounded bg-primary-500 text-black disabled:opacity-50"
          type="submit"
        >
          {upload.stage === "failed" ? "다시 시도" : action}
        </button>
      </form>
      <SpartaModal
        isOpen={confirm}
        modalId="game-summary"
        title={action}
        closeOnClickOutside={false}
        onClose={() => {
          if (!upload.pending) setConfirm(false);
        }}
      >
        <div className="text-white space-y-4 max-w-xl">
          <p>게임명: {watch("title")}</p>
          <p>카테고리: {watch("category")}</p>
          <p className="break-all">
            ZIP: {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)` : "기존 파일 유지"}
          </p>
          {isEditMode && (
            <p>
              변경 항목:{" "}
              {Object.keys(formState.dirtyFields)
                .map(
                  (key) =>
                    ({
                      title: "제목",
                      category: "카테고리",
                      content: "설명",
                      video: "영상",
                      thumbnail: "썸네일",
                      stillCut: "스틸컷",
                      gameFile: "게임 파일",
                    })[key] || key,
                )
                .join(", ") || "변경 없음"}
            </p>
          )}
          <p>
            {!isEditMode || file
              ? "검수 통과 후 공개됩니다. 검수 완료 시 알림으로 안내합니다."
              : "기존 게임 파일을 유지하고 변경사항을 저장합니다."}
          </p>
          <p role="status" aria-live="polite">
            {upload.stage === "uploading"
              ? `게임 파일 업로드 중${upload.progress === null ? "" : ` · ${upload.progress}%`}`
              : upload.stage === "submitting"
                ? "검수 요청을 처리 중입니다."
                : ""}
          </p>
          <button disabled={upload.pending} onClick={() => setConfirm(false)}>
            돌아가기
          </button>
          <button className="ml-8" disabled={upload.pending} onClick={handleSubmit(submit)}>
            {upload.pending ? "처리 중" : action}
          </button>
        </div>
      </SpartaModal>
    </FormProvider>
  );
};
export default GameUploadForm;
