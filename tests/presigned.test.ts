import { beforeEach, expect, it, vi } from "vitest";
import { uploadGameZip } from "../src/api/upload";
const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), create: vi.fn() }));
vi.mock("../src/api/axios", () => ({ sparta_games_auth: { post: mocks.post } }));
vi.mock("axios", () => ({ default: { create: mocks.create.mockReturnValue({ put: mocks.put }) } }));
beforeEach(() => {
  mocks.post.mockResolvedValue({
    data: {
      data: {
        upload_url: "https://storage.example/upload",
        file_key: "zips/new.zip",
        object_key: "media/zips/new.zip",
        url: "https://storage.example/file",
      },
    },
  });
  mocks.put.mockResolvedValue({});
});
it("S3 PUT is isolated, tagged, and returns only the relative file key", async () => {
  const file = new File(["data"], "original.zip");
  const progress = vi.fn();
  expect(await uploadGameZip(file, progress)).toBe("zips/new.zip");
  expect(mocks.post).toHaveBeenCalledWith(
    "/commons/api/presigned-url/upload/",
    { base_path: "zips", extension: "zip", filename: "original.zip" },
    { signal: undefined },
  );
  const config = mocks.put.mock.calls[0][2];
  expect(config.headers).toEqual({ "Content-Type": "application/zip", "x-amz-tagging": "is_used=false" });
  config.onUploadProgress({ loaded: 42, total: 100 });
  expect(progress).toHaveBeenLastCalledWith(42);
  config.onUploadProgress({ loaded: 42 });
  expect(progress).toHaveBeenLastCalledWith(null);
});
it("rejects object_key substituted for file_key before PUT", async () => {
  mocks.post.mockResolvedValue({
    data: { data: { upload_url: "https://storage.example", file_key: "media/zips/new.zip" } },
  });
  await expect(uploadGameZip(new File([], "a.zip"), vi.fn())).rejects.toThrow();
  expect(mocks.put).not.toHaveBeenCalled();
});
