import { useSaveVerification } from "../../../../hook/useSaveVerification";
import { getTeamBuildDetail } from "../../../../api/teambuilding";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";

import CommunityProjectTitle from "../../../common/CommunityProjectTitle";
import RecruitFormBasicInfo from "./RecruitFormBasicInfo";
import RecruitFormDescription from "./RecruitFormDescription";
import SpartaButton from "../../../../spartaDesignSystem/SpartaButton";

import type { TProjectRecruitForm } from "../../../../types";

import recruitImage from "../../../../assets/gameDetail/ReviewEdit.svg";
import { postTeamBuild, putTeamBuild } from "../../../../api/teambuilding";
import useModalToggles from "../../../../hook/useModalToggles";
import SpartaReactionModal, { TSpartaReactionModalProps } from "../../../../spartaDesignSystem/SpartaReactionModal";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

export default function RecruitForm() {
  const methods = useForm<TProjectRecruitForm>({
    mode: "onChange",
  });

  const { formState, trigger, control, handleSubmit } = methods;

  const navigate = useNavigate();
  const verification = useSaveVerification();
  const location = useLocation();
  const { postDetail, isEditMode } = location.state || {};

  useEffect(() => {
    if (isEditMode) {
      methods.reset({ ...postDetail });
    }
  }, []);

  const thumbnailWatch = useWatch({
    control,
    name: "thumbnail",
  });

  useEffect(() => {
    trigger("thumbnail");
  }, [thumbnailWatch, trigger]);

  const CONFIRM_MODAL_ID = "confirmModal";
  const SUCCESS_MODAL_ID = "successModal";
  const { modalToggles, onClickModalToggleHandlers } = useModalToggles([CONFIRM_MODAL_ID, SUCCESS_MODAL_ID]);

  const noActionData: { [key: string]: Partial<TSpartaReactionModalProps> } = {
    uploadConfirm: {
      title: !isEditMode ? "글 등록" : "글 수정",
      content: !isEditMode ? "작성하신 내용으로 팀원 모집 글을 등록하시겠어요?" : "이대로 수정하시겠어요?",
      btn1: {
        text: !isEditMode ? "네 등록할게요." : "네 수정할게요.",
        onClick: () => {},
      },
      btn2: {
        text: "아니요. 좀 더 수정할게요.",
        onClick: () => {
          onClickModalToggleHandlers[CONFIRM_MODAL_ID]();
        },
      },
    },
    uploadSuccess: {
      title: !isEditMode ? "글 등록 완료" : "글 수정 완료",
      content: !isEditMode ? "팀원 모집 글이 성공적으로 등록되었습니다." : "팀원 모집 글이 성공적으로 수정되었습니다.",
      btn1: {
        text: "확인했습니다",
        onClick: () => {
          onClickModalToggleHandlers[CONFIRM_MODAL_ID]();
          navigate("/community/team-building");
        },
      },
    },
  };

  const [noActionModalData, setNoActionModalData] = useState<Partial<TSpartaReactionModalProps>>(
    noActionData.uploadSuccess,
  );

  const createTeamBuildingMutation = useMutation({
    mutationFn: postTeamBuild,
    onSuccess: (data) => {
      setNoActionModalData({
        title: "글 등록 완료",
        content: data.status === "warning" ? "글은 등록되었지만 이미지 처리에 문제가 있습니다." : "글 등록이 완료됐습니다!",
        btn1: {
          text: "확인했습니다.",
          onClick: () => {
            onClickModalToggleHandlers[SUCCESS_MODAL_ID]();
            navigate(`/community/team-building/team-recruit/${data.data.post_id}`, { replace: true });
          },
        },
        type: "primary",
      });

      onClickModalToggleHandlers[SUCCESS_MODAL_ID]();
    },
    onError: (error: AxiosError) => {
      if (error.response && error.response.status === 400) {
        verification.setMessage("요청 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 목록에서 등록 여부를 확인해주세요.");
      } else {
        verification.setMessage("요청 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 목록에서 등록 여부를 확인해주세요.");
      }
    },
  });

  const updateTeamBuildingMutation = useMutation({
    mutationFn: ({ postId, formData }: { postId: number; formData: FormData }) => putTeamBuild(postId, formData),
    onSuccess: (data) => {
      setNoActionModalData({
        title: "글 수정 완료",
        content: data.status === "warning" ? "변경사항이 저장되었지만 이미지 처리에 문제가 있습니다." : "글 수정이 완료됐습니다!",
        btn1: {
          text: "확인했습니다.",
          onClick: () => {
            onClickModalToggleHandlers[SUCCESS_MODAL_ID]();
            navigate(`/community/team-building/team-recruit/${data.data.post_id}`, { replace: true });
          },
        },
        type: "primary",
      });

      onClickModalToggleHandlers[SUCCESS_MODAL_ID]();
    },
    onError: async () => {
      await verification.verify(() => getTeamBuildDetail(postDetail.id), methods.getValues() as unknown as Record<string, unknown>);
    },
  });

  const isPending = verification.checking || (isEditMode ? updateTeamBuildingMutation.isPending : createTeamBuildingMutation.isPending);

  const onSubmit = async (data: any) => {
    const formData = new FormData();

    formData.append("title", data.title);
    formData.append("purpose", data.purpose);
    formData.append("duration", data.duration);
    formData.append("meeting_type", data.meeting_type);
    formData.append("deadline", data.deadline);
    formData.append("contact", data.contact);
    formData.append("content", data.content);

    if (data.thumbnail?.[0] instanceof File) {
      formData.append("thumbnail", data.thumbnail[0]);
    } else if (!isEditMode) {
      formData.append("thumbnail_basic", "default");
    }

    data.want_roles.forEach((role: string) => {
      formData.append("want_roles", role);
    });

    if (!isEditMode) {
      createTeamBuildingMutation.mutate(formData);
    } else {
      updateTeamBuildingMutation.mutate({ postId: postDetail.id, formData });
    }
  };

  return (
    <>
    <div className="mx-auto mt-16">
      {verification.message && <div role="status" className="p-4 text-white bg-gray-800"><p>{verification.message}</p>{isEditMode && <button type="button" onClick={() => navigate(`/community/team-building/team-recruit/${postDetail.id}`)}>상세 확인</button>}</div>}
        <CommunityProjectTitle img={recruitImage} title={"프로젝트를 같이 만들 팀원을 구해요"} />

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="w-[997px] mx-auto">
              <RecruitFormBasicInfo postDetail={postDetail} />
              <RecruitFormDescription />
              <SpartaButton
                btnType="button"
                disabled={isPending || !formState.isValid}
                content={isPending ? "처리 중입니다." : !isEditMode ? "글 등록하기" : "글 수정하기"}
                type="filled"
                onClick={() => {
                  if (!isPending) handleSubmit(onSubmit)();
                }}
              />
            </div>
          </form>
        </FormProvider>
      </div>
      {noActionModalData && (
        <>
          <SpartaReactionModal
            isOpen={modalToggles[CONFIRM_MODAL_ID]}
            onClose={onClickModalToggleHandlers[CONFIRM_MODAL_ID]}
            modalId={CONFIRM_MODAL_ID}
            title={noActionModalData.title || ""}
            content={noActionModalData.content || ""}
            btn1={{
              text: noActionModalData?.btn1?.text || "",
              onClick: () => {
                if (!isPending) handleSubmit(onSubmit)();
              },
            }}
            btn2={
              noActionModalData?.btn2 && {
                text: noActionModalData?.btn2?.text || "",
                onClick: noActionModalData?.btn2?.onClick || (() => {}),
              }
            }
            type={noActionModalData.type}
          />

          <SpartaReactionModal
            isOpen={modalToggles[SUCCESS_MODAL_ID]}
            onClose={onClickModalToggleHandlers[SUCCESS_MODAL_ID]}
            modalId={SUCCESS_MODAL_ID}
            title={noActionModalData.title || ""}
            content={noActionModalData.content || ""}
            closeOnClickOutside={false}
            btn1={{
              text: noActionModalData?.btn1?.text || "확인",
              onClick: noActionModalData?.btn1?.onClick || (() => onClickModalToggleHandlers[SUCCESS_MODAL_ID]()),
            }}
          />
        </>
      )}
    </>
  );
}
