import { expect, it } from "vitest";
import JSZip from "jszip";
import { validateGameZip } from "../src/util/gameZipValidation";
import { PASSWORD_PATTERN, NICKNAME_PATTERN } from "../src/util/accountValidation";
it("U02: rejects extension and size before parsing", async () => {
  await expect(validateGameZip(new File([], "a.7z"))).rejects.toThrow("ZIP");
  const file = new File([], "a.zip");
  Object.defineProperty(file, "size", { value: 500 * 1024 * 1024 + 1 });
  await expect(validateGameZip(file)).rejects.toThrow("500MiB");
  await expect(validateGameZip(new File(["corrupt"], "a.zip"))).rejects.toThrow("손상");
});
it("U02: accepts backend WebGL structure without optional TemplateData", async () => {
  const zip = new JSZip();
  for (const path of ["index.html", "Build/a.loader.js", "Build/a.wasm", "Build/a.framework.js", "Build/a.data"])
    zip.file(path, "sample");
  const bytes = await zip.generateAsync({ type: "uint8array" });
  await expect(validateGameZip(new File([bytes], "game.zip"))).resolves.toBeUndefined();
  zip.file("nested/index.html", "nested");
  await expect(
    validateGameZip(new File([await zip.generateAsync({ type: "uint8array" })], "game.zip")),
  ).rejects.toThrow("루트");
});
it("U21: shares backend nickname bounds and upper-case/special password rules", () => {
  for (const length of [4, 11, 12]) expect(NICKNAME_PATTERN.test("가".repeat(length))).toBe(true);
  for (const length of [3, 13]) expect(NICKNAME_PATTERN.test("a".repeat(length))).toBe(false);
  for (const password of ["ABCDEFG1!", "Abcdefg1~", "Abcdefg1`", "Abcdefg1\\"])
    expect(PASSWORD_PATTERN.test(password)).toBe(true);
  for (const password of ["ABCDEFGH!", "12345678!", "Abcdefg12", "Aa1!"])
    expect(PASSWORD_PATTERN.test(password)).toBe(false);
});
