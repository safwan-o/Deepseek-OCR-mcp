import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { DeepseekAuth, AuthSession } from "./auth.js";
import fs from "fs/promises";
import path from "path";

// Apply stealth plugin
chromium.use(StealthPlugin());

/**
 * Uploader utility to handle sending files and prompts to Deepseek chat.
 */
export class DeepseekUploader {
  private static MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB
  private static PROMPT_FILE = path.join(process.cwd(), "OCR-extraction-prompt.json");

  /**
   * Load a specific prompt from the configuration file.
   */
  static async loadPrompt(type: 'ocr_prompt' | 'analysis_prompt' = 'ocr_prompt'): Promise<string> {
    try {
      const data = await fs.readFile(this.PROMPT_FILE, "utf-8");
      const config = JSON.parse(data);
      return config[type] || config.ocr_prompt;
    } catch (error) {
      console.error(`Error loading prompt from ${this.PROMPT_FILE}:`, error);
      return "Please perform OCR on the attached document and provide the extracted text.";
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

    // 3. Launch stealth browser
    const browser = await chromium.launch({ 
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      // 4. Restore session (cookies and localStorage)
      await context.addCookies(session.cookies);
      
      const localStorageData = session.localStorage;
      await context.addInitScript((data) => {
        for (const [key, value] of Object.entries(data)) {
          window.localStorage.setItem(key, value);
        }
      }, localStorageData);

      const page = await context.newPage();
      
      console.error("Navigating to Deepseek Chat...");
      await page.goto("https://chat.deepseek.com/", { waitUntil: "networkidle", timeout: 60000 });

      // Check if logged in
      if (page.url().includes("/login")) {
        throw new Error("Session expired. Please run the authenticate tool again.");
      }

      // 5. Use pre-determined prompt if none provided
      const finalPrompt = prompt || await this.loadPrompt('ocr_prompt');

      console.error("Uploading file...");
      // Deepseek usually has an input[type='file']
      const fileInput = await page.waitForSelector("input[type='file']", { timeout: 30000 });
      await fileInput.setInputFiles(path.resolve(filePath));

      // Wait for upload to complete
      await page.waitForTimeout(3000); 

      console.error("Sending prompt and waiting for generation...");
      const messageInput = await page.waitForSelector("textarea, div[contenteditable='true']", { timeout: 30000 });
      await messageInput.fill(finalPrompt);
      await messageInput.press("Enter");

      // 6. Wait for full output (detecting stop button disappearance or stable text)
      // We look for the "Stop" button (usually a square icon in a button)
      // Or we can poll for the assistant response until it stabilizes.
      await page.waitForTimeout(5000); // Initial wait for generation to start
      
      let lastText = "";
      let stableCount = 0;
      const MAX_WAIT_STABLE = 30; // 30 * 2s = 60s max wait for stability

      for (let i = 0; i < MAX_WAIT_STABLE; i++) {
        const currentText = await page.evaluate(() => {
          const messages = document.querySelectorAll(".ds-markdown, .assistant-message");
          if (messages.length === 0) return "";
          return (messages[messages.length - 1] as HTMLElement).innerText;
        });

        if (currentText && currentText === lastText && currentText !== "No response detected yet.") {
          stableCount++;
          // If the text is stable for 2 consecutive checks, we assume it's done
          if (stableCount >= 2) break;
        } else {
          stableCount = 0;
          lastText = currentText;
        }

        // Check if the "Stop" generating button is visible
        const isGenerating = await page.evaluate(() => {
          // Look for buttons with specific icons or text that indicate generating state
          // e.g. a button that has a 'stop' icon or a 'generating' tooltip
          const stopButton = document.querySelector('button[aria-label*="Stop"], button[title*="Stop"]');
          return !!stopButton;
        });

        if (!isGenerating && lastText.length > 0) {
          // If no stop button is found and we have some text, it might be done
          // But Deepseek sometimes takes a second to show the button, so we use stability too.
        }

        await page.waitForTimeout(2000);
      }

      console.error("Extraction complete! Capturing OCR result...");
      return lastText || "No OCR output captured. Please check the document manually.";

    } catch (error: any) {
      console.error(`Error during data sending: ${error.message}`);
      throw error;
    } finally {
      // 7. Ensure browser closes (hibernation state)
      await browser.close();
      console.error("Browser closed. Returning to hibernation.");
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
