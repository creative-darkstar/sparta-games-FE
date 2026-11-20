import React, { useEffect, useRef } from "react";

import closeModalIcon from "../assets/common/closeModalIcon.svg";
import closeModalIconPrimary from "../assets/common/closeModalIconPrimary.svg";
import closeModalIconAlert from "../assets/common/closeModalIconAlert.svg";
import closeModalIconError from "../assets/common/closeModalIconError.svg";

export type TModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalId: string;
  closeOnClickOutside?: boolean;
  title?: string;
  type?: "primary" | "alert" | "error" | "grey";
};

const SpartaModal = ({
  isOpen,
  onClose,
  children,
  modalId,
  closeOnClickOutside = true,
  title,
  type = "primary",
}: TModalProps) => {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = dialog.current;
    const focusable = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] || root)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) {
          event.preventDefault();
          root?.focus();
          return;
        }
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    root?.addEventListener("keydown", keydown);
    return () => {
      root?.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (closeOnClickOutside) {
      onClose();
    }
  };

  const getStyledType = () => {
    switch (type) {
      case "primary":
        return "border-primary-400" + " shadow-primary";
      case "alert":
        return "border-alert-default" + " shadow-alert";
      case "error":
        return "border-error-default" + " shadow-error";
      default:
        return "border-primary-400" + " shadow-primary";
    }
  };

  const getCloseModalIcon = () => {
    switch (type) {
      case "primary":
        return closeModalIconPrimary;
      case "alert":
        return closeModalIconAlert;
      case "error":
        return closeModalIconError;
      default:
        return closeModalIcon;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 "
      onClick={handleOverlayClick}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title || "확인"}
        id={modalId}
        tabIndex={-1}
        className={`bg-gray-800 p-10 w-fit max-w-[1250px] mx-4 transform transition-all duration-300 ease-in-out animate-modalSlideIn rounded-[20px] border-[1px] border-solid ${getStyledType()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <div
              className={`text-[24px] ${
                type === "error"
                  ? "text-error-default"
                  : type === "alert"
                    ? "text-alert-default"
                    : type === "primary"
                      ? "text-primary-400"
                      : "text-gray-500"
              } 
              font-DungGeunMo `}
            >
              {title}
            </div>
            <button type="button" aria-label="모달 닫기" onClick={onClose}>
              <img src={getCloseModalIcon()} alt="close modal" className="w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default SpartaModal;
