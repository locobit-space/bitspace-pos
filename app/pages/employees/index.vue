<script setup lang="ts">
// 👥 Employee List Page - Enterprise HR Management
import type { Employee, EmployeeStatus, EmploymentType } from "~/types";

useHead(
  {
    title: "Employee"
  }
)

const { t } = useI18n();
const employeesStore = useEmployeesStore();

// Initialize on mount
onMounted(async () => {
  await employeesStore.init();
});

// View mode (grid | table)
const viewMode = ref<"grid" | "table">("grid");

// Modal states
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showEditModal = ref(false);
const showTerminateModal = ref(false);
const showDeleteModal = ref(false);
const selectedEmployee = ref<Employee | null>(null);
const employeeToEdit = ref<Employee | null>(null);

// Status options
const statusOptions = [
  { value: "all", label: t("employees.status.all"), icon: "i-heroicons-users" },
  {
    value: "active",
    label: t("employees.status.active"),
    icon: "i-heroicons-check-circle",
    color: "success",
  },
  {
    value: "inactive",
    label: t("employees.status.inactive"),
    icon: "i-heroicons-pause-circle",
    color: "gray",
  },
  {
    value: "on-leave",
    label: t("employees.status.onLeave"),
    icon: "i-heroicons-calendar",
    color: "warning",
  },
  {
    value: "terminated",
    label: t("employees.status.terminated"),
    icon: "i-heroicons-x-circle",
    color: "error",
  },
];

// Employment type labels
const employmentTypeLabels: Record<EmploymentType, string> = {
  "full-time": t("employees.type.fullTime"),
  "part-time": t("employees.type.partTime"),
  contract: t("employees.type.contract"),
  intern: t("employees.type.intern"),
  freelance: t("employees.type.freelance"),
};

// Status badge color
function getStatusColor(
  status: EmployeeStatus
): "success" | "neutral" | "warning" | "error" {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "neutral";
    case "on-leave":
      return "warning";
    case "terminated":
      return "error";
    default:
      return "neutral";
  }
}

// View employee details
function viewEmployee(employee: Employee) {
  selectedEmployee.value = employee;
  showDetailModal.value = true;
}

// Edit employee
function editEmployee(employee: Employee) {
  employeeToEdit.value = employee;
  showEditModal.value = true;
}

// Duplicate employee
async function handleDuplicate(employee: Employee) {
  await employeesStore.duplicateEmployee(employee.id);
}

// Terminate employee (soft delete)
function confirmTerminate(employee: Employee) {
  selectedEmployee.value = employee;
  showTerminateModal.value = true;
}

async function handleTerminate() {
  if (!selectedEmployee.value) return;
  await employeesStore.deleteEmployee(selectedEmployee.value.id);
  showTerminateModal.value = false;
  selectedEmployee.value = null;
}

// Delete permanently
function confirmDelete(employee: Employee) {
  selectedEmployee.value = employee;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!selectedEmployee.value) return;
  await employeesStore.hardDeleteEmployee(selectedEmployee.value.id);
  showDeleteModal.value = false;
  showDetailModal.value = false;
  selectedEmployee.value = null;
}

// Format currency
function formatCurrency(amount: number, currency: string = "LAK"): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Department options for filter
const departmentOptions = computed(() => [
  { value: "all", label: t("common.all") },
  ...employeesStore.departments.value.map((d) => ({ value: d, label: d })),
]);

// Actions dropdown items
function getActionItems(employee: Employee) {
  return [
    [
      {
        label: t("employees.actions.view"),
        icon: "i-heroicons-eye",
        click: () => viewEmployee(employee),
      },
      {
        label: t("employees.actions.edit"),
        icon: "i-heroicons-pencil-square",
        click: () => editEmployee(employee),
      },
      {
        label: t("employees.actions.duplicate"),
        icon: "i-heroicons-document-duplicate",
        click: () => handleDuplicate(employee),
      },
    ],
    [
      {
        label: t("employees.actions.terminate"),
        icon: "i-heroicons-no-symbol",
        color: "warning" as const,
        click: () => confirmTerminate(employee),
        disabled: employee.status === "terminated",
      },
      {
        label: t("employees.actions.deletePermanently"),
        icon: "i-heroicons-trash",
        color: "error" as const,
        click: () => confirmDelete(employee),
      },
    ],
  ];
}

// Sorting
function handleSort(field: string) {
  employeesStore.setSorting(field);
}

