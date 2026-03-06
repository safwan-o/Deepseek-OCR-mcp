import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCallTool } from "../src/handlers/tools.js";
import { DeepseekAuth } from "../src/utils/auth.js";

// Mocking DeepseekAuth
vi.mock("../src/utils/auth.js", () => ({
  DeepseekAuth: {
    authenticate: vi.fn(),
    hasSession: vi.fn(),
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
    expect(response.content[0].text).toContain("2024-01-01");
  });

  it("should return error when ocr_image tool is called without session", async () => {
    vi.mocked(DeepseekAuth.hasSession).mockResolvedValue(false);

    const request = {
      params: {
        name: "ocr_image",
        arguments: { image_path: "test.png" },
      },
    };

    const response = await handleCallTool(request);
    expect(DeepseekAuth.hasSession).toHaveBeenCalled();
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Authentication is missing");
  });
});
