// ============================================
// 👤 BITSPACE USERS COMPOSABLE
// User & Role Management
// ============================================

import type { 
  StoreUser, 
  UserRole, 
  UserPermissions
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

  // ============================================
  // 👤 USER MANAGEMENT
  // ============================================

  /**
   * Generate unique user ID
   */
  function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash PIN for storage
   */
  async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create a new user
   */
  async function createUser(userData: {
    name: string;
    email?: string;
    pin?: string;
    role: UserRole;
    branchId?: string;
    nostrPubkey?: string;
    avatar?: string;
  }): Promise<StoreUser | null> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error('Permission denied: Cannot manage users');
      return null;
    }

    try {
      const hashedPin = userData.pin ? await hashPin(userData.pin) : undefined;
      
      const newUser: StoreUser = {
        id: generateUserId(),
        name: userData.name,
        email: userData.email,
        pin: hashedPin,
        role: userData.role,
        permissions: { ...DEFAULT_PERMISSIONS[userData.role] },
        branchId: userData.branchId,
        nostrPubkey: userData.nostrPubkey,
        avatar: userData.avatar,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.value.push(newUser);
      await saveUsers();
      
      await security.addAuditLog(
        'role_change',
        currentUser.value?.id || 'system',
        `Created user: ${newUser.name} with role: ${newUser.role}`,
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
      updates.pin = await hashPin(updates.pin);
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
  // 🔐 AUTHENTICATION
  // ============================================

  /**
   * Login with PIN
   */
  async function loginWithPin(pin: string): Promise<StoreUser | null> {
    const hashedPin = await hashPin(pin);
    const user = users.value.find(u => u.pin === hashedPin && u.isActive);
    
    if (user) {
      currentUser.value = user;
      user.lastLoginAt = new Date().toISOString();
      await saveUsers();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      await security.addAuditLog('login', user.id, `PIN login`, user.name);
      return user;
    }
    
    return null;
  }

  /**
   * Login with user ID (for switching users)
   */
  async function loginAsUser(userId: string): Promise<StoreUser | null> {
    const user = users.value.find(u => u.id === userId && u.isActive);
    
    if (user) {
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
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  /**
   * Verify PIN for sensitive actions
   */
  async function verifyPin(pin: string): Promise<boolean> {
    if (!currentUser.value?.pin) return true; // No PIN set
    const hashedPin = await hashPin(pin);
    return currentUser.value.pin === hashedPin;
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
    updateUserPermissions,
    changeUserRole,

    // Authentication
    loginWithPin,
    loginAsUser,
    logout,
    verifyPin,

    // Permissions
    hasPermission,
    isOwner,
    isAdminOrOwner,
    requirePermission,

    // Init
    initialize,
  };
}
