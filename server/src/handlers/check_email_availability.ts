import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CheckEmailInput, type EmailAvailability } from '../schema';

export const checkEmailAvailability = async (input: CheckEmailInput): Promise<EmailAvailability> => {
  try {
    // Query the database to check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    const emailExists = existingUsers.length > 0;

    if (emailExists) {
      // Generate email suggestions if the original is taken
      const emailParts = input.email.split('@');
      const localPart = emailParts[0];
      const domain = emailParts[1];

      // Generate deterministic suggestions for better user experience
      const currentYear = new Date().getFullYear();
      const suggestions = [
        `${localPart}.${currentYear}@${domain}`,
        `${localPart}_${currentYear}@${domain}`,
        `${localPart}.user@${domain}`,
        `${localPart}123@${domain}`,
        `${localPart}_official@${domain}`
      ];

      return {
        available: false,
        suggestions
      };
    }

    return {
      available: true
    };
  } catch (error) {
    console.error('Email availability check failed:', error);
    throw error;
  }
};