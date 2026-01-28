import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EmailProvider, OAuthToken } from '@mcp-mail/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tokens.db');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  return crypto.scryptSync(key, 'salt', 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 'hex');
  const encrypted = encryptedData.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export class TokenStorage {
  private db: Database.Database;

  constructor() {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        email TEXT NOT NULL,
        encrypted_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(provider, email)
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  saveToken(provider: EmailProvider, email: string, token: OAuthToken): void {
    const encrypted = encrypt(JSON.stringify(token));
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO tokens (provider, email, encrypted_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider, email) DO UPDATE SET
        encrypted_token = excluded.encrypted_token,
        updated_at = excluded.updated_at
    `);

    stmt.run(provider, email, encrypted, now, now);
  }

  getToken(provider: EmailProvider, email: string): OAuthToken | null {
    const stmt = this.db.prepare(`
      SELECT encrypted_token FROM tokens
      WHERE provider = ? AND email = ?
    `);

    const row = stmt.get(provider, email) as { encrypted_token: string } | undefined;
    if (!row) return null;

    try {
      const decrypted = decrypt(row.encrypted_token);
      return JSON.parse(decrypted) as OAuthToken;
    } catch {
      return null;
    }
  }

  deleteToken(provider: EmailProvider, email: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM tokens WHERE provider = ? AND email = ?
    `);
    stmt.run(provider, email);
  }

  getAllAccounts(): Array<{ provider: EmailProvider; email: string; expiresAt: number }> {
    const stmt = this.db.prepare(`
      SELECT provider, email, encrypted_token FROM tokens
    `);

    const rows = stmt.all() as Array<{ provider: EmailProvider; email: string; encrypted_token: string }>;

    return rows.map(row => {
      try {
        const token = JSON.parse(decrypt(row.encrypted_token)) as OAuthToken;
        return {
          provider: row.provider,
          email: row.email,
          expiresAt: token.expiresAt,
        };
      } catch {
        return {
          provider: row.provider,
          email: row.email,
          expiresAt: 0,
        };
      }
    });
  }

  saveOAuthState(state: string, provider: EmailProvider): void {
    const stmt = this.db.prepare(`
      INSERT INTO oauth_states (state, provider, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(state, provider, Date.now());
  }

  verifyAndConsumeState(state: string): EmailProvider | null {
    const stmt = this.db.prepare(`
      SELECT provider FROM oauth_states
      WHERE state = ? AND created_at > ?
    `);

    const minTime = Date.now() - 10 * 60 * 1000;
    const row = stmt.get(state, minTime) as { provider: EmailProvider } | undefined;

    if (row) {
      this.db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
      return row.provider;
    }

    return null;
  }

  cleanupExpiredStates(): void {
    const minTime = Date.now() - 10 * 60 * 1000;
    this.db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(minTime);
  }

  close(): void {
    this.db.close();
  }
}

let tokenStorageInstance: TokenStorage | null = null;

export function getTokenStorage(): TokenStorage {
  if (!tokenStorageInstance) {
    tokenStorageInstance = new TokenStorage();
  }
  return tokenStorageInstance;
}
