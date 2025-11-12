

import { z } from 'zod';

// ============================================
// Authentication Validation Schemas
// ============================================

export const registerSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(320, 'Email address is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must include uppercase, lowercase letters, and a number'
    ),
  firstName: z
    .string()
    .min(1, 'Please enter your first name')
    .max(100, 'First name is too long')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Please enter your last name')
    .max(100, 'Last name is too long')
    .optional(),
  tenantName: z
    .string()
    .min(2, 'Team name must be at least 2 characters long')
    .max(100, 'Team name is too long'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Please enter your password'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// Type Exports
// ============================================
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
