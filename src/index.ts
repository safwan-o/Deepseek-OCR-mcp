import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, handleCallTool } from "./handlers/tools.js";

/**
 * The Deepseek OCR MCP Server.
 * 
 * Provides OCR capabilities using Deepseek models with integrated authentication.
 */
class DeepseekOcrServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "deepseek-ocr-mcp",
        version: "1.1.0",
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
    
    // Graceful shutdown
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
    
    process.on("SIGTERM", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // List all tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Dispatch tool calls
    this.server.setRequestHandler(CallToolRequestSchema, (request) => handleCallTool(request));
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Deepseek OCR MCP server running on stdio");
  }
}

const server = new DeepseekOcrServer();
server.run().catch(console.error);
