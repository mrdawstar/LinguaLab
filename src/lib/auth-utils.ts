/**
 * Get the email confirmation redirect URL
 * Uses VITE_FRONTEND_URL environment variable if set, otherwise falls back to window.location.origin
 * 
 * This URL must be added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
 */
export function getEmailRedirectUrl(): string {
  // Use environment variable if set (for production/staging)
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  
  if (frontendUrl) {
    // Ensure URL ends with /
    return frontendUrl.endsWith('/') ? frontendUrl : `${frontendUrl}/`;
  }
  
  // Fallback to current origin (for development)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }
  
  // Server-side fallback (shouldn't happen in client code)
  return '/';
}
