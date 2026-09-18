import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import SpartaModal from "../src/spartaDesignSystem/SpartaModal";
import { useSaveVerification } from "../src/hook/useSaveVerification";
it("U23: modal traps Tab, closes on Escape and restores focus", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const view = render(
    <SpartaModal isOpen modalId="test" onClose={close}>
      <button>첫 행동</button>
      <button>마지막 행동</button>
    </SpartaModal>,
  );
  expect(document.activeElement).toBe(screen.getByText("첫 행동"));
  fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(screen.getByText("마지막 행동"));
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByText("첫 행동"));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
it("U18: only matching text fields are confirmed, never image completion", async () => {
  const { result } = renderHook(useSaveVerification);
  await act(async () => {
    await result.current.verify(async () => ({ data: { title: "새 제목", content: "이전 설명" } }), {
      title: "새 제목",
      content: "새 설명",
      image: new File([], "a.png"),
    });
  });
  expect(result.current.message).toContain("제목 항목이 제출값과 일치");
  expect(result.current.message).toContain("이미지 처리 결과와 나머지 항목");
  expect(result.current.checking).toBe(false);
});
it("U18: failed verification keeps an uncertain result and exits pending", async () => {
  const { result } = renderHook(useSaveVerification);
  await act(async () => {
    await result.current.verify(
      async () => {
        throw new Error();
      },
      { title: "초안" },
    );
  });
  expect(result.current.message).toContain("저장 여부를 확인하지 못했습니다.");
  expect(result.current.checking).toBe(false);
});
import SpartaPhraseCheckModal from "../src/spartaDesignSystem/SpartaPhraseCheckModal";
it("U12/U23: deletion keeps typed confirmation and accessible keyboard dialog", () => {
  const remove = vi.fn();
  render(
    <SpartaPhraseCheckModal isOpen modalId="delete" modalPurpose="delete" onClose={vi.fn()} onClickEvent={remove}>
      <p>삭제 대상: 테스트 게임</p>
    </SpartaPhraseCheckModal>,
  );
  expect((screen.getByRole("button", { name: "문구를 올바르게 입력해주세요." }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "게임을 삭제하겠습니다" } });
  fireEvent.click(screen.getByRole("button", { name: "게임 삭제" }));
  expect(remove).toHaveBeenCalledOnce();
});
