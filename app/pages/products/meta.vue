<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t("products.metadata.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ $t("products.metadata.description") }}
        </p>
      </div>

      <!-- Branch Filter -->
      <div class="flex items-center space-x-4">
        <USelect
          v-model="selectedBranch"
          :options="branchOptions"
          option-attribute="name"
          value-attribute="id"
          :placeholder="$t('common.selectBranch')"
          class="w-48"
        />
      </div>
    </div>

    <!-- Main Content -->
    <UCard>
      <UTabs v-model="activeTab" :items="tabItems" class="w-full">
        <!-- Categories Tab -->
        <template #categories>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                {{ $t("products.categories.title") }}
              </h2>
              <UButton
                @click="openModal('category')"
                icon="i-heroicons-plus"
                :label="$t('common.add')"
                color="primary"
              />
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
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
                      {{ $t("common.branch") }}
                    </th>
                    <th
                      class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.actions") }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="category in filteredCategories"
                    :key="category.id"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="py-3 px-4 text-gray-900 dark:text-white">
                      {{ category.name }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ category.description || "-" }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ getBranchName(category.branchId) }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <UButton
                          @click="editItem('category', category)"
                          icon="i-heroicons-pencil-square"
                          size="sm"
                          color="gray"
                          variant="ghost"
                        />
                        <UButton
                          @click="deleteItem('category', category.id)"
                          icon="i-heroicons-trash"
                          size="sm"
                          color="red"
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Units Tab -->
        <template #units>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                {{ $t("products.units.title") }}
              </h2>
              <UButton
                @click="openModal('unit')"
                icon="i-heroicons-plus"
                :label="$t('common.add')"
                color="primary"
              />
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
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
                      {{ $t("products.units.symbol") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.description") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.branch") }}
                    </th>
                    <th
                      class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.actions") }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="unit in filteredUnits"
                    :key="unit.id"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="py-3 px-4 text-gray-900 dark:text-white">
                      {{ unit.name }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      <span
                        class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm"
                      >
                        {{ unit.symbol || "-" }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ unit.description || "-" }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ getBranchName(unit.branchId) }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <UButton
                          @click="editItem('unit', unit)"
                          icon="i-heroicons-pencil-square"
                          size="sm"
                          color="gray"
                          variant="ghost"
                        />
                        <UButton
                          @click="deleteItem('unit', unit.id)"
                          icon="i-heroicons-trash"
                          size="sm"
                          color="red"
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Payment Terms Tab -->
        <template #terms>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                {{ $t("products.terms.title") }}
              </h2>
              <UButton
                @click="openModal('term')"
                icon="i-heroicons-plus"
                :label="$t('common.add')"
                color="primary"
              />
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
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
                      {{ $t("products.terms.days") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.description") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.branch") }}
                    </th>
                    <th
                      class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
                    >
                      {{ $t("common.actions") }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="term in filteredTerms"
                    :key="term.id"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="py-3 px-4 text-gray-900 dark:text-white">
                      {{ term.name }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      <span
                        class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                      >
                        {{ term.days || 0 }} {{ $t("products.terms.daysUnit") }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ term.description || "-" }}
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {{ getBranchName(term.branchId) }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <UButton
                          @click="editItem('term', term)"
                          icon="i-heroicons-pencil-square"
                          size="sm"
                          color="gray"
                          variant="ghost"
                        />
                        <UButton
                          @click="deleteItem('term', term.id)"
                          icon="i-heroicons-trash"
                          size="sm"
                          color="red"
                          variant="ghost"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </UTabs>
    </UCard>

    <!-- Modal for Add/Edit -->
    <UModal v-model="isModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ isEditMode ? $t("common.edit") : $t("common.add") }}
            {{ getModalTitle() }}
          </h3>
        </template>

        <UForm
          ref="form"
          :state="formState"
          :schema="getFormSchema()"
          @submit="handleSubmit"
          class="space-y-4"
        >
          <UFormField name="name" :label="$t('common.name')" required>
            <UInput v-model="formState.name" />
          </UFormField>

          <UFormField name="description" :label="$t('common.description')">
            <UTextarea v-model="formState.description" />
          </UFormField>

          <UFormField
            v-if="currentMetaType === 'unit'"
            name="symbol"
            :label="$t('products.units.symbol')"
          >
            <UInput v-model="formState.symbol" placeholder="kg, m, pcs" />
          </UFormField>

          <UFormField
            v-if="currentMetaType === 'term'"
            name="days"
            :label="$t('products.terms.days')"
          >
            <UInput v-model.number="formState.days" type="number" min="0" />
          </UFormField>

          <UFormField name="branchId" :label="$t('common.branch')" required>
            <USelect
              v-model="formState.branchId"
              :options="branchOptions"
              option-attribute="name"
              value-attribute="id"
              :placeholder="$t('common.selectBranch')"
            />
          </UFormField>
        </UForm>

        <template #footer>
          <div class="flex justify-end space-x-3">
            <UButton
              @click="isModalOpen = false"
              color="gray"
              variant="ghost"
              :label="$t('common.cancel')"
            />
            <UButton
              @click="handleSubmit"
              color="primary"
              :loading="isLoading"
              :label="isEditMode ? $t('common.update') : $t('common.create')"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

// Types
interface MetaItem {
  id: string;
  name: string;
  description?: string;
  symbol?: string;
  days?: number;
  branchId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Branch {
  id: string;
  name: string;
}

type MetaType = "category" | "unit" | "term";

// Page meta
definePageMeta({
  title: "Product Metadata",
  layout: "admin",
});

const { t } = useI18n();

// Reactive data
const activeTab = ref(0);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const isLoading = ref(false);
const currentMetaType = ref<MetaType>("category");
const selectedBranch = ref<string>("");
const editingItem = ref<MetaItem | null>(null);

// Form state
const formState = ref({
  name: "",
  description: "",
  symbol: "",
  days: 0,
  branchId: "",
});

// Mock data - In real app, this would come from Pinia store or composables
const categories = ref<MetaItem[]>([
  {
    id: "1",
    name: "Electronics",
    description: "Electronic devices and accessories",
    branchId: "branch1",
  },
  {
    id: "2",
    name: "Clothing",
    description: "Apparel and fashion items",
    branchId: "branch2",
  },
]);

const units = ref<MetaItem[]>([
  {
    id: "1",
    name: "Kilogram",
    symbol: "kg",
    description: "Weight measurement unit",
    branchId: "branch1",
  },
  {
    id: "2",
    name: "Pieces",
    symbol: "pcs",
    description: "Count unit",
    branchId: "branch1",
  },
]);

const terms = ref<MetaItem[]>([
  {
    id: "1",
    name: "Net 30",
    days: 30,
    description: "Payment due in 30 days",
    branchId: "branch1",
  },
  {
    id: "2",
    name: "Cash on Delivery",
    days: 0,
    description: "Payment upon delivery",
    branchId: "branch2",
  },
]);

const branches = ref<Branch[]>([
  { id: "branch1", name: "Main Branch" },
  { id: "branch2", name: "Secondary Branch" },
]);

// Computed
const branchOptions = computed(() => [
  { id: "", name: "All Branches" },
  ...branches.value,
]);

const tabItems = computed(() => [
  {
    key: "categories",
    label: t("products.categories.title"),
    icon: "i-heroicons-tag",
  },
  {
    key: "units",
    label: t("products.units.title"),
    icon: "i-heroicons-scale",
  },
  {
    key: "terms",
    label: t("products.terms.title"),
    icon: "i-heroicons-calendar-days",
  },
]);

const filteredCategories = computed(() => {
  if (!selectedBranch.value) return categories.value;
  return categories.value.filter(
    (item) => item.branchId === selectedBranch.value
  );
});

const filteredUnits = computed(() => {
  if (!selectedBranch.value) return units.value;
  return units.value.filter((item) => item.branchId === selectedBranch.value);
});

const filteredTerms = computed(() => {
  if (!selectedBranch.value) return terms.value;
  return terms.value.filter((item) => item.branchId === selectedBranch.value);
});

// Methods
const getBranchName = (branchId: string): string => {
  const branch = branches.value.find((b) => b.id === branchId);
  return branch?.name || "Unknown Branch";
};

const getModalTitle = (): string => {
  const titles = {
    category: t("products.categories.single"),
    unit: t("products.units.single"),
    term: t("products.terms.single"),
  };
  return titles[currentMetaType.value];
};

const getFormSchema = () => {
  const baseSchema = {
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    branchId: z.string().min(1, t("validation.required")),
  };

  if (currentMetaType.value === "unit") {
    return z.object({
      ...baseSchema,
      symbol: z.string().optional(),
    });
  }

  if (currentMetaType.value === "term") {
    return z.object({
      ...baseSchema,
      days: z.number().min(0).optional(),
    });
  }

  return z.object(baseSchema);
};

const openModal = (type: MetaType) => {
  currentMetaType.value = type;
  isEditMode.value = false;
  editingItem.value = null;
  resetForm();
  isModalOpen.value = true;
};

const editItem = (type: MetaType, item: MetaItem) => {
  currentMetaType.value = type;
  isEditMode.value = true;
  editingItem.value = item;

  formState.value = {
    name: item.name,
    description: item.description || "",
    symbol: item.symbol || "",
    days: item.days || 0,
    branchId: item.branchId,
  };

  isModalOpen.value = true;
};

const resetForm = () => {
  formState.value = {
    name: "",
    description: "",
    symbol: "",
    days: 0,
    branchId: "",
  };
};

const handleSubmit = async () => {
  try {
    isLoading.value = true;

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItem: MetaItem = {
      id: isEditMode.value ? editingItem.value!.id : Date.now().toString(),
      name: formState.value.name,
      description: formState.value.description,
      symbol: formState.value.symbol,
      days: formState.value.days,
      branchId: formState.value.branchId,
    };

    if (isEditMode.value) {
      // Update existing item
      const targetArray = getTargetArray();
      const index = targetArray.findIndex(
        (item) => item.id === editingItem.value!.id
      );
      if (index !== -1) {
        targetArray[index] = newItem;
      }
    } else {
      // Add new item
      const targetArray = getTargetArray();
      targetArray.push(newItem);
    }

    isModalOpen.value = false;
    resetForm();

    // Show success toast
    $toast.success(
      isEditMode.value ? t("common.updateSuccess") : t("common.createSuccess")
    );
  } catch (error) {
    console.error("Error saving item:", error);
    $toast.error(t("common.error"));
  } finally {
    isLoading.value = false;
  }
};

const getTargetArray = () => {
  switch (currentMetaType.value) {
    case "category":
      return categories.value;
    case "unit":
      return units.value;
    case "term":
      return terms.value;
    default:
      return categories.value;
  }
};

const deleteItem = async (type: MetaType, id: string) => {
  try {
    // Show confirmation dialog
    const confirmed = await $confirm({
      title: t("common.confirmDelete"),
      description: t("common.confirmDeleteDescription"),
    });

    if (!confirmed) return;

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Remove item from appropriate array
    const targetArray =
      type === "category"
        ? categories.value
        : type === "unit"
        ? units.value
        : terms.value;

    const index = targetArray.findIndex((item) => item.id === id);
    if (index !== -1) {
      targetArray.splice(index, 1);
    }

    $toast.success(t("common.deleteSuccess"));
  } catch (error) {
    console.error("Error deleting item:", error);
    $toast.error(t("common.error"));
  }
};

// Mock toast and confirm functions - replace with actual implementations
const $toast = {
  success: (message: string) => console.log("Success:", message),
  error: (message: string) => console.log("Error:", message),
};

const $confirm = async (options: { title: string; description: string }) => {
  return window.confirm(`${options.title}\n${options.description}`);
};
</script>
