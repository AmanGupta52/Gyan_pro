import argon2 from 'argon2';

/**
 * Hash a plaintext password using Argon2id (recommended variant).
 * @param plain - The plaintext password to hash
 * @returns The Argon2id hash string
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a plaintext password against an Argon2 hash.
 * @param hash  - The stored hash
 * @param plain - The plaintext password to check
 * @returns true if the password matches
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}
