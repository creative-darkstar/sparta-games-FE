import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import ReactQuill from "react-quill";
import { TGameUploadInput } from "../../types";
import "react-quill/dist/quill.snow.css";

const GameDescriptionField = ({ disabled = false }: { disabled?: boolean }) => {
  const { watch, setValue } = useFormContext<TGameUploadInput>();

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const labels: Record<string, string> = {
      bold: "굵게",
      italic: "기울임",
      underline: "밑줄",
      list: "목록",
      color: "글자 색",
      background: "배경 색",
    };
    container.current?.querySelectorAll<HTMLButtonElement>(".ql-toolbar button").forEach((button) => {
      const key = Object.keys(labels).find((name) => button.classList.contains("ql-" + name));
      if (key) button.setAttribute("aria-label", labels[key] + (button.value ? " " + button.value : ""));
    });
    container.current?.querySelectorAll<HTMLElement>(".ql-picker-label").forEach((picker) => {
      if (picker.parentElement?.classList.contains("ql-color")) picker.setAttribute("aria-label", "글자 색");
      if (picker.parentElement?.classList.contains("ql-background")) picker.setAttribute("aria-label", "배경 색");
    });
    container.current?.querySelector(".ql-editor")?.setAttribute("aria-label", "게임 설명");
  }, []);
  const editorContent = watch("content");

  const handleEditorChange = (editorState: string) => {
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = editorState;

    const isEmptyContent = tempContainer.innerHTML.trim() === "<p><br></p>";
    const cleanedContent = isEmptyContent ? "" : editorState;

    setValue("content", cleanedContent, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div ref={container} className="flex flex-col gap-2 mb-8 formContent">
      <div className="flex items-center gap-2 text-base font-semibold text-white">
        게임설명 <p className="text-body-14 text-primary-500">*필수</p>
      </div>

      <ReactQuill
        readOnly={disabled}
        theme="snow"
        value={editorContent}
        onChange={handleEditorChange}
        modules={{
          toolbar: [
            [{ header: [1, 2] }],
            [{ size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
          ],
        }}
        placeholder="이렇게 입력해보세요!&#10;• 간단한 게임 스토리&#10;• 개발자의 한마디&#10;• 팀원들의 정보&#10;• 업데이트 계획"
        className="text-white"
      />
    </div>
  );
};

export default GameDescriptionField;
