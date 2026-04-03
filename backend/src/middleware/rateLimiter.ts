import { rateLimit } from 'express-rate-limit';

/**
 * General API rate limiter
 *
 * Applied to authenticated endpoints that perform standard database reads
 * or writes (e.g. fetching a user profile, listing courses).
 *
 * Limit: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

/**
 * Auth rate limiter
 *
 * Applied to unauthenticated endpoints that are common targets for
 * credential stuffing, brute-force, or enumeration attacks
 * (login, register, availability checks).
 *
 * Limit: 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

/**
 * Sensitive operation rate limiter
 *
 * Applied to authenticated endpoints that modify security-critical data
 * such as passwords. Provides a tight limit to prevent abuse even
 * from an authenticated session.
 *
 * Limit: 5 requests per 15 minutes per IP
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});
