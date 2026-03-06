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
  private static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Send a file and prompt to Deepseek.
   */
  static async sendData(filePath: string, prompt: string): Promise<string> {
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
    
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await context.addCookies(session.cookies);

    const page = await context.newPage();
    
    try {
      console.error("Navigating to Deepseek Chat...");
      await page.goto("https://chat.deepseek.com/", { waitUntil: "networkidle", timeout: 60000 });

      // Check if logged in (if we are redirected to login, the cookies might be expired)
      if (page.url().includes("/login")) {
        throw new Error("Session expired. Please run the authenticate tool again.");
      }

      console.error("Uploading file...");
      // Deepseek usually has an input[type='file']
      const fileInput = await page.waitForSelector("input[type='file']", { timeout: 30000 });
      await fileInput.setInputFiles(path.resolve(filePath));

      // Wait for upload to complete
      await page.waitForTimeout(2000); 

      console.error("Sending prompt...");
      // Find the message input
      const messageInput = await page.waitForSelector("textarea, div[contenteditable='true']", { timeout: 30000 });
      await messageInput.fill(prompt);
      
      // Press Enter or click send button
      await messageInput.press("Enter");

      console.error("Waiting for response...");
      await page.waitForTimeout(5000); 
      
      // Attempt to extract the last message from the assistant
      const response = await page.evaluate(() => {
        const messages = document.querySelectorAll(".ds-markdown, .assistant-message");
        if (messages.length === 0) return "No response detected yet.";
        return (messages[messages.length - 1] as HTMLElement).innerText;
      });

      console.error("Data sent successfully!");
      return response;

    } catch (error: any) {
      console.error(`Error during data sending: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private static async validateFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit (Current: ${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
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
