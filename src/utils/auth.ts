import fs from "fs/promises";
import path from "path";
import { chromium, BrowserContext } from "playwright";
import dotenv from "dotenv";

dotenv.config();

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
    console.error("Launching browser for authentication...");
    
    // We must use headless: false so the user can see and interact with the page
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://chat.deepseek.com/login");

    console.error("Please sign in to Deepseek in the browser window.");
    
    // Wait for the user to be redirected to the chat page after login
    // Usually chat.deepseek.com/ or chat.deepseek.com/chat
    await page.waitForURL(/chat\.deepseek\.com\/?(chat)?/, { timeout: 300000 });

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
    await browser.close();

    console.error("Authentication successful! Session saved.");
    return session;
  }

  /**
   * Apply a saved session to a browser context.
   */
  static async applySession(context: BrowserContext, session: AuthSession) {
    await context.addCookies(session.cookies);
    // Note: Local storage usually needs to be injected into a specific page/origin
  }
}
