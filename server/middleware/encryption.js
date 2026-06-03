import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-secret-change-me';
  // Derive a 32-byte key from the raw secret
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext
 * @returns {{iv: string, encrypted: string, tag: string}} - base64-encoded components
 */
export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    encrypted,
    tag: tag.toString('base64')
  };
}

/**
 * Decrypt a previously encrypted object.
 * @param {{iv: string, encrypted: string, tag: string}} encryptedObj
 * @returns {string} plaintext
 */
export function decrypt(encryptedObj) {
  const key = getKey();
  const iv = Buffer.from(encryptedObj.iv, 'base64');
  const tag = Buffer.from(encryptedObj.tag, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedObj.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
