import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure the production logger using pino.
 * In development, we use pino-pretty for better readability.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "HH:MM:ss.l",
    },
  } : undefined,
});
