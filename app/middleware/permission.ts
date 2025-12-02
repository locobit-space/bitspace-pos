/**
 * 🛡️ Permission Middleware
 * 
 * Checks if the current user has permission to access a route.
 * Use definePageMeta({ permission: 'canViewProducts' }) on pages.
 */

import type { UserPermissions } from '~/types';

export default defineNuxtRouteMiddleware((to, _from) => {
  // Get required permission from page meta
  const requiredPermission = to.meta.permission as keyof UserPermissions | undefined;
  
  // If no permission required, allow access
  if (!requiredPermission) {
    return;
  }

  // Check if client-side
  if (!import.meta.client) {
    return;
  }

  // Get users composable
  const usersComposable = useUsers();
  
  // If not logged in as a store user, check if they have the default owner role
  const currentUser = usersComposable.currentUser.value;
  
  if (!currentUser) {
    // Initialize and wait - user might not be loaded yet
    // For now, allow access and let the page handle it
    return;
  }

  // Check permission
  const hasPermission = usersComposable.hasPermission(requiredPermission);

  if (!hasPermission) {
    // Redirect to home or show access denied
    console.warn(`Permission denied: ${requiredPermission} required for ${to.path}`);
    
    // Navigate to home with access denied message
    return navigateTo({
      path: '/',
      query: { 
        accessDenied: 'true',
        requiredPermission 
      },
    });
  }
});
