import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  password_hash: z.string().nullable(), // Nullable for Google users who don't have password
  google_id: z.string().nullable(), // Nullable for regular users without Google
  phone_number: z.string().nullable(),
  is_email_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for user registration
export const registerUserInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  phone_number: z.string().optional(),
  marketing_emails: z.boolean().optional() // For marketing consent
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schema for Google sign-in
export const googleSignInInputSchema = z.object({
  google_id: z.string(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  email_verified: z.boolean().optional().default(true) // Google emails are typically verified
});

export type GoogleSignInInput = z.infer<typeof googleSignInInputSchema>;

// Response schema for successful authentication
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }), // Don't return password hash
  token: z.string().optional(), // JWT token for session management
  is_new_user: z.boolean() // Whether this is a newly created account
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Input schema for email verification
export const verifyEmailInputSchema = z.object({
  email: z.string().email(),
  verification_code: z.string().min(6).max(6) // 6-digit verification code
});

export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

// Schema for checking email availability
export const checkEmailInputSchema = z.object({
  email: z.string().email()
});

export type CheckEmailInput = z.infer<typeof checkEmailInputSchema>;

// Response for email availability check
export const emailAvailabilitySchema = z.object({
  available: z.boolean(),
  suggestions: z.array(z.string()).optional() // Email suggestions if unavailable
});

export type EmailAvailability = z.infer<typeof emailAvailabilitySchema>;