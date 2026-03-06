import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import { DeepseekAuth } from "../utils/auth.js";

/**
 * List of tools supported by the server.
 */
export const TOOLS: Tool[] = [
  {
    name: "authenticate",
    description: "Launch a browser window to sign in to Deepseek and store credentials. Use this if authentication is missing or has expired.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "ocr_image",
    description: "Perform OCR on an image using Deepseek. Requires valid authentication.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: {
          type: "string",
          description: "Path to the image file to OCR.",
        },
      },
      required: ["image_path"],
    },
  },
];

/**
 * Handles tool calls.
 */
export async function handleCallTool(request: any) {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "authenticate": {
      try {
        const session = await DeepseekAuth.authenticate();
        return {
          content: [
            {
              type: "text",
              text: `Authentication successful! Session saved on ${session.lastUpdated}. You can now use the OCR tool.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Authentication failed: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "ocr_image": {
      const hasAuth = await DeepseekAuth.hasSession();
      if (!hasAuth) {
        return {
          content: [
            {
              type: "text",
              text: "Authentication is missing. Please run the 'authenticate' tool first to sign in to Deepseek.",
            },
          ],
          isError: true,
        };
      }

      // Placeholder for OCR implementation
      return {
        content: [
          {
            type: "text",
            text: "OCR implementation is coming in the next phase. Authentication is present.",
          },
        ],
      };
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
