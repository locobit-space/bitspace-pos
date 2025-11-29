<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ $t("settings.title") }}
      </h1>
      <UButton
        color="primary"
        icon="i-heroicons-cog-6-tooth"
        :loading="saving"
        @click="saveAllSettings"
      >
        {{ $t("common.save_all") }}
      </UButton>
    </div>

    <!-- Branch Selector -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          {{ $t("settings.branch_selection") }}
        </h2>
      </template>

      <div class="flex items-center space-x-4">
        <USelect
          v-model="selectedBranch"
          :items="branchOptions"
          label-key="label"
          value-key="value"
          :placeholder="$t('settings.select_branch')"
          class="w-64"
        />
        <UButton
          color="gray"
          variant="outline"
          icon="i-heroicons-plus"
          @click="openBranchModal"
        >
          {{ $t("settings.add_branch") }}
        </UButton>
      </div>
    </UCard>

    <!-- Quick Settings Links -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink to="/settings/lightning" class="block">
        <UCard 
          class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <UIcon name="i-heroicons-bolt" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.lightning.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("settings.lightning.subtitle") }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/settings/users" class="block">
        <UCard 
          class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <UIcon name="i-heroicons-users" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("settings.users.subtitle") }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/settings/general" class="block">
        <UCard 
          class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.general.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("settings.general.subtitle") }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/settings/account" class="block">
        <UCard 
          class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <UIcon name="i-heroicons-user-circle" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.account.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("settings.account.subtitle") }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Main Settings Tabs -->
    <UTabs :items="tabItems" v-model="activeTab" class="w-full">
      <!-- Categories Tab -->
      <template #categories>
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">
                {{ $t("settings.categories.title") }}
              </h3>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="openCategoryModal"
              >
                {{ $t("settings.categories.add") }}
              </UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.name") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.description") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.status") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="category in categories"
                  :key="category.id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="py-3 px-4 text-gray-900 dark:text-white">
                    {{ category.name }}
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {{ category.description }}
                  </td>
                  <td class="py-3 px-4">
                    <UBadge
                      :color="category.active ? 'green' : 'red'"
                      variant="subtle"
                    >
                      {{
                        category.active
                          ? $t("common.active")
                          : $t("common.inactive")
                      }}
                    </UBadge>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex space-x-2">
                      <UButton
                        color="gray"
                        variant="ghost"
                        icon="i-heroicons-pencil"
                        size="sm"
                        @click="editCategory(category)"
                      />
                      <UButton
                        color="red"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="sm"
                        @click="deleteCategory(category.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>

      <!-- Units Tab -->
      <template #units>
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">
                {{ $t("settings.units.title") }}
              </h3>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="openUnitModal"
              >
                {{ $t("settings.units.add") }}
              </UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.name") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("settings.units.symbol") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("settings.units.type") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="unit in units"
                  :key="unit.id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="py-3 px-4 text-gray-900 dark:text-white">
                    {{ unit.name }}
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {{ unit.symbol }}
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {{ unit.type }}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex space-x-2">
                      <UButton
                        color="gray"
                        variant="ghost"
                        icon="i-heroicons-pencil"
                        size="sm"
                        @click="editUnit(unit)"
                      />
                      <UButton
                        color="red"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="sm"
                        @click="deleteUnit(unit.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>

      <!-- Terms Tab -->
      <template #terms>
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">
                {{ $t("settings.terms.title") }}
              </h3>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="openTermModal"
              >
                {{ $t("settings.terms.add") }}
              </UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.name") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("settings.terms.days") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.description") }}
                  </th>
                  <th
                    class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("common.actions") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="term in terms"
                  :key="term.id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="py-3 px-4 text-gray-900 dark:text-white">
                    {{ term.name }}
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {{ term.days }}
                  </td>
                  <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {{ term.description }}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex space-x-2">
                      <UButton
                        color="gray"
                        variant="ghost"
                        icon="i-heroicons-pencil"
                        size="sm"
                        @click="editTerm(term)"
                      />
                      <UButton
                        color="red"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="sm"
                        @click="deleteTerm(term.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>
    </UTabs>

    <!-- Branch Modal -->
    <UModal v-model:open="branchModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{
                editingBranch
                  ? $t("settings.edit_branch")
                  : $t("settings.add_branch")
              }}
            </h3>
          </template>

          <UForm :state="branchForm" @submit="saveBranch">
            <div class="space-y-4">
              <UFormField name="name" :label="$t('common.name')">
                <UInput v-model="branchForm.name" />
              </UFormField>

              <UFormField name="address" :label="$t('settings.address')">
                <UInput v-model="branchForm.address" />
              </UFormField>

              <UFormField name="phone" :label="$t('settings.phone')">
                <UInput v-model="branchForm.phone" />
              </UFormField>

              <UFormField name="email" :label="$t('common.email')">
                <UInput v-model="branchForm.email" type="email" />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end space-x-2">
                <UButton
                  color="gray"
                  variant="outline"
                  @click="branchModalOpen = false"
                >
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton type="submit" :loading="saving">
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Category Modal -->
    <UModal v-model:open="categoryModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{
                editingCategory
                  ? $t("settings.categories.edit")
                  : $t("settings.categories.add")
              }}
            </h3>
          </template>

          <UForm :state="categoryForm" @submit="saveCategory">
            <div class="space-y-4">
              <UFormField name="name" :label="$t('common.name')">
                <UInput v-model="categoryForm.name" />
              </UFormField>

              <UFormField name="description" :label="$t('common.description')">
                <UInput v-model="categoryForm.description" />
              </UFormField>

              <UFormField name="active" :label="$t('common.status')">
                <USelect
                  v-model="categoryForm.active"
                  :options="statusOptions"
                  option-attribute="label"
                  value-attribute="value"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end space-x-2">
                <UButton
                  color="gray"
                  variant="outline"
                  @click="categoryModalOpen = false"
                >
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton type="submit" :loading="saving">
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Unit Modal -->
    <UModal v-model:open="unitModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{
                editingUnit
                  ? $t("settings.units.edit")
                  : $t("settings.units.add")
              }}
            </h3>
          </template>

          <UForm :state="unitForm" @submit="saveUnit">
            <div class="space-y-4">
              <UFormField name="name" :label="$t('common.name')">
                <UInput v-model="unitForm.name" />
              </UFormField>

              <UFormField name="symbol" :label="$t('settings.units.symbol')">
                <UInput v-model="unitForm.symbol" />
              </UFormField>

              <UFormField name="type" :label="$t('settings.units.type')">
                <USelect
                  v-model="unitForm.type"
                  :options="unitTypeOptions"
                  option-attribute="label"
                  value-attribute="value"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end space-x-2">
                <UButton
                  color="gray"
                  variant="outline"
                  @click="unitModalOpen = false"
                >
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton type="submit" :loading="saving">
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Term Modal -->
    <UModal v-model:open="termModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{
                editingTerm
                  ? $t("settings.terms.edit")
                  : $t("settings.terms.add")
              }}
            </h3>
          </template>

          <UForm :state="termForm" @submit="saveTerm">
            <div class="space-y-4">
              <UFormField name="name" :label="$t('common.name')">
                <UInput v-model="termForm.name" />
              </UFormField>

              <UFormField name="days" :label="$t('settings.terms.days')">
                <UInput v-model="termForm.days" type="number" />
              </UFormField>

              <UFormField name="description" :label="$t('common.description')">
                <UInput v-model="termForm.description" />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end space-x-2">
                <UButton
                  color="gray"
                  variant="outline"
                  @click="termModalOpen = false"
                >
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton type="submit" :loading="saving">
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

