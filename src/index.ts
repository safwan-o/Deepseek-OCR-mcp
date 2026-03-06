import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * The Deepseek OCR MCP Server.
 * 
 * This server provides tools for OCR using Deepseek models.
 */
class DeepseekOcrServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "deepseek-ocr-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ocr_image",
          description: "Perform OCR on an image using Deepseek.",
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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "ocr_image") {
        return {
          content: [
            {
              type: "text",
              text: "OCR tool placeholder response. Ready for implementation.",
            },
          ],
        };
      }
      throw new Error(`Tool not found: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Deepseek OCR MCP server running on stdio");
  }
}

const server = new DeepseekOcrServer();
server.run().catch(console.error);
