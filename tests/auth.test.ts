import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepseekAuth } from "../src/utils/auth.js";
import fs from "fs/promises";
import { chromium } from "playwright-extra";

// Mocking fs and playwright-extra
vi.mock("fs/promises");
vi.mock("playwright-extra", () => ({
  chromium: {
    use: vi.fn(),
    launch: vi.fn(),
  },
}));

vi.mock("puppeteer-extra-plugin-stealth", () => ({
  default: vi.fn(),
}));

describe("DeepseekAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect if session exists", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const result = await DeepseekAuth.hasSession();
    expect(result).toBe(true);
    expect(fs.access).toHaveBeenCalled();
  });

  it("should return false if session does not exist", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("No file"));
    const result = await DeepseekAuth.hasSession();
    expect(result).toBe(false);
  });

  it("should load session from file", async () => {
    const mockSession = { cookies: [], localStorage: {}, lastUpdated: "2024-01-01" };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSession));
    const result = await DeepseekAuth.loadSession();
    expect(result).toEqual(mockSession);
  });

  it("should save session to file", async () => {
    const mockSession = { cookies: [], localStorage: {}, lastUpdated: "2024-01-01" };
    await DeepseekAuth.saveSession(mockSession as any);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".deepseek-session.json"),
      expect.stringContaining("2024-01-01")
    );
  });

  it("should handle authentication process through browser", async () => {
    const mockPage = {
      goto: vi.fn(),
      waitForURL: vi.fn(),
      evaluate: vi.fn().mockResolvedValue({ some: "data" }),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      cookies: vi.fn().mockResolvedValue([{ name: "test", value: "cookie" }]),
    };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
    };

    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);

    const session = await DeepseekAuth.authenticate();

    expect(chromium.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith("https://chat.deepseek.com/login");
    expect(mockPage.waitForURL).toHaveBeenCalled();
    expect(session.cookies).toHaveLength(1);
    expect(session.localStorage).toEqual({ some: "data" });
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
