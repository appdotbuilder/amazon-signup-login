import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleSignInInput } from '../schema';
import { googleSignIn } from '../handlers/google_sign_in';
import { eq } from 'drizzle-orm';

// Test input for Google sign-in
const testGoogleInput: GoogleSignInInput = {
  google_id: 'google_123456789',
  email: 'john.doe@gmail.com',
  first_name: 'John',
  last_name: 'Doe',
  email_verified: true
};

describe('googleSignIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new user when Google user does not exist', async () => {
    const result = await googleSignIn(testGoogleInput);

    // Verify response structure
    expect(result.user.email).toEqual('john.doe@gmail.com');
    expect(result.user.first_name).toEqual('John');
    expect(result.user.last_name).toEqual('Doe');
    expect(result.user.google_id).toEqual('google_123456789');
    expect(result.user.is_email_verified).toEqual(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(result.is_new_user).toEqual(true);

    // Verify password_hash is not returned
    expect('password_hash' in result.user).toBe(false);
  });

  it('should save new Google user to database correctly', async () => {
    const result = await googleSignIn(testGoogleInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    expect(user.email).toEqual('john.doe@gmail.com');
    expect(user.google_id).toEqual('google_123456789');
    expect(user.password_hash).toBeNull(); // Google users have no password
    expect(user.is_email_verified).toEqual(true);
    expect(user.phone_number).toBeNull();
  });

  it('should update existing user when found by google_id', async () => {
    // Create existing user with same google_id but different info
    const existingUser = await db.insert(usersTable)
      .values({
        email: 'old.email@example.com',
        first_name: 'OldFirst',
        last_name: 'OldLast',
        google_id: 'google_123456789',
        password_hash: null,
        is_email_verified: false
      })
      .returning()
      .execute();

    const result = await googleSignIn(testGoogleInput);

    // Should update existing user, not create new one
    expect(result.user.id).toEqual(existingUser[0].id);
    expect(result.user.first_name).toEqual('John'); // Updated
    expect(result.user.last_name).toEqual('Doe'); // Updated
    expect(result.user.is_email_verified).toEqual(true); // Updated
    expect(result.is_new_user).toEqual(false);

    // Verify database was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].first_name).toEqual('John');
    expect(updatedUsers[0].last_name).toEqual('Doe');
    expect(updatedUsers[0].is_email_verified).toEqual(true);
  });

  it('should update existing user when found by email', async () => {
    // Create existing user with same email but no google_id
    const existingUser = await db.insert(usersTable)
      .values({
        email: 'john.doe@gmail.com',
        first_name: 'OldFirst',
        last_name: 'OldLast',
        google_id: null,
        password_hash: 'some_hash',
        is_email_verified: false
      })
      .returning()
      .execute();

    const result = await googleSignIn(testGoogleInput);

    // Should update existing user and add Google info
    expect(result.user.id).toEqual(existingUser[0].id);
    expect(result.user.google_id).toEqual('google_123456789'); // Added
    expect(result.user.first_name).toEqual('John'); // Updated
    expect(result.user.is_email_verified).toEqual(true); // Updated
    expect(result.is_new_user).toEqual(false);

    // Verify database was updated with Google info
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].google_id).toEqual('google_123456789');
    expect(updatedUsers[0].first_name).toEqual('John');
  });

  it('should handle email_verified defaulting to true', async () => {
    // Create input without email_verified to test default behavior
    const rawInput = {
      google_id: 'google_987654321',
      email: 'jane.smith@gmail.com',
      first_name: 'Jane',
      last_name: 'Smith'
      // email_verified is omitted to test default value
    };

    // The handler should handle undefined email_verified by defaulting to true
    const result = await googleSignIn(rawInput as GoogleSignInInput);

    expect(result.user.is_email_verified).toEqual(true);
    expect(result.is_new_user).toEqual(true);
  });

  it('should respect explicitly set email_verified false', async () => {
    const inputWithFalseEmailVerified: GoogleSignInInput = {
      google_id: 'google_unverified',
      email: 'unverified@gmail.com',
      first_name: 'Unverified',
      last_name: 'User',
      email_verified: false
    };

    const result = await googleSignIn(inputWithFalseEmailVerified);

    expect(result.user.is_email_verified).toEqual(false);
    expect(result.is_new_user).toEqual(true);
  });

  it('should generate unique tokens for different sign-ins', async () => {
    const result1 = await googleSignIn(testGoogleInput);
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await googleSignIn({
      ...testGoogleInput,
      google_id: 'google_different_id'
    });

    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token).not.toEqual(result2.token);
  });

  it('should handle multiple users with different Google IDs', async () => {
    // Create first user
    const result1 = await googleSignIn(testGoogleInput);

    // Create second user with different Google ID and email
    const secondInput: GoogleSignInInput = {
      google_id: 'google_different_id',
      email: 'different@gmail.com',
      first_name: 'Jane',
      last_name: 'Smith',
      email_verified: false
    };

    const result2 = await googleSignIn(secondInput);

    // Both should be new users with different IDs
    expect(result1.is_new_user).toEqual(true);
    expect(result2.is_new_user).toEqual(true);
    expect(result1.user.id).not.toEqual(result2.user.id);

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
  });
});