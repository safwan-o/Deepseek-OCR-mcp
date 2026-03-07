import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure the production logger using pino.
 * In development, we use pino-pretty for better readability.
 * We write to stderr to avoid corrupting MCP stdio transport.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "HH:MM:ss.l",
      destination: 2, // Write to stderr
    },
  },
});
