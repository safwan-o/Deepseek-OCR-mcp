import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import { DeepseekAuth } from "../utils/auth.js";
import { DeepseekUploader } from "../utils/uploader.js";

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
    name: "send_data",
    description: "Send an image or PDF to Deepseek chat for processing (e.g., OCR, analysis). Requires valid authentication.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the image or PDF file to send.",
        },
        prompt: {
          type: "string",
          description: "Optional prompt to send with the file. Defaults to performing OCR.",
        },
      },
      required: ["file_path"],
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
              text: `Authentication successful! Session saved on ${session.lastUpdated}. You can now use the data sending tool.`,
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

    case "send_data": {
      const { file_path, prompt } = args;
      const defaultPrompt = "Please extract all text from this file and provide the content clearly.";
      const finalPrompt = prompt || defaultPrompt;

      try {
        const responseText = await DeepseekUploader.sendData(file_path, finalPrompt);
        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to send data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "ocr_image": {
      // For now, ocr_image will use the send_data logic for consistency
      const { image_path } = args;
      const prompt = "Please perform OCR on this image and provide the full text content.";
      
      try {
        const responseText = await DeepseekUploader.sendData(image_path, prompt);
        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `OCR failed: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
