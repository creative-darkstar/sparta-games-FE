import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGameUpload } from "../src/hook/useGameUpload";
import { postGameList, putGameList } from "../src/api/game";
import { uploadGameZip } from "../src/api/upload";
vi.mock("../src/api/game", () => ({ postGameList: vi.fn(), putGameList: vi.fn() }));
vi.mock("../src/api/upload", () => ({ uploadGameZip: vi.fn() }));
const file = new File(["zip"], "game.zip");
const success = { data: { status: "success", data: { game_id: 15, task_id: "task-15" } } };
const failure = (status?: number) => ({ isAxiosError: true, response: status ? { status } : undefined });
beforeEach(() => {
  vi.mocked(uploadGameZip).mockReset().mockResolvedValue("zips/test.zip");
  vi.mocked(postGameList)
    .mockReset()
    .mockResolvedValue(success as never);
  vi.mocked(putGameList)
    .mockReset()
    .mockResolvedValue(success as never);
});
describe("upload submission contract", () => {
  it("U04: sends file_key only after S3 succeeds", async () => {
    const { result } = renderHook(useGameUpload);
    const body = new FormData();
    await act(async () => {
      expect(await result.current.submit(body, file)).toEqual({ game_id: 15, task_id: "task-15" });
    });
    expect(body.get("gamefile")).toBe("zips/test.zip");
    expect(postGameList).toHaveBeenCalledOnce();
    expect(result.current.stage).toBe("accepted");
  });
  it("U05/U13: 100% transfer is still pending and duplicate calls are blocked", async () => {
    let finish!: (v: typeof success) => void;
    vi.mocked(postGameList).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }) as never,
    );
    vi.mocked(uploadGameZip).mockImplementation(async (_file, progress) => {
      progress(100);
      return "zips/test.zip";
    });
    const { result } = renderHook(useGameUpload);
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.submit(new FormData(), file);
    });
    expect(result.current.stage).toBe("submitting");
    expect(result.current.pending).toBe(true);
    expect(result.current.progress).toBe(100);
    await act(async () => {
      expect(await result.current.submit(new FormData(), file)).toBeNull();
      finish(success);
      await pending;
    });
    expect(postGameList).toHaveBeenCalledOnce();
  });
  it("U06: failed S3 never creates a game and manual retry obtains a fresh upload", async () => {
    vi.mocked(uploadGameZip).mockRejectedValueOnce(failure(403));
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      await result.current.submit(new FormData(), file);
    });
    expect(postGameList).not.toHaveBeenCalled();
    expect(result.current.stage).toBe("failed");
    await act(async () => {
      await result.current.submit(new FormData(), file);
    });
    expect(uploadGameZip).toHaveBeenCalledTimes(2);
    expect(postGameList).toHaveBeenCalledOnce();
  });
  it.each([400, 401, 403])("U07: HTTP %i preserves a failed state, never completion", async (status) => {
    vi.mocked(postGameList).mockRejectedValue(failure(status));
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      expect(await result.current.submit(new FormData(), file)).toBeNull();
    });
    expect(result.current.stage).toBe("failed");
    expect(result.current.pending).toBe(false);
  });
  it.each([undefined, 500, 504, 408])(
    "U08: uncertain response %s prevents automatic or repeated creation",
    async (status) => {
      vi.mocked(postGameList).mockRejectedValue(failure(status));
      const { result } = renderHook(useGameUpload);
      await act(async () => {
        await result.current.submit(new FormData(), file);
      });
      expect(result.current.stage).toBe("uncertain");
      await act(async () => {
        await result.current.submit(new FormData(), file);
      });
      expect(postGameList).toHaveBeenCalledOnce();
    },
  );
  it("reuses uploaded file after clear validation error; invalidates on selection change", async () => {
    vi.mocked(postGameList).mockRejectedValueOnce(failure(400));
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      await result.current.submit(new FormData(), file);
    });
    await act(async () => {
      await result.current.submit(new FormData(), file);
    });
    expect(uploadGameZip).toHaveBeenCalledOnce();
    act(() => result.current.invalidateFile());
    await act(async () => {
      await result.current.submit(new FormData(), file);
    });
    expect(uploadGameZip).toHaveBeenCalledTimes(2);
  });
  it("U09: metadata-only edit omits gamefile and retains old_screenshots", async () => {
    const body = new FormData();
    body.append("old_screenshots", "7");
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      await result.current.submit(body, null, 42);
    });
    expect(uploadGameZip).not.toHaveBeenCalled();
    expect(body.has("gamefile")).toBe(false);
    expect(body.getAll("old_screenshots")).toEqual(["7"]);
    expect(putGameList).toHaveBeenCalledWith(body, 42, expect.any(AbortSignal));
  });
  it("U10: replacement edit uses new key", async () => {
    const body = new FormData();
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      await result.current.submit(body, file, 42);
    });
    expect(body.get("gamefile")).toBe("zips/test.zip");
    expect(putGameList).toHaveBeenCalledWith(body, 42, expect.any(AbortSignal));
  });
  it("does not treat an explicit business failure as success", async () => {
    vi.mocked(postGameList).mockResolvedValue({ data: { status: "fail" } } as never);
    const { result } = renderHook(useGameUpload);
    await act(async () => {
      expect(await result.current.submit(new FormData(), file)).toBeNull();
    });
    expect(result.current.stage).toBe("failed");
  });
});
