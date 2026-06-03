import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption.js';

describe('Encryption Middleware', () => {
  it('encrypts and decrypts back to original value', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encrypt(plaintext);

    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('encrypted');
    expect(encrypted).toHaveProperty('tag');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts JSON objects as strings', () => {
    const obj = { token: 'abc123', domain: 'myshop' };
    const plaintext = JSON.stringify(obj);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(JSON.parse(decrypted)).toEqual(obj);
  });

  it('different plaintexts produce different ciphertexts', () => {
    const enc1 = encrypt('secret-one');
    const enc2 = encrypt('secret-two');

    // Encrypted content should differ
    expect(enc1.encrypted).not.toBe(enc2.encrypted);
  });

  it('same plaintext produces different ciphertexts (random IV)', () => {
    const enc1 = encrypt('same-value');
    const enc2 = encrypt('same-value');

    // IVs should differ since they are randomly generated
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it('decrypting with tampered data throws an error', () => {
    const encrypted = encrypt('sensitive-data');
    // Tamper with the encrypted content
    const tampered = { ...encrypted, encrypted: 'dGFtcGVyZWQ=' };

    expect(() => decrypt(tampered)).toThrow();
  });

  it('decrypting with wrong tag throws an error', () => {
    const encrypted = encrypt('sensitive-data');
    // Replace tag with a different base64 value (16 bytes)
    const wrongTag = { ...encrypted, tag: Buffer.from('0'.repeat(16)).toString('base64') };

    expect(() => decrypt(wrongTag)).toThrow();
  });
});
