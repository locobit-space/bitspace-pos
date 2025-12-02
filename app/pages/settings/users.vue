<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <CommonPageHeader 
      :title="$t('settings.users.title')" 
      :subtitle="$t('settings.users.subtitle')"
    >
      <template #actions>
        <div class="flex items-center gap-4">
          <NuxtLink 
            to="/settings"
            class="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
            {{ $t('common.back') }}
          </NuxtLink>
          
          <UButton
            v-if="canManageUsers"
            color="primary"
            @click="openCreateModal"
          >
            <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
            {{ $t('settings.users.addUser') }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Current User Card -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-user-circle" class="w-6 h-6 text-primary-500" />
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ $t('settings.users.currentUser') }}
            </span>
          </div>
        </template>
        
        <div v-if="currentUser" class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UAvatar
              :src="currentUser.avatar"
              :alt="currentUser.name"
              size="lg"
            />
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ currentUser.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ currentUser.email }}</p>
            </div>
          </div>
          
          <UBadge :color="getRoleColor(currentUser.role)" variant="subtle" size="lg">
            {{ $t(`settings.users.roles.${currentUser.role}`) }}
          </UBadge>
        </div>
      </UCard>

      <!-- Permission Denied Alert -->
      <UAlert
        v-if="!canManageUsers"
        icon="i-heroicons-shield-exclamation"
        color="yellow"
        variant="subtle"
        :title="$t('settings.users.noPermission')"
        :description="$t('settings.users.noPermissionDescription')"
        class="mb-6"
      />

      <!-- Users Table -->
      <UCard v-if="canManageUsers">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t('settings.users.allUsers') }}
            </h3>
            <UBadge color="gray" variant="subtle">
              {{ users.length }} {{ $t('settings.users.users') }}
            </UBadge>
          </div>
        </template>

        <!-- User List -->
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-4">
              <UAvatar
                :src="user.avatar"
                :alt="user.name"
                size="sm"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ user.name }}</p>
                <p v-if="user.email" class="text-sm text-gray-500 dark:text-gray-400">{{ user.email }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <UBadge :color="getRoleColor(user.role)" variant="subtle">
                {{ $t(`settings.users.roles.${user.role}`) }}
              </UBadge>
              
              <UBadge :color="user.isActive ? 'green' : 'red'" variant="subtle">
                {{ user.isActive ? $t('common.active') : $t('common.inactive') }}
              </UBadge>
              
              <UIcon 
                :name="user.pin ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'"
                :class="user.pin ? 'text-green-500' : 'text-gray-400'"
                class="w-5 h-5"
              />
              
              <span class="text-sm text-gray-500 dark:text-gray-400 min-w-[100px]">
                {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : '-' }}
              </span>
              
              <div class="flex items-center gap-2">
                <UButton
                  variant="ghost"
                  size="xs"
                  :disabled="user.id === currentUser?.id"
                  @click="openEditModal(user)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </UButton>
                
                <UButton
                  variant="ghost"
                  size="xs"
                  @click="openPermissionsModal(user)"
                >
                  <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
                </UButton>
                
                <UButton
                  v-if="user.id !== currentUser?.id"
                  variant="ghost"
                  color="red"
                  size="xs"
                  @click="confirmDelete(user)"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Role Descriptions -->
      <UCard class="mt-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('settings.users.roleDescriptions') }}
          </h3>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="role in roleDescriptions" 
            :key="role.id"
            class="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center gap-3 mb-2">
              <UBadge :color="role.color" variant="subtle">
                {{ $t(`settings.users.roles.${role.id}`) }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ $t(`settings.users.roleDesc.${role.id}`) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Create/Edit User Modal -->
    <UModal v-model="showUserModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ editingUser ? $t('settings.users.editUser') : $t('settings.users.addUser') }}
          </h3>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('settings.users.name')" required>
            <UInput
              v-model="userForm.name"
              :placeholder="$t('settings.users.namePlaceholder')"
              icon="i-heroicons-user"
            />
          </UFormField>

          <UFormField :label="$t('settings.users.email')">
            <UInput
              v-model="userForm.email"
              type="email"
              :placeholder="$t('settings.users.emailPlaceholder')"
              icon="i-heroicons-envelope"
            />
          </UFormField>

          <UFormField :label="$t('settings.users.pin')">
            <UInput
              v-model="userForm.pin"
              type="password"
              maxlength="6"
              :placeholder="$t('settings.users.pinPlaceholder')"
              icon="i-heroicons-key"
            />
            <template #hint>
              {{ $t('settings.users.pinHint') }}
            </template>
          </UFormField>

          <UFormField :label="$t('settings.users.role')" required>
            <USelectMenu
              v-model="userForm.role"
              :items="roleOptions"
              label-key="label"
              value-key="value"
            />
          </UFormField>

          <UFormField :label="$t('settings.users.status')">
            <UToggle
              v-model="userForm.isActive"
              :label="userForm.isActive ? $t('common.active') : $t('common.inactive')"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <UButton
              variant="ghost"
              @click="showUserModal = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              :loading="saving"
              color="primary"
              @click="saveUser"
            >
              {{ $t('common.save') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Permissions Modal -->
    <UModal v-model="showPermissionsModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('settings.users.editPermissions') }}: {{ selectedUser?.name }}
          </h3>
        </template>

        <div v-if="selectedUser" class="space-y-6">
          <!-- POS Operations -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ $t('settings.users.permissions.pos') }}
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="permissionsForm.canCreateOrders"
                :label="$t('settings.users.permissions.canCreateOrders')"
              />
              <UCheckbox
                v-model="permissionsForm.canVoidOrders"
                :label="$t('settings.users.permissions.canVoidOrders')"
              />
              <UCheckbox
                v-model="permissionsForm.canApplyDiscounts"
                :label="$t('settings.users.permissions.canApplyDiscounts')"
              />
              <UCheckbox
                v-model="permissionsForm.canProcessRefunds"
                :label="$t('settings.users.permissions.canProcessRefunds')"
              />
            </div>
          </div>

          <!-- Products -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ $t('settings.users.permissions.products') }}
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="permissionsForm.canViewProducts"
                :label="$t('settings.users.permissions.canViewProducts')"
              />
              <UCheckbox
                v-model="permissionsForm.canEditProducts"
                :label="$t('settings.users.permissions.canEditProducts')"
              />
              <UCheckbox
                v-model="permissionsForm.canDeleteProducts"
                :label="$t('settings.users.permissions.canDeleteProducts')"
              />
            </div>
          </div>

          <!-- Reports -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ $t('settings.users.permissions.reports') }}
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="permissionsForm.canViewReports"
                :label="$t('settings.users.permissions.canViewReports')"
              />
              <UCheckbox
                v-model="permissionsForm.canExportReports"
                :label="$t('settings.users.permissions.canExportReports')"
              />
            </div>
          </div>

          <!-- Settings -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ $t('settings.users.permissions.settings') }}
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="permissionsForm.canViewSettings"
                :label="$t('settings.users.permissions.canViewSettings')"
              />
              <UCheckbox
                v-model="permissionsForm.canEditSettings"
                :label="$t('settings.users.permissions.canEditSettings')"
              />
              <UCheckbox
                v-model="permissionsForm.canManageLightning"
                :label="$t('settings.users.permissions.canManageLightning')"
              />
              <UCheckbox
                v-model="permissionsForm.canManageUsers"
                :label="$t('settings.users.permissions.canManageUsers')"
              />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4">
            <UButton
              variant="ghost"
              @click="showPermissionsModal = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              :loading="saving"
              color="primary"
              @click="savePermissions"
            >
              {{ $t('common.save') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500" />
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ $t('settings.users.confirmDelete') }}
            </span>
          </div>
        </template>

        <p class="text-gray-600 dark:text-gray-300">
          {{ $t('settings.users.deleteWarning', { name: userToDelete?.name }) }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-4">
            <UButton
              variant="ghost"
              @click="showDeleteModal = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              :loading="deleting"
              color="red"
              @click="deleteUserConfirmed"
            >
              {{ $t('common.delete') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { StoreUser, UserRole, UserPermissions } from '~/types';
import { DEFAULT_PERMISSIONS } from '~/types';

definePageMeta({
  layout: 'default',
});

const { t } = useI18n();
const toast = useToast();
const usersComposable = useUsers();

// State
const showUserModal = ref(false);
const showPermissionsModal = ref(false);
const showDeleteModal = ref(false);
const saving = ref(false);
const deleting = ref(false);
const editingUser = ref<StoreUser | null>(null);
const selectedUser = ref<StoreUser | null>(null);
const userToDelete = ref<StoreUser | null>(null);

// Computed
const users = computed(() => usersComposable.users.value);
const currentUser = computed(() => usersComposable.currentUser.value);
const canManageUsers = computed(() => usersComposable.hasPermission('canManageUsers'));

// Form
const userForm = reactive({
  name: '',
  email: '',
  pin: '',
  role: 'staff' as UserRole,
  isActive: true,
});

const permissionsForm = reactive<UserPermissions>({
  canCreateOrders: true,
  canVoidOrders: false,
  canApplyDiscounts: false,
  canProcessRefunds: false,
  canViewProducts: true,
  canEditProducts: false,
  canDeleteProducts: false,
  canViewCustomers: false,
  canEditCustomers: false,
  canViewReports: false,
  canExportReports: false,
  canViewSettings: false,
  canEditSettings: false,
  canManageLightning: false,
  canManageUsers: false,
  canViewInventory: true,
  canEditInventory: false,
  canAdjustStock: false,
});

// Role options
const roleOptions = [
  { value: 'owner', label: t('settings.users.roles.owner') },
  { value: 'admin', label: t('settings.users.roles.admin') },
  { value: 'cashier', label: t('settings.users.roles.cashier') },
  { value: 'staff', label: t('settings.users.roles.staff') },
];

// Role descriptions
const roleDescriptions = [
  { id: 'owner', color: 'purple' as const },
  { id: 'admin', color: 'blue' as const },
  { id: 'cashier', color: 'green' as const },
  { id: 'staff', color: 'gray' as const },
];

// Methods
const getRoleColor = (role: UserRole): 'purple' | 'blue' | 'green' | 'gray' => {
  const colors: Record<UserRole, 'purple' | 'blue' | 'green' | 'gray'> = {
    owner: 'purple',
    admin: 'blue',
    cashier: 'green',
    staff: 'gray',
  };
  return colors[role];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const openCreateModal = () => {
  editingUser.value = null;
  userForm.name = '';
  userForm.email = '';
  userForm.pin = '';
  userForm.role = 'staff';
  userForm.isActive = true;
  showUserModal.value = true;
};

const openEditModal = (user: StoreUser) => {
  editingUser.value = user;
  userForm.name = user.name;
  userForm.email = user.email || '';
  userForm.pin = '';
  userForm.role = user.role;
  userForm.isActive = user.isActive;
  showUserModal.value = true;
};

const openPermissionsModal = (user: StoreUser) => {
  selectedUser.value = user;
  Object.assign(permissionsForm, user.permissions);
  showPermissionsModal.value = true;
};

const saveUser = async () => {
  if (!userForm.name.trim()) {
    toast.add({
      title: t('settings.users.nameRequired'),
      color: 'red',
    });
    return;
  }

  saving.value = true;

  try {
    if (editingUser.value) {
      // Update existing user
      const updates: Partial<StoreUser> = {
        name: userForm.name,
        email: userForm.email || undefined,
        role: userForm.role,
        isActive: userForm.isActive,
        permissions: { ...DEFAULT_PERMISSIONS[userForm.role] },
      };
      
      if (userForm.pin) {
        updates.pin = userForm.pin;
      }

      await usersComposable.updateUser(editingUser.value.id, updates);
      toast.add({
        title: t('settings.users.updateSuccess'),
        color: 'green',
      });
    } else {
      // Create new user
      await usersComposable.createUser({
        name: userForm.name,
        email: userForm.email || undefined,
        pin: userForm.pin || undefined,
        role: userForm.role,
      });
      toast.add({
        title: t('settings.users.createSuccess'),
        color: 'green',
      });
    }

    showUserModal.value = false;
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const savePermissions = async () => {
  if (!selectedUser.value) return;

  saving.value = true;

  try {
    await usersComposable.updateUserPermissions(selectedUser.value.id, permissionsForm);
    toast.add({
      title: t('settings.users.permissionsSaved'),
      color: 'green',
    });
    showPermissionsModal.value = false;
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (user: StoreUser) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const deleteUserConfirmed = async () => {
  if (!userToDelete.value) return;

  deleting.value = true;

  try {
    await usersComposable.deleteUser(userToDelete.value.id);
    toast.add({
      title: t('settings.users.deleteSuccess'),
      color: 'green',
    });
    showDeleteModal.value = false;
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    deleting.value = false;
  }
};

// Initialize
onMounted(() => {
  usersComposable.initialize();
});
</script>
