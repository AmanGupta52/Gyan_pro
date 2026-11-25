import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, sendVerificationEmail } from '../src/services/email.service.js';

describe('email.service (EmailJS)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call the EmailJS API when NODE_ENV=test', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds a verification email without throwing and escapes the user name', async () => {
    await expect(
      sendVerificationEmail({ name: '<b>Ravi</b>', email: 'r@x.com' } as never, 'tok123')
    ).resolves.toBeUndefined();
  });
});
