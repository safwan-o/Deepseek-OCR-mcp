import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { DeepseekAuth, AuthSession } from "./auth.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up two levels from dist/utils/ or src/utils/ to reach the project root
const APP_ROOT = path.resolve(__dirname, "..", "..");

// Apply stealth plugin
chromium.use(StealthPlugin());

/**
 * Uploader utility to handle sending files and prompts to Deepseek chat.
 */
export class DeepseekUploader {
  private static MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB
  private static PROMPT_FILE = process.env.OCR_PROMPT_FILE || path.join(APP_ROOT, "OCR-extraction-prompt.json");

  /**
   * Load a specific prompt from the configuration file.
   */
  static async loadPrompt(type: 'ocr_prompt' | 'analysis_prompt' = 'ocr_prompt'): Promise<string> {
    try {
      const data = await fs.readFile(this.PROMPT_FILE, "utf-8");
      const config = JSON.parse(data);
      if (!config[type]) {
        throw new Error(`Prompt type '${type}' not found in ${this.PROMPT_FILE}`);
      }
      return config[type];
    } catch (error: any) {
      const msg = `Failed to load prompt from ${this.PROMPT_FILE}: ${error.message}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  /**
   * Send a file and prompt to Deepseek.
   */
  static async sendData(filePath: string, prompt?: string): Promise<string> {
    // 1. Validate file
    await this.validateFile(filePath);

    // 2. Load session
    const session = await DeepseekAuth.loadSession();
    if (!session) {
      throw new Error("Authentication session not found. Please run the authenticate tool first.");
    }

    // 3. Resolve prompt early
    const finalPrompt = prompt || await this.loadPrompt('ocr_prompt');

    // 4. Launch stealth browser
    const browser = await chromium.launch({ 
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      // 5. Restore session (cookies and localStorage)
      await context.addCookies(session.cookies);
      
      const localStorageData = session.localStorage;
      await context.addInitScript((data) => {
        for (const [key, value] of Object.entries(data)) {
          window.localStorage.setItem(key, value);
        }
      }, localStorageData);

      const page = await context.newPage();
      
      logger.info("Navigating to Deepseek Chat...");
      await page.goto("https://chat.deepseek.com/", { waitUntil: "networkidle", timeout: 60000 });

      // Check if logged in
      if (page.url().includes("/login")) {
        throw new Error("Session expired. Please run the authenticate tool again.");
      }

      // Snapshot the initial message count before sending the new prompt
      const initialMessagesCount = await page.evaluate(() => {
        return document.querySelectorAll(".ds-markdown, .assistant-message").length;
      });

      logger.info("Uploading file...");
      // Deepseek usually has an input[type='file']
      const fileInput = await page.waitForSelector("input[type='file']", { state: "attached", timeout: 30000 });
      await fileInput.setInputFiles(path.resolve(filePath));

      // Wait for upload to complete by detecting the appearance of an attachment preview
      logger.info("Waiting for upload to finish...");
      try {
        await page.waitForSelector(".ds-upload-list-item, [class*='upload-list-item'], [class*='attachment-preview'], .ds-attachment", { 
          timeout: 15000,
          state: "attached"
        });
      } catch (e) {
        logger.warn("Could not find upload preview element, but proceeding anyway...");
      }

      logger.info("Sending prompt and waiting for generation...");
      const messageInput = await page.waitForSelector("textarea, div[contenteditable='true']", { state: "attached", timeout: 30000 });
      await messageInput.fill(finalPrompt);
      await messageInput.press("Enter");

      // 6. Wait for full output (detecting stop button disappearance or stable text)
      await page.waitForTimeout(5000); // Initial wait for generation to start
      
      let lastText = "";
      let stableCount = 0;
      const MAX_WAIT_STABLE = 45; // 45 * 2s = 90s max wait for stability
      let reachedStability = false;

      for (let i = 0; i < MAX_WAIT_STABLE; i++) {
        const currentText = await page.evaluate((count) => {
          const messages = document.querySelectorAll(".ds-markdown, .assistant-message");
          // Only look at messages after the initial snapshot
          if (messages.length <= count) return "";
          return (messages[messages.length - 1] as HTMLElement).innerText;
        }, initialMessagesCount);

        if (currentText && currentText === lastText && currentText !== "") {
          stableCount++;
          if (stableCount >= 3) { // Require 3 stable checks for higher confidence
            reachedStability = true;
            break;
          }
        } else {
          stableCount = 0;
          lastText = currentText;
        }

        // Check if the "Stop" generating button is visible
        const isGenerating = await page.evaluate(() => {
          const stopButton = document.querySelector('button[aria-label*="Stop"], button[title*="Stop"]');
          return !!stopButton;
        });

        await page.waitForTimeout(2000);
      }

      if (!reachedStability) {
        throw new Error(`Stability not reached within ${MAX_WAIT_STABLE * 2}s. The generation may still be in progress or failed. Please check the chat manually.`);
      }

      logger.info("Extraction complete! Capturing OCR result...");
      return lastText;

    } catch (error: any) {
      logger.error({ error }, "Error during data sending");
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        logger.info("Browser closed. Returning to hibernation.");
      }
    }
  }

  private static async validateFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 50MB limit (Current: ${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
      if (!allowedExts.includes(ext)) {
        throw new Error(`Unsupported file type: ${ext}. Only PDF and images (JPG, PNG, WEBP) are allowed.`);
      }
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw err;
    }
  }
}
