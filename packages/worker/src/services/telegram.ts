import type { Env, OAuthTokens } from '../types/env';
import { AppError } from '../middleware/error-handler';

export class TelegramService {
  constructor(
    protected env: Env,
    protected driveAccountId: string,
    private token: string, // Bot token or session string
    private channelId: string
  ) {}

  async getQuota(): Promise<{ total: number; used: number }> {
    // Return a dummy unlimited quota (100 TB total, 0 used)
    return {
      total: 100 * 1024 * 1024 * 1024 * 1024,
      used: 0,
    };
  }

  // Get the signed/direct URL for the helper upload endpoint
  async getUploadUrl(fileName: string): Promise<string> {
    const helperUrl = this.env.TELEGRAM_HELPER_URL || 'http://localhost:8899';
    return `${helperUrl}/upload`;
  }

  // Get the signed/direct URL for the helper download endpoint
  getDownloadUrl(messageId: string): string {
    const helperUrl = this.env.TELEGRAM_HELPER_URL || 'http://localhost:8899';
    return `${helperUrl}/download/${this.channelId}/${messageId}?auth=${encodeURIComponent(this.token)}`;
  }

  async deleteFile(messageId: string): Promise<void> {
    // GramJS deletion can be performed via the helper, but since we are serverless,
    // we can either call the helper API to delete, or ignore for now.
    // Let's implement calling the helper delete endpoint:
    const helperUrl = this.env.TELEGRAM_HELPER_URL || 'http://localhost:8899';
    const res = await fetch(`${helperUrl}/delete/${this.channelId}/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      }
    });
    if (!res.ok) {
      console.error(`Failed to delete file from Telegram helper: ${await res.text()}`);
    }
  }
}
