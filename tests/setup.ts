import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
Object.defineProperty(HTMLElement.prototype, "getClientRects", {
  configurable: true,
  value: () => [{ width: 100, height: 30 }],
});
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
// React Router uses Node's Request in jsdom; its native Request rejects jsdom's
// AbortSignal. These tests use no network loaders, so omit only that signal.
const NativeRequest = globalThis.Request;
vi.stubGlobal(
  "Request",
  class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, init ? { ...init, signal: undefined } : undefined);
    }
  },
);