// Get sort icon
function getSortIcon(field: string) {
  if (employeesStore.sortBy.value !== field)
    return "i-heroicons-chevron-up-down";
  return employeesStore.sortOrder.value === "asc"
    ? "i-heroicons-chevron-up"
    : "i-heroicons-chevron-down";
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div
      class="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <!-- Title & Stats -->
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-user-group" class="w-7 h-7 text-primary-500" />
              {{ t("employees.title") }}
            </h1>
            <div class="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-success-500"></span>
                {{ employeesStore.employeeStats.value.active }}
                {{ t("employees.status.active") }}
              </span>
              <span>{{ employeesStore.employeeStats.value.total }}
                {{ t("employees.total") }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="ghost" icon="i-heroicons-document-arrow-down"
              @click="employeesStore.exportToExcel">
              {{ t("employees.actions.export") }}
            </UButton>
            <UButton color="primary" icon="i-heroicons-plus" @click="showCreateModal = true">
              {{ t("employees.addEmployee") }}
            </UButton>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <UIcon name="i-heroicons-users" class="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ employeesStore.employeeStats.value.total }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("employees.stats.totalEmployees") }}
                </p>
              </div>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-success-500" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ employeesStore.employeeStats.value.active }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("employees.stats.activeEmployees") }}
                </p>
              </div>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-warning-500" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ employeesStore.employeeStats.value.onLeave }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("employees.stats.onLeaveEmployees") }}
                </p>
              </div>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-info-100 dark:bg-info-900/30 rounded-lg">
                <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-info-500" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ employeesStore.employeeStats.value.newThisMonth }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("employees.stats.newThisMonth") }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="flex flex-col sm:flex-row gap-3 mt-4">
          <!-- Search -->
          <UInput v-model="employeesStore.searchQuery.value" :placeholder="t('employees.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass" class="flex-1" />

          <!-- Status Filter -->
          <USelect v-model="employeesStore.selectedStatus.value" :items="statusOptions" value-key="value"
            label-key="label" class="w-40" />

          <!-- Department Filter -->
          <USelect v-model="employeesStore.selectedDepartment.value" :items="departmentOptions" value-key="value"
            label-key="label" class="w-40" :placeholder="t('employees.department')" />

          <!-- View Toggle -->
          <div class="flex items-center -space-x-px">
            <UButton :color="viewMode === 'grid' ? 'primary' : 'neutral'"
              :variant="viewMode === 'grid' ? 'solid' : 'ghost'" icon="i-heroicons-squares-2x2"
              class="rounded-r-none focus:z-10" @click="viewMode = 'grid'" />
            <UButton :color="viewMode === 'table' ? 'primary' : 'neutral'"
              :variant="viewMode === 'table' ? 'solid' : 'ghost'" icon="i-heroicons-list-bullet"
              class="rounded-l-none focus:z-10" @click="viewMode = 'table'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <!-- Loading State -->
      <div v-if="employeesStore.isLoading.value" class="flex items-center justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin" />
      </div>

      <!-- Empty State -->
      <div v-else-if="employeesStore.filteredEmployees.value.length === 0" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <UIcon name="i-heroicons-user-group" class="w-10 h-10 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ t("employees.noEmployees") }}
        </h3>
        <p class="text-gray-500 mb-4">
          {{ t("employees.noEmployeesDescription") }}
        </p>
        <UButton color="primary" icon="i-heroicons-plus" @click="showCreateModal = true">
          {{ t("employees.addFirstEmployee") }}
        </UButton>
      </div>

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="employee in employeesStore.filteredEmployees.value" :key="employee.id"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer group">
          <!-- Avatar & Status & Actions -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3" @click="viewEmployee(employee)">
              <UAvatar :src="employee.avatar" :alt="`${employee.firstName} ${employee.lastName}`" size="xl"
                class="ring-2 ring-white dark:ring-gray-800" />
            </div>
            <div class="flex items-center gap-1">
              <UBadge :color="getStatusColor(employee.status)" size="sm">
                {{ t(`employees.status.${employee.status}`) }}
              </UBadge>
              <UDropdownMenu :items="getActionItems(employee)">
                <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity" @click.stop />
              </UDropdownMenu>
            </div>
          </div>

          <!-- Info -->
          <div @click="viewEmployee(employee)">
            <h3 class="font-semibold text-gray-900 dark:text-white truncate">
              {{ employee.firstName }} {{ employee.lastName }}
            </h3>
            <p class="text-sm text-gray-500 truncate">
              {{ employee.position || t("employees.noPosition") }}
            </p>
            <p class="text-xs text-gray-400 mt-1">
              {{ employee.employeeCode }}
            </p>

            <!-- Quick Info -->
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ employmentTypeLabels[employee.employmentType] }}
              </UBadge>
              <span class="text-xs text-gray-500">{{
                employee.department
              }}</span>
            </div>

            <!-- Contact -->
            <div class="flex items-center gap-3 mt-3 text-sm text-gray-500">
              <span v-if="employee.phone" class="flex items-center gap-1">
                <UIcon name="i-heroicons-phone" class="w-3 h-3" />
                {{ employee.phone }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-else
        class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                @click="handleSort('firstName')">
                <div class="flex items-center gap-1">
                  {{ t("employees.employee") }}
                  <UIcon :name="getSortIcon('firstName')" class="w-4 h-4" />
                </div>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                @click="handleSort('position')">
                <div class="flex items-center gap-1">
                  {{ t("employees.position") }}
                  <UIcon :name="getSortIcon('position')" class="w-4 h-4" />
                </div>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                @click="handleSort('department')">
                <div class="flex items-center gap-1">
                  {{ t("employees.department") }}
                  <UIcon :name="getSortIcon('department')" class="w-4 h-4" />
                </div>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                @click="handleSort('status')">
                <div class="flex items-center gap-1">
                  {{ t("employees.status.label") }}
                  <UIcon :name="getSortIcon('status')" class="w-4 h-4" />
                </div>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                @click="handleSort('baseSalary')">
                <div class="flex items-center gap-1">
                  {{ t("employees.salary") }}
                  <UIcon :name="getSortIcon('baseSalary')" class="w-4 h-4" />
                </div>
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t("common.actions") }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="employee in employeesStore.filteredEmployees.value" :key="employee.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" @click="viewEmployee(employee)">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <UAvatar :src="employee.avatar" :alt="`${employee.firstName} ${employee.lastName}`" size="sm" />
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ employee.firstName }} {{ employee.lastName }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ employee.employeeCode }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                {{ employee.position || "-" }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                {{ employee.department || "-" }}
              </td>
              <td class="px-4 py-3">
                <UBadge :color="getStatusColor(employee.status)" size="sm">
                  {{ t(`employees.status.${employee.status}`) }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                {{ formatCurrency(employee.baseSalary, employee.currency) }}
                <span class="text-xs text-gray-400">/{{ t(`employees.salaryType.${employee.salaryType}`) }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <UDropdownMenu :items="getActionItems(employee)">
                  <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="sm" @click.stop />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Employee Modal -->
    <UModal v-model:open="showCreateModal" :ui="{
      content: 'max-w-2xl ',
    }">
      <template #content>
        <EmployeeForm @close="showCreateModal = false" @saved="showCreateModal = false" />
      </template>
    </UModal>

    <!-- Edit Employee Modal -->
    <UModal v-model:open="showEditModal" :ui="{
      content: 'max-w-2xl ',
    }" title="Edit Employee" description="Edit employee details">
      <template #content>
        <EmployeeForm v-if="employeeToEdit" :employee="employeeToEdit" @close="
          showEditModal = false;
        employeeToEdit = null;
        " @saved="
          showEditModal = false;
        employeeToEdit = null;
        " />
      </template>
    </UModal>

    <!-- Employee Detail Modal -->
    <UModal v-model:open="showDetailModal" fullscreen title="Employee Details" description="View employee details">
      <template #content>
        <EmployeeDetail v-if="selectedEmployee" :employee="selectedEmployee" @close="showDetailModal = false" @edit="
          employeeToEdit = selectedEmployee;
        showEditModal = true;
        showDetailModal = false;
        " />
      </template>
    </UModal>

    <!-- Terminate Confirmation Modal -->
    <UModal v-model:open="showTerminateModal" title="Terminate Employee" description="Terminate employee">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="p-3 bg-warning-100 dark:bg-warning-900/30 rounded-full">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-warning-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("employees.confirm.terminateTitle") }}
              </h3>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{
              t("employees.confirm.terminateMessage", {
                name: `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`,
              })
            }}
          </p>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="showTerminateModal = false">
              {{ t("employees.confirm.cancel") }}
            </UButton>
            <UButton color="warning" @click="handleTerminate">
              {{ t("employees.confirm.confirm") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Employee" description="Delete employee">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="p-3 bg-error-100 dark:bg-error-900/30 rounded-full">
              <UIcon name="i-heroicons-trash" class="w-6 h-6 text-error-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("employees.confirm.deleteTitle") }}
              </h3>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{
              t("employees.confirm.deleteMessage", {
                name: `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`,
              })
            }}
          </p>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="showDeleteModal = false">
              {{ t("employees.confirm.cancel") }}
            </UButton>
            <UButton color="error" @click="handleDelete">
              {{ t("employees.confirm.confirm") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
