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
    name: "ocr_document",
    description: "Perform high-fidelity OCR on an image or PDF using Deepseek's advanced models. Uses the pre-configured extraction prompt.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the image (JPG, PNG, WEBP) or PDF file.",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "send_data",
    description: "Send a file and a custom prompt to Deepseek chat. Returns the assistant's full response.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file to send.",
        },
        prompt: {
          type: "string",
          description: "Custom prompt to accompany the file.",
        },
      },
      required: ["file_path", "prompt"],
    },
  },
  {
    name: "finish_operation",
    description: "Signals the MCP server to complete current tasks, clean up resources, and enter hibernation mode.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
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
              text: `Authentication successful! Session saved on ${session.lastUpdated}. Resources are now in hibernation.`,
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

    case "ocr_document": {
      const { file_path } = args;
      
      // Workflow: Check Auth -> Send Status -> Process -> Return Result -> Hibernate
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

      try {
        // Note: In standard MCP tool calls, we can't easily send an intermediate "pending" status 
        // while the tool is still running, unless the host supports progress notifications.
        // We will return the final OCR result after full generation.
        const result = await DeepseekUploader.sendData(file_path);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `OCR Operation failed: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "send_data": {
      const { file_path, prompt } = args;

      try {
        const responseText = await DeepseekUploader.sendData(file_path, prompt);
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

    case "finish_operation": {
      // Browser instances are closed automatically in the finally blocks of uploader methods.
      // This tool provides a logical end to the session for the LLM.
      return {
        content: [
          {
            type: "text",
            text: "All operations finished. Resources cleaned up. MCP server is now hibernating.",
          },
        ],
      };
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
