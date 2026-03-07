import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCallTool } from "../src/handlers/tools.js";
import { DeepseekAuth } from "../src/utils/auth.js";
import { DeepseekUploader } from "../src/utils/uploader.js";

// Mocking DeepseekAuth and DeepseekUploader
vi.mock("../src/utils/auth.js", () => ({
  DeepseekAuth: {
    authenticate: vi.fn(),
    hasSession: vi.fn(),
  },
}));

vi.mock("../src/utils/uploader.js", () => ({
  DeepseekUploader: {
    sendData: vi.fn(),
  },
}));

describe("Tool Handler Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call authenticate method when authenticate tool is invoked", async () => {
    const mockSession = { lastUpdated: "2024-01-01" };
    vi.mocked(DeepseekAuth.authenticate).mockResolvedValue(mockSession as any);

    const request = {
      params: {
        name: "authenticate",
        arguments: {},
      },
    };

    const response = await handleCallTool(request);
    expect(DeepseekAuth.authenticate).toHaveBeenCalled();
    expect(response.content[0].text).toContain("Authentication successful");
  });

  it("should return error when send_data tool fails", async () => {
    vi.mocked(DeepseekUploader.sendData).mockRejectedValue(new Error("Upload failed"));

    const request = {
      params: {
        name: "send_data",
        arguments: { file_paths: ["test.pdf"], prompt: "Summarize" },
      },
    };

    const response = await handleCallTool(request);
    expect(DeepseekUploader.sendData).toHaveBeenCalled();
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Failed to send data: Upload failed");
  });

  it("should call sendData when ocr_document tool is invoked", async () => {
    vi.mocked(DeepseekAuth.hasSession).mockResolvedValue(true);
    vi.mocked(DeepseekUploader.sendData).mockResolvedValue("OCR result");

    const request = {
      params: {
        name: "ocr_document",
        arguments: { file_paths: ["test.png"] },
      },
    };

    const response = await handleCallTool(request);
    expect(DeepseekUploader.sendData).toHaveBeenCalledWith(["test.png"]);
    expect(response.content[0].text).toBe("OCR result");
  });

  it("should return success message when finish_operation is called", async () => {
    const request = {
      params: {
        name: "finish_operation",
        arguments: {},
      },
    };

    const response = await handleCallTool(request);
    expect(response.content[0].text).toContain("All operations finished");
  });
});
