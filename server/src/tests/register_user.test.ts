import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, emailVerificationTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  password: 'SecurePass123',
  phone_number: '+1234567890',
  marketing_emails: true
};

// Test input with minimal required fields
const minimalInput: RegisterUserInput = {
  email: 'minimal@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  password: 'ValidPass456'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user with all fields', async () => {
    const result = await registerUser(testInput);

    // Validate response structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.first_name).toEqual('John');
    expect(result.user.last_name).toEqual('Doe');
    expect(result.user.phone_number).toEqual('+1234567890');
    expect(result.user.is_email_verified).toBe(false);
    expect(result.user.google_id).toBeNull();
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.is_new_user).toBe(true);

    // Ensure password hash is not returned
    expect('password_hash' in result.user).toBe(false);
  });

  it('should register a user with minimal required fields', async () => {
    const result = await registerUser(minimalInput);

    expect(result.user.email).toEqual('minimal@example.com');
    expect(result.user.first_name).toEqual('Jane');
    expect(result.user.last_name).toEqual('Smith');
    expect(result.user.phone_number).toBeNull();
    expect(result.user.is_email_verified).toBe(false);
    expect(result.token).toBeDefined();
    expect(result.is_new_user).toBe(true);
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.phone_number).toEqual('+1234567890');
    expect(savedUser.is_email_verified).toBe(false);
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('SecurePass123'); // Password should be hashed
    expect(savedUser.password_hash).toContain('hashed_'); // Our simple hash prefix
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should create email verification record', async () => {
    const result = await registerUser(testInput);

    // Query email verification table
    const verifications = await db.select()
      .from(emailVerificationTable)
      .where(eq(emailVerificationTable.email, result.user.email))
      .execute();

    expect(verifications).toHaveLength(1);
    const verification = verifications[0];
    expect(verification.email).toEqual('test@example.com');
    expect(verification.verification_code).toMatch(/^\d{6}$/); // 6-digit code
    expect(verification.expires_at).toBeInstanceOf(Date);
    expect(verification.expires_at > new Date()).toBe(true); // Should expire in future
    expect(verification.created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email registration', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register second user with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'User'
    };

    await expect(registerUser(duplicateInput))
      .rejects.toThrow(/already registered/i);
  });

  it('should handle case-sensitive email uniqueness', async () => {
    // Register user with lowercase email
    await registerUser(testInput);

    // Attempt to register with uppercase email
    const uppercaseInput: RegisterUserInput = {
      ...testInput,
      email: 'TEST@EXAMPLE.COM',
      first_name: 'Different',
      last_name: 'User'
    };

    // This should succeed since we're not doing case-insensitive comparison
    const result = await registerUser(uppercaseInput);
    expect(result.user.email).toEqual('TEST@EXAMPLE.COM');
  });

  it('should generate unique tokens for different users', async () => {
    const result1 = await registerUser(testInput);
    
    const secondInput: RegisterUserInput = {
      ...testInput,
      email: 'second@example.com'
    };
    const result2 = await registerUser(secondInput);

    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token).not.toEqual(result2.token);
  });

  it('should set correct default values', async () => {
    const result = await registerUser(minimalInput);

    // Check database record for default values
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    const savedUser = users[0];
    expect(savedUser.is_email_verified).toBe(false);
    expect(savedUser.google_id).toBeNull();
    expect(savedUser.phone_number).toBeNull();
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });
});