import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CheckEmailInput } from '../schema';
import { checkEmailAvailability } from '../handlers/check_email_availability';

// Test input
const availableEmailInput: CheckEmailInput = {
  email: 'newuser@example.com'
};

const takenEmailInput: CheckEmailInput = {
  email: 'existing@example.com'
};

describe('checkEmailAvailability', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return available true for new email', async () => {
    const result = await checkEmailAvailability(availableEmailInput);

    expect(result.available).toBe(true);
    expect(result.suggestions).toBeUndefined();
  });

  it('should return available false for existing email', async () => {
    // Create an existing user
    await db.insert(usersTable)
      .values({
        email: 'existing@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password_hash: 'hashedpassword',
        google_id: null,
        phone_number: null,
        is_email_verified: false
      })
      .execute();

    const result = await checkEmailAvailability(takenEmailInput);

    expect(result.available).toBe(false);
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions?.length).toBeGreaterThan(0);
  });

  it('should generate appropriate email suggestions', async () => {
    // Create an existing user with the target email
    await db.insert(usersTable)
      .values({
        email: 'testuser@domain.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        google_id: null,
        phone_number: null,
        is_email_verified: true
      })
      .execute();

    const testInput: CheckEmailInput = {
      email: 'testuser@domain.com'
    };

    const result = await checkEmailAvailability(testInput);

    expect(result.available).toBe(false);
    expect(result.suggestions).toBeDefined();
    
    // Verify suggestions format
    const suggestions = result.suggestions!;
    expect(suggestions.length).toBe(5);
    
    // All suggestions should contain the original domain
    suggestions.forEach(suggestion => {
      expect(suggestion).toMatch(/@domain\.com$/);
      expect(suggestion).toMatch(/^testuser/); // Should start with original local part
    });

    // Check specific suggestion patterns
    const currentYear = new Date().getFullYear().toString();
    expect(suggestions).toContain(`testuser.${currentYear}@domain.com`);
    expect(suggestions).toContain(`testuser_${currentYear}@domain.com`);
    expect(suggestions).toContain('testuser.user@domain.com');
    expect(suggestions).toContain('testuser123@domain.com');
    expect(suggestions).toContain('testuser_official@domain.com');
  });

  it('should handle emails with special characters in local part', async () => {
    // Create user with dot in email
    await db.insert(usersTable)
      .values({
        email: 'user.name@example.org',
        first_name: 'User',
        last_name: 'Name',
        password_hash: 'hashedpassword',
        google_id: null,
        phone_number: null,
        is_email_verified: false
      })
      .execute();

    const testInput: CheckEmailInput = {
      email: 'user.name@example.org'
    };

    const result = await checkEmailAvailability(testInput);

    expect(result.available).toBe(false);
    expect(result.suggestions).toBeDefined();
    
    // Verify all suggestions maintain the domain
    const suggestions = result.suggestions!;
    suggestions.forEach(suggestion => {
      expect(suggestion).toMatch(/@example\.org$/);
      expect(suggestion).toMatch(/^user\.name/); // Should preserve original local part
    });
  });

  it('should handle case sensitivity correctly', async () => {
    // Create user with lowercase email
    await db.insert(usersTable)
      .values({
        email: 'mixedcase@example.com',
        first_name: 'Mixed',
        last_name: 'Case',
        password_hash: 'hashedpassword',
        google_id: null,
        phone_number: null,
        is_email_verified: true
      })
      .execute();

    // Test with different casing
    const upperCaseInput: CheckEmailInput = {
      email: 'MIXEDCASE@example.com'
    };

    const result = await checkEmailAvailability(upperCaseInput);

    // Email should be considered available since database stores lowercase
    // but input is uppercase (assuming case-sensitive comparison)
    expect(result.available).toBe(true);
  });

  it('should return available true for similar but different email', async () => {
    // Create user with similar email
    await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hashedpassword',
        google_id: null,
        phone_number: null,
        is_email_verified: false
      })
      .execute();

    // Test with slightly different email
    const similarEmailInput: CheckEmailInput = {
      email: 'testuser1@example.com'
    };

    const result = await checkEmailAvailability(similarEmailInput);

    expect(result.available).toBe(true);
    expect(result.suggestions).toBeUndefined();
  });

  it('should handle multiple existing users', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          first_name: 'User',
          last_name: 'One',
          password_hash: 'hash1',
          google_id: null,
          phone_number: null,
          is_email_verified: true
        },
        {
          email: 'user2@example.com',
          first_name: 'User',
          last_name: 'Two',
          password_hash: 'hash2',
          google_id: null,
          phone_number: null,
          is_email_verified: false
        }
      ])
      .execute();

    // Test availability for one of the existing emails
    const testInput: CheckEmailInput = {
      email: 'user1@example.com'
    };

    const result = await checkEmailAvailability(testInput);

    expect(result.available).toBe(false);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions?.length).toBe(5);

    // Test availability for non-existing email
    const availableInput: CheckEmailInput = {
      email: 'user3@example.com'
    };

    const availableResult = await checkEmailAvailability(availableInput);
    expect(availableResult.available).toBe(true);
  });
});