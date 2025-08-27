import { db } from '../db';
import { usersTable, emailVerificationTable } from '../db/schema';
import { type VerifyEmailInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function verifyEmail(input: VerifyEmailInput): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Find the verification record by email and code
    const verificationRecords = await db.select()
      .from(emailVerificationTable)
      .where(
        and(
          eq(emailVerificationTable.email, input.email),
          eq(emailVerificationTable.verification_code, input.verification_code)
        )
      )
      .execute();

    if (verificationRecords.length === 0) {
      return {
        success: false,
        message: 'Invalid verification code. Please check your email and try again.'
      };
    }

    const verificationRecord = verificationRecords[0];

    // 2. Check if the code is expired
    const now = new Date();
    if (verificationRecord.expires_at < now) {
      // Clean up expired record
      await db.delete(emailVerificationTable)
        .where(eq(emailVerificationTable.id, verificationRecord.id))
        .execute();

      return {
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      };
    }

    // 3. Mark the user's email as verified in the database
    const updateResult = await db.update(usersTable)
      .set({ 
        is_email_verified: true,
        updated_at: now
      })
      .where(eq(usersTable.email, input.email))
      .execute();

    // Check if user was found and updated
    if (updateResult.rowCount === 0) {
      return {
        success: false,
        message: 'User account not found. Please contact support.'
      };
    }

    // 4. Delete the verification record
    await db.delete(emailVerificationTable)
      .where(eq(emailVerificationTable.id, verificationRecord.id))
      .execute();

    // 5. Return success status and message
    return {
      success: true,
      message: 'Email successfully verified!'
    };
  } catch (error) {
    console.error('Email verification failed:', error);
    throw error;
  }
}