// Types
interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

interface Unit {
  id: number;
  name: string;
  symbol: string;
  type: string;
}

interface Term {
  id: number;
  name: string;
  days: number;
  description: string;
}

// State
const selectedBranch = ref<number | null>(null);
const activeTab = ref("categories");
const saving = ref(false);

// Modal states
const branchModalOpen = ref(false);
const categoryModalOpen = ref(false);
const unitModalOpen = ref(false);
const termModalOpen = ref(false);

// Editing states
const editingBranch = ref<Branch | null>(null);
const editingCategory = ref<Category | null>(null);
const editingUnit = ref<Unit | null>(null);
const editingTerm = ref<Term | null>(null);

// Form states
const branchForm = ref({
  name: "",
  address: "",
  phone: "",
  email: "",
});

const categoryForm = ref({
  name: "",
  description: "",
  active: true,
});

const unitForm = ref({
  name: "",
  symbol: "",
  type: "",
});

const termForm = ref({
  name: "",
  days: 0,
  description: "",
});

// Mock data (replace with actual API calls)
const branches = ref<Branch[]>([
  {
    id: 1,
    name: "Main Branch",
    address: "123 Main St",
    phone: "555-0001",
    email: "main@company.com",
  },
  {
    id: 2,
    name: "Branch 2",
    address: "456 Oak Ave",
    phone: "555-0002",
    email: "branch2@company.com",
  },
]);

const categories = ref<Category[]>([
  {
    id: 1,
    name: "Electronics",
    description: "Electronic devices and accessories",
    active: true,
  },
  {
    id: 2,
    name: "Clothing",
    description: "Apparel and fashion items",
    active: true,
  },
  {
    id: 3,
    name: "Food & Beverage",
    description: "Food and drink products",
    active: false,
  },
]);

const units = ref<Unit[]>([
  { id: 1, name: "Piece", symbol: "pcs", type: "quantity" },
  { id: 2, name: "Kilogram", symbol: "kg", type: "weight" },
  { id: 3, name: "Meter", symbol: "m", type: "length" },
]);

const terms = ref<Term[]>([
  {
    id: 1,
    name: "Net 30",
    days: 30,
    description: "Payment due within 30 days",
  },
  {
    id: 2,
    name: "Net 15",
    days: 15,
    description: "Payment due within 15 days",
  },
  {
    id: 3,
    name: "Cash on Delivery",
    days: 0,
    description: "Payment on delivery",
  },
]);

// Computed
const branchOptions = computed(() =>
  branches.value.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }))
);

