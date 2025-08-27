import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, emailVerificationTable } from '../db/schema';
import { type VerifyEmailInput } from '../schema';
import { verifyEmail } from '../handlers/verify_email';
import { eq } from 'drizzle-orm';

// Test input
const testInput: VerifyEmailInput = {
  email: 'test@example.com',
  verification_code: '123456'
};

describe('verifyEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully verify email with valid code', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .returning()
      .execute();

    // Create verification record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '123456',
        expires_at: expiresAt
      })
      .execute();

    const result = await verifyEmail(testInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Email successfully verified!');

    // Verify user is marked as verified
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    expect(users[0].is_email_verified).toBe(true);
    expect(users[0].updated_at).toBeInstanceOf(Date);

    // Verify verification record is deleted
    const verificationRecords = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, 'test@example.com'))
      .execute();

    expect(verificationRecords).toHaveLength(0);
  });

  it('should fail with invalid verification code', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .execute();

    // Create verification record with different code
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '654321', // Different code
        expires_at: expiresAt
      })
      .execute();

    const result = await verifyEmail(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid verification code. Please check your email and try again.');

    // Verify user is still not verified
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users[0].is_email_verified).toBe(false);
  });

  it('should fail with expired verification code', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .execute();

    // Create expired verification record
    const expiredTime = new Date();
    expiredTime.setHours(expiredTime.getHours() - 1); // Expired 1 hour ago

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '123456',
        expires_at: expiredTime
      })
      .execute();

    const result = await verifyEmail(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Verification code has expired. Please request a new code.');

    // Verify user is still not verified
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users[0].is_email_verified).toBe(false);

    // Verify expired record is cleaned up
    const verificationRecords = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, 'test@example.com'))
      .execute();

    expect(verificationRecords).toHaveLength(0);
  });

  it('should fail when no verification record exists', async () => {
    // Create test user but no verification record
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .execute();

    const result = await verifyEmail(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid verification code. Please check your email and try again.');

    // Verify user is still not verified
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users[0].is_email_verified).toBe(false);
  });

  it('should fail when user does not exist', async () => {
    // Create verification record but no user
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '123456',
        expires_at: expiresAt
      })
      .execute();

    const result = await verifyEmail(testInput);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User account not found. Please contact support.');

    // Verification record should still exist since update failed
    const verificationRecords = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, 'test@example.com'))
      .execute();

    expect(verificationRecords).toHaveLength(1);
  });

  it('should handle email case insensitivity correctly', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .execute();

    // Create verification record with lowercase email
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '123456',
        expires_at: expiresAt
      })
      .execute();

    // Test with uppercase email in input
    const uppercaseInput: VerifyEmailInput = {
      email: 'TEST@EXAMPLE.COM',
      verification_code: '123456'
    };

    const result = await verifyEmail(uppercaseInput);

    // This should fail since we're doing exact string matching
    // In a real application, you might want to normalize emails to lowercase
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid verification code. Please check your email and try again.');
  });

  it('should update user updated_at timestamp', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        is_email_verified: false
      })
      .returning()
      .execute();

    const originalUpdatedAt = userResult[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create verification record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(emailVerificationTable)
      .values({
        email: 'test@example.com',
        verification_code: '123456',
        expires_at: expiresAt
      })
      .execute();

    await verifyEmail(testInput);

    // Check that updated_at was changed
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userResult[0].id))
      .execute();

    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUsers[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});