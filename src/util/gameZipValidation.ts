import JSZip from "jszip";
import { checkFileSize, checkFileType } from "./fileValidation";
export async function validateGameZip(file: File) {
  if (!checkFileType(file)) throw new Error("ZIP 파일을 선택해주세요.");
  if (!checkFileSize(file, 500 * 1024 * 1024)) throw new Error("ZIP 파일은 최대 500MiB(524,288,000바이트)입니다.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("손상되었거나 읽을 수 없는 ZIP 파일입니다.");
  }
  const names = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => entry.name.replace(/\\/g, "/").replace(/^\.\//, ""));
  if (
    !names.some((n) => n.toLowerCase() === "index.html") ||
    names.some((n) => n.toLowerCase().endsWith("/index.html"))
  )
    throw new Error("index.html은 ZIP 루트에만 있어야 합니다.");
  const build = names.filter((n) => n.startsWith("Build/")).map((n) => n.toLowerCase());
  const required = [
    [".loader.js", "unityloader.js"],
    [
      ".wasm.unityweb",
      ".wasm.br",
      ".wasm.gz",
      ".wasm",
      ".wasm.code.unityweb",
      ".wasm.code.br",
      ".wasm.code.gz",
      ".asm.js",
      ".jsgz",
    ],
    [
      ".framework.js.unityweb",
      ".framework.js.br",
      ".framework.js.gz",
      ".framework.js",
      ".wasm.framework.unityweb",
      ".wasm.framework.br",
      ".wasm.framework.gz",
      ".js.unityweb",
      ".js.br",
      ".js.gz",
    ],
    [".data.unityweb", ".data.br", ".data.gz", ".data"],
  ];
  if (!required.every((extensions) => build.some((n) => extensions.some((ext) => n.endsWith(ext)))))
    throw new Error("Build 폴더에 loader, wasm, framework, data 파일이 필요합니다.");
}
