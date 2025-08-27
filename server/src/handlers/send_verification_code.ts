import { db } from '../db';
import { emailVerificationTable, usersTable } from '../db/schema';
import { type CheckEmailInput } from '../schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export async function sendVerificationCode(input: CheckEmailInput): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user already exists and is verified
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0 && existingUsers[0].is_email_verified) {
      return {
        success: false,
        message: 'This email is already registered and verified. Please sign in instead.'
      };
    }

    // Clean up expired verification codes for this email
    const now = new Date();
    await db.delete(emailVerificationTable)
      .where(
        and(
          eq(emailVerificationTable.email, input.email),
          lt(emailVerificationTable.expires_at, now)
        )
      )
      .execute();

    // Check if there's already a valid (non-expired) verification code
    const existingCodes = await db.select()
      .from(emailVerificationTable)
      .where(
        and(
          eq(emailVerificationTable.email, input.email),
          gt(emailVerificationTable.expires_at, now)
        )
      )
      .execute();

    if (existingCodes.length > 0) {
      return {
        success: false,
        message: 'A verification code was already sent recently. Please check your email or wait before requesting a new code.'
      };
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store verification code in database
    await db.insert(emailVerificationTable)
      .values({
        email: input.email,
        verification_code: verificationCode,
        expires_at: expiresAt
      })
      .execute();

    // In a real application, you would send the email here
    // For now, we'll just log it (in production, use a proper email service)
    console.log(`Verification code for ${input.email}: ${verificationCode}`);
    
    // Simulate email sending (in production, replace with actual email service)
    // await emailService.sendVerificationCode(input.email, verificationCode);

    return {
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.'
    };
  } catch (error) {
    console.error('Verification code sending failed:', error);
    throw error;
  }
}