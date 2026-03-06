import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { BrowserContext } from "playwright";
import dotenv from "dotenv";

dotenv.config();

// Apply stealth plugin
chromium.use(StealthPlugin());

const SESSION_FILE = path.join(process.cwd(), ".deepseek-session.json");

export interface AuthSession {
  cookies: any[];
  localStorage: Record<string, string>;
  lastUpdated: string;
}

export class DeepseekAuth {
  /**
   * Check if a valid session exists.
   */
  static async hasSession(): Promise<boolean> {
    try {
      await fs.access(SESSION_FILE);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load the session data from disk.
   */
  static async loadSession(): Promise<AuthSession | null> {
    try {
      const data = await fs.readFile(SESSION_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save the session data to disk.
   */
  static async saveSession(session: AuthSession): Promise<void> {
    await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
  }

  /**
   * Start the interactive authentication process.
   * This opens a browser window for the user to sign in manually.
   */
  static async authenticate(): Promise<AuthSession> {
    const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
    const allowInteractive = process.env.ALLOW_INTERACTIVE_AUTH === "true" || (!isCI && process.env.HEADLESS !== "true");

    if (!allowInteractive) {
      throw new Error(
        "Interactive authentication is required but the current environment does not support headed browsers (CI or HEADLESS detected). " +
        "Please run this tool in a local environment with a display to sign in to Deepseek, or ensure ALLOW_INTERACTIVE_AUTH=true is set if a display is available."
      );
    }

    console.error("Launching browser for authentication...");
    
    const browser = await chromium.launch({ 
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();

      await page.goto("https://chat.deepseek.com/login");

      console.error("Please sign in to Deepseek in the browser window.");
      
      // Wait for the URL to change to the chat interface, explicitly avoiding the login page
      await page.waitForURL((url) => {
        const path = url.pathname;
        return (path === "/" || path === "/chat") && url.hostname === "chat.deepseek.com";
      }, { timeout: 300000 });

      console.error("Login detected! Capturing session data...");

      const cookies = await context.cookies();
      const localStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            data[key] = window.localStorage.getItem(key) || "";
          }
        }
        return data;
      });

      const session: AuthSession = {
        cookies,
        localStorage: localStorageData,
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSession(session);
      console.error("Authentication successful! Session saved.");
      return session;
    } finally {
      await browser.close();
    }
  }

  /**
   * Apply a saved session to a browser context.
   */
  static async applySession(context: BrowserContext, session: AuthSession) {
    await context.addCookies(session.cookies);
  }
}
