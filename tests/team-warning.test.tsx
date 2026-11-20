import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import RecruitForm from "../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitForm";
import RecruitDetail from "../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitDetail";
import { postTeamBuild, deleteTeamBuild } from "../src/api/teambuilding";
vi.mock("../src/share/store/userStore", () => ({ userStore: () => ({ userData: { data: { user_id: 1 } } }) }));
vi.mock("../src/api/teambuilding", () => ({
  postTeamBuild: vi.fn(),
  putTeamBuild: vi.fn(),
  getTeamBuildDetail: vi.fn().mockResolvedValue({ data: { id: 42 } }),
  deleteTeamBuild: vi.fn(),
  deleteTeamBuildComments: vi.fn(),
  patchTeamBuild: vi.fn(),
}));
function Fields() {
  const { reset, register } = useFormContext();
  useEffect(() => {
    reset({
      title: "새 모집글",
      purpose: "STUDY",
      duration: "3M",
      meeting_type: "ONLINE",
      deadline: "2027-01-01",
      contact: "example.test",
      content: "설명",
      want_roles: ["개발"],
    });
  }, [reset]);
  return <input aria-label="모집 제목" {...register("title", { required: true })} />;
}
vi.mock("../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitFormBasicInfo", () => ({
  default: Fields,
}));
vi.mock("../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitFormDescription", () => ({
  default: () => null,
}));
vi.mock("../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitDetailHeader", () => ({
  default: ({ onClickDeleteRecruit }: { onClickDeleteRecruit: () => void }) => (
    <button onClick={onClickDeleteRecruit}>모집 삭제</button>
  ),
}));
vi.mock("../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitDetailInfo ", () => ({
  default: () => null,
}));
vi.mock("../src/components/communityComponents/TeamBuilding/TeamRecruit/RecruitCommentSection", () => ({
  default: () => null,
}));
beforeEach(() => {
  vi.mocked(postTeamBuild).mockResolvedValue({ status: "warning", data: { post_id: 42 } });
  vi.mocked(deleteTeamBuild).mockResolvedValue({ status: "warning", data: null });
});
function mount(component: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
}
it("U17: create warning displays completed message and image warning", async () => {
  mount(<RecruitForm />);
  fireEvent.click(await screen.findByRole("button", { name: "글 등록하기" }));
  expect(await screen.findByText("글은 등록되었지만 이미지 처리에 문제가 있습니다.")).toBeTruthy();
  expect(postTeamBuild).toHaveBeenCalledOnce();
});
it("U17: delete warning hides deleted content and retains completion notice", async () => {
  mount(<RecruitDetail />);
  fireEvent.click(screen.getByRole("button", { name: "모집 삭제" }));
  fireEvent.click(screen.getByRole("button", { name: "글을 삭제할게요." }));
  expect(await screen.findByText("삭제되었습니다. 이미지 정리에 문제가 발생했습니다.")).toBeTruthy();
  expect(deleteTeamBuild).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "모집 삭제" })).toBeNull();
});
