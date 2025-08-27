import { db } from '../db';
import { usersTable, emailVerificationTable } from '../db/schema';
import { type RegisterUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<AuthResponse> => {
  try {
    // 1. Check if email is already registered
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email is already registered');
    }

    // 2. Hash the password (simplified - in production use bcrypt)
    const passwordHash = `hashed_${input.password}`;

    // 3. Create new user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        password_hash: passwordHash,
        phone_number: input.phone_number || null,
        is_email_verified: false
      })
      .returning()
      .execute();

    const newUser = result[0];

    // 4. Generate and store email verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await db.insert(emailVerificationTable)
      .values({
        email: input.email,
        verification_code: verificationCode,
        expires_at: expiresAt
      })
      .execute();

    // 5. Generate JWT token (simplified - in production use proper JWT library)
    const token = `jwt_token_${newUser.id}_${Date.now()}`;

    // 6. Return user data (without password hash) and token
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      google_id: newUser.google_id,
      phone_number: newUser.phone_number,
      is_email_verified: newUser.is_email_verified,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };

    return {
      user: userResponse,
      token,
      is_new_user: true
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};