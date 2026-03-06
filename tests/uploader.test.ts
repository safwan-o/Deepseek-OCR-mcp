import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepseekUploader } from "../src/utils/uploader.js";
import { DeepseekAuth } from "../src/utils/auth.js";
import fs from "fs/promises";

// Mocking playwright-extra
vi.mock("playwright-extra", () => ({
  chromium: {
    use: vi.fn(),
    launch: vi.fn(),
  },
}));

vi.mock("puppeteer-extra-plugin-stealth", () => ({
  default: vi.fn(),
}));

vi.mock("fs/promises");
vi.mock("../src/utils/auth.js", () => ({
  DeepseekAuth: {
    loadSession: vi.fn(),
    hasSession: vi.fn(),
  },
}));

describe("DeepseekUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate file existence and size", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 51 * 1024 * 1024 } as any);
    await expect(DeepseekUploader.sendData("test.png", "test")).rejects.toThrow("exceeds 50MB limit");
  });

  it("should fail if no session found", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(DeepseekAuth.loadSession).mockResolvedValue(null);
    await expect(DeepseekUploader.sendData("test.png", "test")).rejects.toThrow("Authentication session not found");
  });

  it("should throw error if prompt file is missing and no prompt provided", async () => {
    const { chromium } = await import("playwright-extra");
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(DeepseekAuth.loadSession).mockResolvedValue({ cookies: [], localStorage: {}, lastUpdated: "" });
    vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));
    
    const mockContext = {
      addCookies: vi.fn(),
      addInitScript: vi.fn(),
      newPage: vi.fn(),
    };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
    };
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    await expect(DeepseekUploader.sendData("test.png")).rejects.toThrow("Failed to load prompt");
  });

  it("should perform upload and send prompt", async () => {
    const { chromium } = await import("playwright-extra");
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(DeepseekAuth.loadSession).mockResolvedValue({ cookies: [], localStorage: {}, lastUpdated: "" });
    
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue("https://chat.deepseek.com/"),
      waitForSelector: vi.fn().mockResolvedValue({ 
        setInputFiles: vi.fn(),
        fill: vi.fn(),
        press: vi.fn()
      }),
      waitForTimeout: vi.fn(),
      evaluate: vi.fn().mockResolvedValue("OCR response text"),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      addCookies: vi.fn(),
      addInitScript: vi.fn(),
    };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
    };

    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);

    const result = await DeepseekUploader.sendData("test.png", "Perform OCR");
    
    expect(chromium.launch).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith("https://chat.deepseek.com/", expect.anything());
    expect(mockPage.waitForSelector).toHaveBeenCalledWith("input[type='file']", expect.anything());
    expect(mockPage.waitForSelector).toHaveBeenCalledWith("textarea, div[contenteditable='true']", expect.anything());
    expect(result).toBe("OCR response text");
  });

  it("should throw error if stability is not reached within timeout", async () => {
    const { chromium } = await import("playwright-extra");
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(DeepseekAuth.loadSession).mockResolvedValue({ cookies: [], localStorage: {}, lastUpdated: "" });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ ocr_prompt: "Test prompt" }));
    
    const mockPage = {
      goto: vi.fn(),
      url: vi.fn().mockReturnValue("https://chat.deepseek.com/"),
      waitForSelector: vi.fn().mockResolvedValue({ 
        setInputFiles: vi.fn(),
        fill: vi.fn(),
        press: vi.fn()
      }),
      waitForTimeout: vi.fn(),
      // Mocking evaluate to always return a new string, preventing stability
      evaluate: vi.fn().mockImplementation((fn, arg) => {
        if (typeof fn === 'function' && fn.toString().includes('length')) return 0; // initialMessagesCount
        if (typeof fn === 'function' && fn.toString().includes('Stop')) return true; // isGenerating
        return `dynamic text ${Math.random()}`; // currentText
      }),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      addCookies: vi.fn(),
      addInitScript: vi.fn(),
    };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
    };

    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);

    await expect(DeepseekUploader.sendData("test.png")).rejects.toThrow("Stability not reached");
  });
});
