/**
 * 🛡️ Auth Middleware
 * 
 * Protects routes requiring authentication.
 * Supports both Hasura Auth (JWT) and Nostr (NIP-07) authentication.
 */

export default defineNuxtRouteMiddleware((to, _from) => {
  // Skip auth pages
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/callback',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ];

  if (publicPaths.some(path => to.path.startsWith(path))) {
    return;
  }

  // Check authentication
  const hasuraToken = useCookie('hasura-auth-token');
  const nostrPubkey = useCookie('nostr-pubkey');

  const isAuthenticated = !!hasuraToken.value || !!nostrPubkey.value;

  if (!isAuthenticated && to.meta.auth !== false) {
    // Redirect to sign in with return URL
    return navigateTo({
      path: '/auth/signin',
      query: { redirect: to.fullPath },
    });
  }
})
