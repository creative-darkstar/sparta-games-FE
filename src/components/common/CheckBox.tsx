import nonCheckBox from "../../assets/nonCheckBox.svg";
import checkBox from "../../assets/checkBox.svg";
type Props = { check: boolean; onClickHandler: () => void; label?: string };
export default function CheckBox({ check, onClickHandler, label = "동의" }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={check}
      aria-label={label}
      onClick={onClickHandler}
      className="absolute right-0 bottom-0 z-10 cursor-pointer"
    >
      <img src={check ? checkBox : nonCheckBox} alt="" />
    </button>
  );
}