const tabItems = computed(() => [
  {
    slot: "categories",
    label: t("settings.categories.title"),
    icon: "i-heroicons-tag",
  },
  {
    slot: "units",
    label: t("settings.units.title"),
    icon: "i-heroicons-scale",
  },
  {
    slot: "terms",
    label: t("settings.terms.title"),
    icon: "i-heroicons-document-text",
  },
]);

const statusOptions = computed(() => [
  { value: true, label: t("common.active") },
  { value: false, label: t("common.inactive") },
]);

const unitTypeOptions = computed(() => [
  { value: "quantity", label: t("settings.units.types.quantity") },
  { value: "weight", label: t("settings.units.types.weight") },
  { value: "length", label: t("settings.units.types.length") },
  { value: "volume", label: t("settings.units.types.volume") },
]);

// Methods
const saveAllSettings = async () => {
  saving.value = true;
  try {
    // Save all settings logic here
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock delay
    // Show success toast
  } finally {
    saving.value = false;
  }
};

// Branch methods
const openBranchModal = () => {
  editingBranch.value = null;
  branchForm.value = {
    name: "",
    address: "",
    phone: "",
    email: "",
  };
  branchModalOpen.value = true;
};

const saveBranch = async () => {
  saving.value = true;
  try {
    if (editingBranch.value) {
      // Update existing branch
      const index = branches.value.findIndex(
        (b) => b.id === editingBranch.value!.id
      );
      if (index !== -1) {
        branches.value[index] = { ...editingBranch.value, ...branchForm.value };
      }
    } else {
      // Add new branch
      const newBranch: Branch = {
        id: Date.now(),
        ...branchForm.value,
      };
      branches.value.push(newBranch);
    }
    branchModalOpen.value = false;
  } finally {
    saving.value = false;
  }
};

// Category methods
const openCategoryModal = () => {
  editingCategory.value = null;
  categoryForm.value = {
    name: "",
    description: "",
    active: true,
  };
  categoryModalOpen.value = true;
};

const editCategory = (category: Category) => {
  editingCategory.value = category;
  categoryForm.value = { ...category };
  categoryModalOpen.value = true;
};

const saveCategory = async () => {
  saving.value = true;
  try {
    if (editingCategory.value) {
      // Update existing category
      const index = categories.value.findIndex(
        (c) => c.id === editingCategory.value!.id
      );
      if (index !== -1) {
        categories.value[index] = {
          ...editingCategory.value,
          ...categoryForm.value,
        };
      }
    } else {
      // Add new category
      const newCategory: Category = {
        id: Date.now(),
        ...categoryForm.value,
      };
      categories.value.push(newCategory);
    }
    categoryModalOpen.value = false;
  } finally {
    saving.value = false;
  }
};

const deleteCategory = async (id: number) => {
  if (confirm(t("common.confirm_delete"))) {
    categories.value = categories.value.filter((c) => c.id !== id);
  }
};

// Unit methods
const openUnitModal = () => {
  editingUnit.value = null;
  unitForm.value = {
    name: "",
    symbol: "",
    type: "",
  };
  unitModalOpen.value = true;
};

const editUnit = (unit: Unit) => {
  editingUnit.value = unit;
  unitForm.value = { ...unit };
  unitModalOpen.value = true;
};

const saveUnit = async () => {
  saving.value = true;
  try {
    if (editingUnit.value) {
      // Update existing unit
      const index = units.value.findIndex(
        (u) => u.id === editingUnit.value!.id
      );
      if (index !== -1) {
        units.value[index] = { ...editingUnit.value, ...unitForm.value };
      }
    } else {
      // Add new unit
      const newUnit: Unit = {
        id: Date.now(),
        ...unitForm.value,
      };
      units.value.push(newUnit);
    }
    unitModalOpen.value = false;
  } finally {
    saving.value = false;
  }
};

const deleteUnit = async (id: number) => {
  if (confirm(t("common.confirm_delete"))) {
    units.value = units.value.filter((u) => u.id !== id);
  }
};

// Term methods
const openTermModal = () => {
  editingTerm.value = null;
  termForm.value = {
    name: "",
    days: 0,
    description: "",
  };
  termModalOpen.value = true;
};

const editTerm = (term: Term) => {
  editingTerm.value = term;
  termForm.value = { ...term };
  termModalOpen.value = true;
};

const saveTerm = async () => {
  saving.value = true;
  try {
    if (editingTerm.value) {
      // Update existing term
      const index = terms.value.findIndex(
        (t) => t.id === editingTerm.value!.id
      );
      if (index !== -1) {
        terms.value[index] = { ...editingTerm.value, ...termForm.value };
      }
    } else {
      // Add new term
      const newTerm: Term = {
        id: Date.now(),
        ...termForm.value,
      };
      terms.value.push(newTerm);
    }
    termModalOpen.value = false;
  } finally {
    saving.value = false;
  }
};

const deleteTerm = async (id: number) => {
  if (confirm(t("common.confirm_delete"))) {
    terms.value = terms.value.filter((t) => t.id !== id);
  }
};

// Set page title
useHead({
  title: t("settings.title"),
});
</script>
