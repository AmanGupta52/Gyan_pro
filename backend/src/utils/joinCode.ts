import crypto from 'node:crypto';

// No 0/O/1/I so codes are easy to read out loud in a classroom
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateJoinCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[(bytes[i] as number) % CODE_ALPHABET.length];
  }
  return code;
}
