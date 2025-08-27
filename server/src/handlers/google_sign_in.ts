import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleSignInInput, type AuthResponse } from '../schema';
import { eq, or } from 'drizzle-orm';

export const googleSignIn = async (input: GoogleSignInInput): Promise<AuthResponse> => {
  try {
    // First, try to find existing user by google_id or email
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.google_id, input.google_id),
          eq(usersTable.email, input.email)
        )
      )
      .execute();

    let user;
    let isNewUser = false;

    if (existingUsers.length > 0) {
      // User exists - update their information
      const existingUser = existingUsers[0];
      
      const updatedUsers = await db.update(usersTable)
        .set({
          google_id: input.google_id,
          first_name: input.first_name,
          last_name: input.last_name,
          is_email_verified: input.email_verified ?? true,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, existingUser.id))
        .returning()
        .execute();

      user = updatedUsers[0];
    } else {
      // New user - create account
      const newUsers = await db.insert(usersTable)
        .values({
          email: input.email,
          first_name: input.first_name,
          last_name: input.last_name,
          google_id: input.google_id,
          password_hash: null, // Google users don't have passwords
          phone_number: null,
          is_email_verified: input.email_verified ?? true
        })
        .returning()
        .execute();

      user = newUsers[0];
      isNewUser = true;
    }

    // Generate a mock JWT token (in real implementation, use proper JWT library)
    const token = `jwt_${user.id}_${Date.now()}`;

    // Return user data without password_hash
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      is_new_user: isNewUser
    };
  } catch (error) {
    console.error('Google sign-in failed:', error);
    throw error;
  }
};