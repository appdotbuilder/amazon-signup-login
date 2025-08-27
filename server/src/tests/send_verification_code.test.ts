import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailVerificationTable, usersTable } from '../db/schema';
import { type CheckEmailInput } from '../schema';
import { sendVerificationCode } from '../handlers/send_verification_code';
import { eq, and, gt } from 'drizzle-orm';

// Test input
const testInput: CheckEmailInput = {
  email: 'test@example.com'
};

describe('sendVerificationCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send verification code for new email', async () => {
    const result = await sendVerificationCode(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Verification code sent to your email. Please check your inbox.');

    // Verify code was stored in database
    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    expect(codes).toHaveLength(1);
    expect(codes[0].email).toEqual(testInput.email);
    expect(codes[0].verification_code).toMatch(/^\d{6}$/); // 6-digit code
    expect(codes[0].expires_at).toBeInstanceOf(Date);
    expect(codes[0].expires_at > new Date()).toBe(true); // Should expire in the future
  });

  it('should set expiration time to 15 minutes from now', async () => {
    const beforeTime = new Date();
    await sendVerificationCode(testInput);
    const afterTime = new Date();

    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    const expiresAt = codes[0].expires_at;
    const expectedMinExpiry = new Date(beforeTime.getTime() + 14 * 60 * 1000); // 14 minutes (allowing for test execution time)
    const expectedMaxExpiry = new Date(afterTime.getTime() + 16 * 60 * 1000); // 16 minutes (allowing for test execution time)

    expect(expiresAt >= expectedMinExpiry).toBe(true);
    expect(expiresAt <= expectedMaxExpiry).toBe(true);
  });

  it('should reject verified user', async () => {
    // Create a verified user first
    await db.insert(usersTable)
      .values({
        email: testInput.email,
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashed_password',
        is_email_verified: true
      })
      .execute();

    const result = await sendVerificationCode(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('This email is already registered and verified. Please sign in instead.');

    // Verify no verification code was created
    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    expect(codes).toHaveLength(0);
  });

  it('should allow code for unverified user', async () => {
    // Create an unverified user
    await db.insert(usersTable)
      .values({
        email: testInput.email,
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashed_password',
        is_email_verified: false
      })
      .execute();

    const result = await sendVerificationCode(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Verification code sent to your email. Please check your inbox.');

    // Verify code was created
    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    expect(codes).toHaveLength(1);
  });

  it('should reject if valid code already exists', async () => {
    // Create an existing valid verification code
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await db.insert(emailVerificationTable)
      .values({
        email: testInput.email,
        verification_code: '123456',
        expires_at: futureExpiry
      })
      .execute();

    const result = await sendVerificationCode(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('A verification code was already sent recently. Please check your email or wait before requesting a new code.');

    // Verify only the original code exists
    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    expect(codes).toHaveLength(1);
    expect(codes[0].verification_code).toEqual('123456');
  });

  it('should clean up expired codes and create new one', async () => {
    // Create an expired verification code
    const pastExpiry = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    await db.insert(emailVerificationTable)
      .values({
        email: testInput.email,
        verification_code: '123456',
        expires_at: pastExpiry
      })
      .execute();

    const result = await sendVerificationCode(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Verification code sent to your email. Please check your inbox.');

    // Verify expired code was cleaned up and new code was created
    const codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    expect(codes).toHaveLength(1);
    expect(codes[0].verification_code).not.toEqual('123456'); // Should be a new code
    expect(codes[0].expires_at > new Date()).toBe(true); // Should be valid
  });

  it('should generate different codes for multiple calls', async () => {
    const firstResult = await sendVerificationCode(testInput);
    expect(firstResult.success).toBe(true);

    // Get the first code
    let codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();
    const firstCode = codes[0].verification_code;

    // Clean up the first code to allow a second one
    await db.delete(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();

    const secondResult = await sendVerificationCode(testInput);
    expect(secondResult.success).toBe(true);

    // Get the second code
    codes = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, testInput.email))
      .execute();
    const secondCode = codes[0].verification_code;

    // Codes should be different (very high probability with 6-digit codes)
    expect(firstCode).not.toEqual(secondCode);
    expect(firstCode).toMatch(/^\d{6}$/);
    expect(secondCode).toMatch(/^\d{6}$/);
  });

  it('should handle multiple emails independently', async () => {
    const secondEmail = { email: 'another@example.com' };

    // Send codes to both emails
    const result1 = await sendVerificationCode(testInput);
    const result2 = await sendVerificationCode(secondEmail);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Verify both codes exist
    const allCodes = await db.select()
      .from(emailVerificationTable)
      .execute();

    expect(allCodes).toHaveLength(2);

    const firstEmailCodes = allCodes.filter(code => code.email === testInput.email);
    const secondEmailCodes = allCodes.filter(code => code.email === secondEmail.email);

    expect(firstEmailCodes).toHaveLength(1);
    expect(secondEmailCodes).toHaveLength(1);
  });
});