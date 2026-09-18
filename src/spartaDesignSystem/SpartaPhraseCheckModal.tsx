import { ReactNode, useEffect, useState } from "react";
import SpartaModal from "./SpartaModal";
type Props = {
  isOpen: boolean;
  modalId: string;
  isPending?: boolean;
  onClose: () => void;
  onClickEvent: () => void | Promise<void>;
  children: ReactNode;
  modalPurpose: "delete" | "profileDelete";
  closeOnClickOutside?: boolean;
};
export default function SpartaPhraseCheckModal({
  isOpen,
  modalId,
  isPending = false,
  onClose,
  onClickEvent,
  children,
  modalPurpose,
  closeOnClickOutside = false,
}: Props) {
  const [input, setInput] = useState("");
  useEffect(() => {
    if (isOpen) setInput("");
  }, [isOpen]);
  const noun = modalPurpose === "delete" ? "게임" : "프로필";
  const phrase = `${noun}을 삭제하겠습니다`;
  const close = () => {
    if (!isPending) onClose();
  };
  return (
    <SpartaModal
      isOpen={isOpen}
      modalId={modalId}
      onClose={close}
      title={`${noun}을 정말 삭제하시겠어요?`}
      type="error"
      closeOnClickOutside={closeOnClickOutside}
    >
      <div className="w-[700px] max-w-full text-white space-y-4">
        {children}
        <label className="block" htmlFor={`${modalId}-phrase`}>
          삭제 확인 문구: {phrase}
        </label>
        <input
          id={`${modalId}-phrase`}
          className="w-full p-3 bg-gray-700 border rounded"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={phrase}
          disabled={isPending}
        />
        <button
          type="button"
          className="w-full p-3 rounded bg-error-default disabled:opacity-50"
          disabled={isPending || input !== phrase}
          onClick={() => {
            if (!isPending && input === phrase) void onClickEvent();
          }}
        >
          {isPending ? "처리 중입니다." : input === phrase ? `${noun} 삭제` : "문구를 올바르게 입력해주세요."}
        </button>
      </div>
    </SpartaModal>
  );
}
