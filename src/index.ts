import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, handleCallTool } from "./handlers/tools.js";
import { logger } from "./utils/logger.js";

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
    this.server.onerror = (error) => logger.error({ error }, "MCP Error");
    
    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, closing server...");
      await this.server.close();
      process.exit(0);
    });
    
    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, closing server...");
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
    logger.info("Deepseek OCR MCP server running on stdio");
  }
}

const server = new DeepseekOcrServer();
server.run().catch((error) => {
  logger.error({ error }, "Fatal error during server run");
  process.exit(1);
});
