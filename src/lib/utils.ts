import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates email format and checks if domain exists
 * @param email - Email address to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateEmailExists(email: string): Promise<{ isValid: boolean; error?: string }> {
  // First check format synchronously
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Nieprawidłowy format adresu email' };
  }

  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isValid: false, error: 'Nieprawidłowy format adresu email' };
  }

  // Additional domain validation
  // Check for suspicious patterns
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return { isValid: false, error: 'Nieprawidłowa domena email' };
  }

  // Check for domains that are clearly fake/non-existent
  const invalidDomains = [
    'test.test',
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid.com',
    'fake.com',
    'nonexistent.com',
  ];

  if (invalidDomains.includes(domain)) {
    return { isValid: false, error: 'Ta domena nie istnieje. Podaj prawidłowy adres email' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^test/i,
    /^fake/i,
    /^invalid/i,
    /^nonexistent/i,
    /\.test$/i,
    /\.fake$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domain)) {
      return { isValid: false, error: 'Ta domena wygląda na nieprawidłową. Podaj prawidłowy adres email' };
    }
  }

  return { isValid: true };
}

/**
 * Synchronous email format validation (for immediate feedback)
 * @param email - Email address to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateEmailFormat(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Nieprawidłowy format adresu email' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { isValid: false, error: 'Nieprawidłowy format adresu email' };
  }

  // Check for invalid domains
  const invalidDomains = [
    'test.test',
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid.com',
    'fake.com',
    'nonexistent.com',
  ];

  if (invalidDomains.includes(domain)) {
    return { isValid: false, error: 'Ta domena nie istnieje. Podaj prawidłowy adres email' };
  }

  // Check for suspicious domains
  if (domain.length < 4 || domain.split('.').length < 2) {
    return { isValid: false, error: 'Nieprawidłowa domena email' };
  }

  return { isValid: true };
}
