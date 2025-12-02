// ============================================
// 👤 BITSPACE USERS COMPOSABLE
// User & Role Management with Hybrid Auth
// Supports: Nostr (npub/nsec) + Password + PIN
// ============================================

import type { 
  StoreUser, 
  UserRole, 
  UserPermissions,
  AuthMethod
} from '~/types';
import { DEFAULT_PERMISSIONS } from '~/types';

// Singleton state
const users = ref<StoreUser[]>([]);
const currentUser = ref<StoreUser | null>(null);
const isInitialized = ref(false);

export function useUsers() {
  const STORAGE_KEY = 'bitspace_users';
  const CURRENT_USER_KEY = 'bitspace_current_user';
  const security = useSecurity();
  // Staff authentication composable for hybrid auth
  const staffAuth = useStaffAuth();
  // Note: usePermissionEvents() can be used here for Nostr-based permission grants
  // when publishing permissions to relays for cross-device verification

  // ============================================
  // 🆔 USER MANAGEMENT
  // ============================================

  /**
   * Generate unique user ID
   */
  function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new user with hybrid auth support
   */
  async function createUser(userData: {
    name: string;
    email?: string;
    pin?: string;
    password?: string;
    role: UserRole;
    branchId?: string;
    npub?: string;
    avatar?: string;
    authMethod?: AuthMethod;
    expiresAt?: string;
  }): Promise<StoreUser | null> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return null;
    }

    try {
      // Determine auth method
      const authMethod: AuthMethod = userData.authMethod || 
        (userData.npub ? 'nostr' : userData.password ? 'password' : 'pin');
      
      // Hash credentials based on auth method
      let hashedPin: string | undefined;
      let passwordHash: string | undefined;
      let pubkeyHex: string | undefined;
      
      if (userData.pin) {
        hashedPin = await staffAuth.hashPin(userData.pin);
      }
      
      if (userData.password && authMethod === 'password') {
        passwordHash = await staffAuth.setUserPassword(userData.password);
      }
      
      // Convert npub to hex if provided
      if (userData.npub) {
        const nostrKey = useNostrKey();
        try {
          pubkeyHex = nostrKey.normalizeKey(userData.npub);
        } catch {
          console.error('Invalid npub format');
          return null;
        }
      }
      
      const newUser: StoreUser = {
        id: generateUserId(),
        name: userData.name,
        email: userData.email,
        pin: hashedPin,
        role: userData.role,
        permissions: { ...DEFAULT_PERMISSIONS[userData.role] },
        branchId: userData.branchId,
        avatar: userData.avatar,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Hybrid auth fields
        authMethod,
        npub: userData.npub,
        pubkeyHex,
        passwordHash,
        // Access control
        grantedBy: currentUser.value?.npub,
        grantedAt: new Date().toISOString(),
        expiresAt: userData.expiresAt,
      };

      users.value.push(newUser);
      await saveUsers();
      
      await security.addAuditLog(
        'role_change',
        currentUser.value?.id || 'system',
        `Created user: ${newUser.name} with role: ${newUser.role} (auth: ${authMethod})`,
        currentUser.value?.name
      );

      return newUser;
    } catch (error) {
      console.error('Failed to create user:', error);
      return null;
    }
  }

  /**
   * Update user
   */
  async function updateUser(
    userId: string, 
    updates: Partial<Omit<StoreUser, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      // Allow users to update their own non-role fields
      if (userId !== currentUser.value.id) {
        console.error('Permission denied: Cannot manage users');
        return false;
      }
      // Can't change own role or permissions
      if (updates.role || updates.permissions) {
        console.error('Permission denied: Cannot change own role');
        return false;
      }
    }

    const index = users.value.findIndex(u => u.id === userId);
    if (index === -1) return false;

    const user = users.value[index];
    if (!user) return false;

    // Hash PIN if updating
    if (updates.pin) {
      updates.pin = await staffAuth.hashPin(updates.pin);
    }
    
    // Hash password if updating
    if (updates.passwordHash && !updates.passwordHash.includes(':')) {
      // If it doesn't contain ':', it's a plain password
      updates.passwordHash = await staffAuth.setUserPassword(updates.passwordHash);
    }

    users.value[index] = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as StoreUser;

    await saveUsers();
    
    // Update current user if it's the same
    if (currentUser.value?.id === userId) {
      currentUser.value = users.value[index] ?? null;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser.value));
    }

    await security.addAuditLog(
      'role_change',
      currentUser.value?.id || 'system',
      `Updated user: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Delete user
   */
  async function deleteUser(userId: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return false;
    }

    // Cannot delete self
    if (currentUser.value?.id === userId) {
      console.error('Cannot delete current user');
      return false;
    }

    const user = users.value.find(u => u.id === userId);
    if (!user) return false;

    users.value = users.value.filter(u => u.id !== userId);
    await saveUsers();

    await security.addAuditLog(
      'role_change',
      currentUser.value?.id || 'system',
      `Deleted user: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Get user by ID
   */
  function getUser(userId: string): StoreUser | undefined {
    return users.value.find(u => u.id === userId);
  }

  /**
   * Get users by role
   */
  function getUsersByRole(role: UserRole): StoreUser[] {
    return users.value.filter(u => u.role === role);
  }

  /**
   * Update user permissions
   */
  async function updateUserPermissions(
    userId: string, 
    permissions: Partial<UserPermissions>
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return false;
    }

    const index = users.value.findIndex(u => u.id === userId);
    if (index === -1) return false;

    const user = users.value[index];
    if (!user) return false;

    user.permissions = {
      ...user.permissions,
      ...permissions,
    };
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      'role_change',
      currentUser.value?.id || 'system',
      `Updated permissions for: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Change user role (updates permissions to defaults)
   */
  async function changeUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    return updateUser(userId, {
      role: newRole,
      permissions: { ...DEFAULT_PERMISSIONS[newRole] },
    });
  }

  // ============================================
  // 🔐 AUTHENTICATION (Hybrid: Nostr + Password + PIN)
  // ============================================

  /**
   * Login with PIN (quick access)
   */
  async function loginWithPin(pin: string): Promise<StoreUser | null> {
    const result = await staffAuth.loginWithPin(pin, users.value);
    
    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0; // Reset on success
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
      
      await security.addAuditLog('login', result.user.id, `PIN login`, result.user.name);
      return result.user;
    }
    
    return null;
  }

  /**
   * Login with Nostr (nsec key)
   */
  async function loginWithNostr(nsec: string): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    const result = await staffAuth.loginWithNostr(nsec, users.value);
    
    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0;
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
      
      await security.addAuditLog('login', result.user.id, `Nostr login (${result.user.npub?.slice(0, 12)}...)`, result.user.name);
    }
    
    return result;
  }

  /**
   * Login with password (email/username + password)
   */
  async function loginWithPassword(identifier: string, password: string): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    const result = await staffAuth.loginWithPassword(identifier, password, users.value);
    
    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0;
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
      
      await security.addAuditLog('login', result.user.id, `Password login`, result.user.name);
    } else if (result.user) {
      // Update failed attempts
      const index = users.value.findIndex(u => u.id === result.user!.id);
      if (index !== -1) {
        users.value[index] = result.user;
        await saveUsers();
      }
    }
    
    return result;
  }

  /**
   * Login with user ID (for switching users - requires PIN verification)
   */
  async function loginAsUser(userId: string): Promise<StoreUser | null> {
    const user = users.value.find(u => u.id === userId && u.isActive);
    
    if (user) {
      // Check if user is revoked or expired
      if (user.revokedAt) {
        console.error('User access has been revoked');
        return null;
      }
      if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        console.error('User access has expired');
        return null;
      }
      
      currentUser.value = user;
      user.lastLoginAt = new Date().toISOString();
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      await security.addAuditLog('login', user.id, `User switch`, user.name);
      return user;
    }
    
    return null;
  }

  /**
   * Logout current user
   */
  async function logout(): Promise<void> {
    if (currentUser.value) {
      await security.addAuditLog('logout', currentUser.value.id, 'Logout', currentUser.value.name);
    }
    currentUser.value = null;
    staffAuth.endSession();
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  /**
   * Verify PIN for sensitive actions
   */
  async function verifyPin(pin: string): Promise<boolean> {
    if (!currentUser.value?.pin) return true; // No PIN set
    const hashedPin = await staffAuth.hashPin(pin);
    return currentUser.value.pin === hashedPin;
  }

  // ============================================
  // 🚫 ACCESS REVOCATION
  // ============================================

  /**
   * Revoke user's access (immediate termination)
   */
  async function revokeUserAccess(userId: string, reason?: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return false;
    }

    const user = users.value.find(u => u.id === userId);
    if (!user) return false;

    // Cannot revoke self
    if (currentUser.value?.id === userId) {
      console.error('Cannot revoke own access');
      return false;
    }

    user.revokedAt = new Date().toISOString();
    user.revocationReason = reason || 'Access revoked by administrator';
    user.isActive = false;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      'permission_revoke',
      currentUser.value?.id || 'system',
      `Revoked access for: ${user.name}${reason ? ` - ${reason}` : ''}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Restore user's access
   */
  async function restoreUserAccess(userId: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return false;
    }

    const user = users.value.find(u => u.id === userId);
    if (!user) return false;

    user.revokedAt = undefined;
    user.revocationReason = undefined;
    user.isActive = true;
    user.grantedAt = new Date().toISOString();
    user.grantedBy = currentUser.value?.npub;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      'permission_grant',
      currentUser.value?.id || 'system',
      `Restored access for: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Set access expiry for a user
   */
  async function setUserExpiry(userId: string, expiresAt: string | null): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return false;
    }

    const user = users.value.find(u => u.id === userId);
    if (!user) return false;

    user.expiresAt = expiresAt || undefined;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      'role_change',
      currentUser.value?.id || 'system',
      `Set access expiry for: ${user.name} - ${expiresAt || 'Never'}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Get user by npub
   */
  function getUserByNpub(npub: string): StoreUser | undefined {
    const nostrKey = useNostrKey();
    const pubkeyHex = nostrKey.normalizeKey(npub);
    return users.value.find(u => u.npub === npub || u.pubkeyHex === pubkeyHex);
  }

  // ============================================
  // 🛡️ PERMISSION CHECKS
  // ============================================

  /**
   * Check if current user has permission
   */
  function hasPermission(permission: keyof UserPermissions): boolean {
    if (!currentUser.value) return false;
    return currentUser.value.permissions[permission] === true;
  }

  /**
   * Check if current user is owner
   */
  function isOwner(): boolean {
    return currentUser.value?.role === 'owner';
  }

  /**
   * Check if current user is admin or owner
   */
  function isAdminOrOwner(): boolean {
    return currentUser.value?.role === 'owner' || currentUser.value?.role === 'admin';
  }

  /**
   * Guard for routes/actions requiring permission
   */
  function requirePermission(permission: keyof UserPermissions): boolean {
    if (!hasPermission(permission)) {
      console.warn(`Permission denied: ${permission}`);
      return false;
    }
    return true;
  }

  // ============================================
  // 💾 STORAGE
  // ============================================

  /**
   * Save users to storage
   */
  async function saveUsers(): Promise<void> {
    // Use security composable for encrypted storage if enabled
    await security.encryptAndStore(STORAGE_KEY, users.value);
  }

  /**
   * Load users from storage
   */
  async function loadUsers(): Promise<void> {
    const stored = await security.retrieveAndDecrypt<StoreUser[]>(STORAGE_KEY);
    if (stored) {
      users.value = stored;
    }
  }

  /**
   * Create default owner if no users exist
   */
  async function ensureDefaultOwner(): Promise<void> {
    if (users.value.length === 0) {
      const defaultOwner: StoreUser = {
        id: generateUserId(),
        name: 'Owner',
        role: 'owner',
        permissions: { ...DEFAULT_PERMISSIONS.owner },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Default to PIN auth for initial owner
        authMethod: 'pin',
        grantedAt: new Date().toISOString(),
      };
      users.value.push(defaultOwner);
      currentUser.value = defaultOwner;
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultOwner));
    }
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    await loadUsers();
    await ensureDefaultOwner();

    // Restore current user session
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Verify user still exists and is active
        const user = users.value.find(u => u.id === parsed.id && u.isActive);
        if (user) {
          currentUser.value = user;
        }
      } catch {
        // Invalid stored user
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }

    isInitialized.value = true;
  }

  // Auto-initialize
  if (typeof window !== 'undefined') {
    initialize();
  }

  return {
    // State
    users: computed(() => users.value),
    currentUser: computed(() => currentUser.value),
    isLoggedIn: computed(() => currentUser.value !== null),

    // User management
    createUser,
    updateUser,
    deleteUser,
    getUser,
    getUsersByRole,
    getUserByNpub,
    updateUserPermissions,
    changeUserRole,

    // Authentication (Hybrid: Nostr + Password + PIN)
    loginWithPin,
    loginWithNostr,
    loginWithPassword,
    loginAsUser,
    logout,
    verifyPin,

    // Access control
    revokeUserAccess,
    restoreUserAccess,
    setUserExpiry,

    // Permissions
    hasPermission,
    isOwner,
    isAdminOrOwner,
    requirePermission,

    // Init
    initialize,
  };
}
