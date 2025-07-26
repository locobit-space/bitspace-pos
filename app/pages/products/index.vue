<template>
  <div class="c space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t("products.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ $t("products.subtitle") }}
        </p>
      </div>
      <UButton
        color="primary"
        size="lg"
        :label="$t('common.add')"
        icon="i-heroicons-plus"
        @click="openProductModal()"
      />
    </div>

    <!-- Filters -->
    <div class="flex px-4 flex-wrap gap-4 items-end">
      <!-- Branch Filter -->
      <UFormField :label="$t('common.branch')" class="min-w-[200px]">
        <USelect
          v-model="selectedBranch"
          :options="branchOptions"
          option-attribute="name"
          value-attribute="id"
          :placeholder="$t('common.selectBranch')"
        />
      </UFormField>

      <!-- Category Filter -->
      <UFormField :label="$t('products.category')" class="min-w-[200px]">
        <USelect
          v-model="selectedCategory"
          :options="categoryOptions"
          option-attribute="name"
          value-attribute="id"
          :placeholder="$t('products.selectCategory')"
        />
      </UFormField>

      <!-- Status Filter -->
      <UFormField :label="$t('common.status')" class="min-w-[150px]">
        <USelect
          v-model="selectedStatus"
          :options="statusOptions"
          :placeholder="$t('common.selectStatus')"
        />
      </UFormField>

      <!-- Search -->
      <UFormField :label="$t('common.search')" class="min-w-[250px]">
        <UInput
          v-model="searchQuery"
          :placeholder="$t('products.searchPlaceholder')"
          icon="i-heroicons-magnifying-glass"
        />
      </UFormField>

      <!-- Reset Button -->
      <UButton
        @click="resetFilters"
        color="gray"
        variant="ghost"
        :label="$t('common.reset')"
        icon="i-heroicons-x-mark"
      />
    </div>

    <!-- Products Table -->

    <div class="flex justify-between items-center px-4">
      <h2 class="text-xl font-semibold">
        {{ $t("products.list") }} ({{ filteredProducts.length }})
      </h2>
      <div class="flex gap-2">
        <UButton
          color="gray"
          variant="outline"
          size="sm"
          :label="$t('common.export')"
          icon="i-heroicons-arrow-down-tray"
          @click="exportProducts"
        />
        <UButton
          color="gray"
          variant="outline"
          size="sm"
          :label="$t('common.import')"
          icon="i-heroicons-arrow-up-tray"
          @click="importProducts"
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.image") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.name") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.sku") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.category") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.price") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ $t("products.stock") }}
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
            v-for="product in paginatedProducts"
            :key="product.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="py-3 px-4">
              <div
                class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
              >
                <img
                  v-if="product.image"
                  :src="product.image"
                  :alt="product.name"
                  class="w-full h-full object-cover rounded-lg"
                />
                <Icon
                  v-else
                  name="i-heroicons-photo"
                  class="w-6 h-6 text-gray-400"
                />
              </div>
            </td>
            <td class="py-3 px-4">
              <div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ product.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ product.description }}
                </div>
              </div>
            </td>
            <td class="py-3 px-4">
              <code
                class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              >
                {{ product.sku }}
              </code>
            </td>
            <td class="py-3 px-4">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ getCategoryName(product.categoryId) }}
              </span>
            </td>
            <td class="py-3 px-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(product.price) }}
              </div>
            </td>
            <td class="py-3 px-4">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-sm font-medium',
                    product.stock <= product.minStock
                      ? 'text-red-600 dark:text-red-400'
                      : product.stock <= product.minStock * 2
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400',
                  ]"
                >
                  {{ product.stock }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ getUnitSymbol(product.unitId) }}
                </span>
              </div>
            </td>
            <td class="py-3 px-4">
              <UBadge
                :color="product.status === 'active' ? 'green' : 'gray'"
                :label="$t(`common.${product.status}`)"
              />
            </td>
            <td class="py-3 px-4">
              <div class="flex items-center gap-2">
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-eye"
                  @click="viewProduct(product)"
                />
                <UButton
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-pencil"
                  @click="editProduct(product)"
                />
                <UButton
                  color="red"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-trash"
                  @click="deleteProduct(product)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center px-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t("common.showing") }} {{ startIndex + 1 }} - {{ endIndex }}
        {{ $t("common.of") }} {{ filteredProducts.length }}
      </div>
      <div class="flex gap-2">
        <UButton
          :disabled="currentPage === 1"
          color="gray"
          variant="ghost"
          size="sm"
          icon="i-heroicons-chevron-left"
          @click="currentPage--"
        />
        <span class="px-3 py-1 text-sm">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <UButton
          :disabled="currentPage >= totalPages"
          color="gray"
          variant="ghost"
          size="sm"
          icon="i-heroicons-chevron-right"
          @click="currentPage++"
        />
      </div>
    </div>

    <!-- Product Modal -->
    <UModal v-model:open="showProductModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">
              {{
                selectedProduct?.id
                  ? $t("products.editProduct")
                  : $t("products.addProduct")
              }}
            </h3>
          </template>

          <UForm
            :schema="productSchema"
            :state="productForm"
            class="space-y-4"
            @submit="saveProduct"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Product Name -->
              <UFormField
                :label="$t('products.name')"
                name="name"
                required
                class="md:col-span-2"
              >
                <UInput
                  v-model="productForm.name"
                  :placeholder="$t('products.namePlaceholder')"
                />
              </UFormField>

              <!-- SKU -->
              <UFormField :label="$t('products.sku')" name="sku" required>
                <UInput
                  v-model="productForm.sku"
                  :placeholder="$t('products.skuPlaceholder')"
                />
              </UFormField>

              <!-- Category -->
              <UFormField
                :label="$t('products.category')"
                name="categoryId"
                required
              >
                <USelect
                  v-model="productForm.categoryId"
                  :options="categoryOptions"
                  option-attribute="name"
                  value-attribute="id"
                  :placeholder="$t('products.selectCategory')"
                />
              </UFormField>

              <!-- Price -->
              <UFormField :label="$t('products.price')" name="price" required>
                <UInput
                  v-model="productForm.price"
                  type="number"
                  step="0.01"
                  :placeholder="$t('products.pricePlaceholder')"
                />
              </UFormField>

              <!-- Unit -->
              <UFormField :label="$t('products.unit')" name="unitId" required>
                <USelect
                  v-model="productForm.unitId"
                  :options="unitOptions"
                  option-attribute="name"
                  value-attribute="id"
                  :placeholder="$t('products.selectUnit')"
                />
              </UFormField>

              <!-- Stock -->
              <UFormField :label="$t('products.stock')" name="stock" required>
                <UInput
                  v-model="productForm.stock"
                  type="number"
                  :placeholder="$t('products.stockPlaceholder')"
                />
              </UFormField>

              <!-- Min Stock -->
              <UFormField
                :label="$t('products.minStock')"
                name="minStock"
                required
              >
                <UInput
                  v-model="productForm.minStock"
                  type="number"
                  :placeholder="$t('products.minStockPlaceholder')"
                />
              </UFormField>

              <!-- Branch -->
              <UFormField :label="$t('common.branch')" name="branchId" required>
                <USelect
                  v-model="productForm.branchId"
                  :options="branchOptions"
                  option-attribute="name"
                  value-attribute="id"
                  :placeholder="$t('common.selectBranch')"
                />
              </UFormField>

              <!-- Status -->
              <UFormField :label="$t('common.status')" name="status" required>
                <USelect
                  v-model="productForm.status"
                  :options="statusOptions"
                  :placeholder="$t('common.selectStatus')"
                />
              </UFormField>

              <!-- Description -->
              <UFormField
                :label="$t('products.description')"
                name="description"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="productForm.description"
                  :placeholder="$t('products.descriptionPlaceholder')"
                  rows="3"
                />
              </UFormField>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                color="gray"
                variant="outline"
                :label="$t('common.cancel')"
                @click="showProductModal = false"
              />
              <UButton
                type="submit"
                color="primary"
                :loading="saving"
                :label="
                  selectedProduct?.id
                    ? $t('common.update')
                    : $t('common.create')
                "
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium text-red-600 dark:text-red-400">
              {{ $t("common.confirmDelete") }}
            </h3>
          </template>

          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{
              $t("products.deleteConfirmation", { name: productToDelete?.name })
            }}
          </p>

          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="outline"
              :label="$t('common.cancel')"
              @click="showDeleteModal = false"
            />
            <UButton
              color="red"
              :loading="deleting"
              :label="$t('common.delete')"
              @click="confirmDelete"
            />
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Product View Modal -->
    <UModal v-model:open="showViewModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">
              {{ $t("products.viewProduct") }}
            </h3>
          </template>

          <div v-if="viewingProduct" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("products.name") }}
                </label>
                <p class="text-gray-900 dark:text-white">
                  {{ viewingProduct.name }}
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("products.sku") }}
                </label>
                <p class="text-gray-900 dark:text-white">
                  {{ viewingProduct.sku }}
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("products.category") }}
                </label>
                <p class="text-gray-900 dark:text-white">
                  {{ getCategoryName(viewingProduct.categoryId) }}
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("products.price") }}
                </label>
                <p class="text-gray-900 dark:text-white">
                  {{ formatCurrency(viewingProduct.price) }}
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("products.stock") }}
                </label>
                <p class="text-gray-900 dark:text-white">
                  {{ viewingProduct.stock }}
                  {{ getUnitSymbol(viewingProduct.unitId) }}
                </p>
              </div>
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ $t("common.status") }}
                </label>
                <UBadge
                  :color="viewingProduct.status === 'active' ? 'green' : 'gray'"
                  :label="$t(`common.${viewingProduct.status}`)"
                />
              </div>
            </div>

            <div v-if="viewingProduct.description">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {{ $t("products.description") }}
              </label>
              <p class="text-gray-900 dark:text-white">
                {{ viewingProduct.description }}
              </p>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                variant="outline"
                :label="$t('common.close')"
                @click="showViewModal = false"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  unitId: string;
  price: number;
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image?: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ProductForm {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  unitId: string;
  price: number;
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
}

// Validation Schema
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0, "Stock must be positive"),
  minStock: z.number().min(0, "Min stock must be positive"),
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["active", "inactive"]),
});

// Mock Data
const mockProducts: Product[] = [
  {
    id: "1",
    name: "ເບຍ Beer Lao",
    sku: "BL001",
    description: "ເບຍລາວ ປະເພດຂວດ 640ml",
    categoryId: "1",
    unitId: "1",
    price: 12000,
    stock: 150,
    minStock: 20,
    branchId: "1",
    status: "active",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "ເຂົ້າຈີ່ Grilled Chicken",
    sku: "GC001",
    description: "ເຂົ້າຈີ່ປີ້ງ ພ້ອມເຄື່ອງເຈບ",
    categoryId: "2",
    unitId: "2",
    price: 25000,
    stock: 5,
    minStock: 10,
    branchId: "1",
    status: "active",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "3",
    name: "ເຂົ້າຫມົກ Khao Mok",
    sku: "KM001",
    description: "ເຂົ້າຫມົກປະເພດຊີ້ນຫມູ",
    categoryId: "2",
    unitId: "2",
    price: 20000,
    stock: 30,
    minStock: 5,
    branchId: "2",
    status: "active",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
  },
];

const mockCategories: Category[] = [
  { id: "1", name: "ເຄື່ອງດື່ມ / Beverages" },
  { id: "2", name: "ອາຫານ / Food" },
  { id: "3", name: "ຂອງຫວານ / Desserts" },
];

const mockUnits: Unit[] = [
  { id: "1", name: "ຂວດ / Bottle", symbol: "btl" },
  { id: "2", name: "ຈານ / Plate", symbol: "plt" },
  { id: "3", name: "ໂລ / Kilogram", symbol: "kg" },
];

const mockBranches: Branch[] = [
  { id: "1", name: "ສາຂາໃຈກາງ / Central Branch", code: "CB001" },
  { id: "2", name: "ສາຂາຫ້ວຍໂຮ້ງ / Huay Hong Branch", code: "HH001" },
  { id: "3", name: "ສາຂາດົງໂດກ / Dongdok Branch", code: "DD001" },
];

// Reactive Data
const products = ref<Product[]>(mockProducts);
const categories = ref<Category[]>(mockCategories);
const units = ref<Unit[]>(mockUnits);
const branches = ref<Branch[]>(mockBranches);

// Filters
const selectedBranch = ref<string>("");
const selectedCategory = ref<string>("");
const selectedStatus = ref<string>("");
const searchQuery = ref<string>("");

// Pagination
const currentPage = ref<number>(1);
const itemsPerPage = ref<number>(10);

// Modals
const showProductModal = ref<boolean>(false);
const showDeleteModal = ref<boolean>(false);
const showViewModal = ref<boolean>(false);

// Form Data
const selectedProduct = ref<Product | null>(null);
const productToDelete = ref<Product | null>(null);
const viewingProduct = ref<Product | null>(null);
const saving = ref<boolean>(false);
const deleting = ref<boolean>(false);

// Form State
const productForm = ref<ProductForm>({
  name: "",
  sku: "",
  description: "",
  categoryId: "",
  unitId: "",
  price: 0,
  stock: 0,
  minStock: 0,
  branchId: "",
  status: "active",
});

// Options
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const branchOptions = computed(() => [
  { id: "", name: "All Branches" },
  ...branches.value,
]);

const categoryOptions = computed(() => [
  { id: "", name: "All Categories" },
  ...categories.value,
]);

const unitOptions = computed(() => units.value);

// Computed Properties
const filteredProducts = computed(() => {
  let filtered = products.value;

  if (selectedBranch.value) {
    filtered = filtered.filter((p) => p.branchId === selectedBranch.value);
  }

  if (selectedCategory.value) {
    filtered = filtered.filter((p) => p.categoryId === selectedCategory.value);
  }

  if (selectedStatus.value) {
    filtered = filtered.filter((p) => p.status === selectedStatus.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.ceil(filteredProducts.value.length / itemsPerPage.value)
);

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredProducts.value.slice(start, end);
});

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + itemsPerPage.value, filteredProducts.value.length)
);

// Methods
const resetFilters = () => {
  selectedBranch.value = "";
  selectedCategory.value = "";
  selectedStatus.value = "";
  searchQuery.value = "";
  currentPage.value = 1;
};

const openProductModal = (product?: Product) => {
  if (product) {
    selectedProduct.value = product;
    productForm.value = {
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      categoryId: product.categoryId,
      unitId: product.unitId,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      branchId: product.branchId,
      status: product.status,
    };
  } else {
    selectedProduct.value = null;
    productForm.value = {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      unitId: "",
      price: 0,
      stock: 0,
      minStock: 0,
      branchId: "",
      status: "active",
    };
  }
  showProductModal.value = true;
};

const editProduct = (product: Product) => {
  openProductModal(product);
};

const viewProduct = (product: Product) => {
  viewingProduct.value = product;
  showViewModal.value = true;
};

const deleteProduct = (product: Product) => {
  productToDelete.value = product;
  showDeleteModal.value = true;
};

const saveProduct = async () => {
  try {
    saving.value = true;

    if (selectedProduct.value) {
      // Update existing product
      const index = products.value.findIndex(
        (p) => p.id === selectedProduct.value!.id
      );
      if (index !== -1) {
        products.value[index] = {
          ...products.value[index],
          ...productForm.value,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Create new product
      const newProduct: Product = {
        id: Date.now().toString(),
        ...productForm.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products.value.push(newProduct);
    }

    showProductModal.value = false;
    // Show success notification
  } catch (error) {
    console.error("Error saving product:", error);
    // Show error notification
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async () => {
  try {
    deleting.value = true;

    if (productToDelete.value) {
      const index = products.value.findIndex(
        (p) => p.id === productToDelete.value!.id
      );
      if (index !== -1) {
        products.value.splice(index, 1);
      }
    }

    showDeleteModal.value = false;
    // Show success notification
  } catch (error) {
    console.error("Error deleting product:", error);
    // Show error notification
  } finally {
    deleting.value = false;
  }
};

const getCategoryName = (categoryId: string): string => {
  const category = categories.value.find((c) => c.id === categoryId);
  return category?.name || "Unknown";
};

const getUnitSymbol = (unitId: string): string => {
  const unit = units.value.find((u) => u.id === unitId);
  return unit?.symbol || "unit";
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const exportProducts = () => {
  // Export functionality
  console.log("Exporting products...");
  // Implementation for CSV/Excel export
};

const importProducts = () => {
  // Import functionality
  console.log("Importing products...");
  // Implementation for CSV/Excel import
};

// Watch for filter changes to reset pagination
watch([selectedBranch, selectedCategory, selectedStatus, searchQuery], () => {
  currentPage.value = 1;
});

// Meta and SEO
definePageMeta({
  title: "Product Manager",
  description: "Manage products, inventory, and pricing",
});

useHead({
  title: "Product Manager - POS System",
  meta: [
    {
      name: "description",
      content:
        "Comprehensive product management system for POS/ERP with multi-branch support",
    },
  ],
});

// I18n Keys for reference
/*
en_US.json:
{
  "common": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "cancel": "Cancel",
    "save": "Save",
    "create": "Create",
    "update": "Update",
    "close": "Close",
    "reset": "Reset",
    "search": "Search",
    "export": "Export",
    "import": "Import",
    "actions": "Actions",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "branch": "Branch",
    "selectBranch": "Select Branch",
    "selectStatus": "Select Status",
    "showing": "Showing",
    "of": "of",
    "confirmDelete": "Confirm Delete"
  },
  "products": {
    "title": "Product Manager",
    "subtitle": "Manage your products, inventory, and pricing",
    "list": "Products",
    "addProduct": "Add Product",
    "editProduct": "Edit Product",
    "viewProduct": "View Product",
    "name": "Product Name",
    "sku": "SKU",
    "category": "Category",
    "price": "Price",
    "stock": "Stock",
    "minStock": "Min Stock",
    "unit": "Unit",
    "image": "Image",
    "description": "Description",
    "selectCategory": "Select Category",
    "selectUnit": "Select Unit",
    "namePlaceholder": "Enter product name",
    "skuPlaceholder": "Enter SKU code",
    "pricePlaceholder": "0.00",
    "stockPlaceholder": "0",
    "minStockPlaceholder": "0",
    "descriptionPlaceholder": "Enter product description",
    "searchPlaceholder": "Search products by name, SKU, or description",
    "deleteConfirmation": "Are you sure you want to delete '{name}'? This action cannot be undone."
  }
}

lo_LA.json:
{
  "common": {
    "add": "ເພີ່ມ",
    "edit": "ແກ້ໄຂ",
    "delete": "ລຶບ",
    "cancel": "ຍົກເລີກ",
    "save": "ບັນທຶກ",
    "create": "ສ້າງ",
    "update": "ອັບເດດ",
    "close": "ປິດ",
    "reset": "ຣີເຊັດ",
    "search": "ຄົ້ນຫາ",
    "export": "ສົ່ງອອກ",
    "import": "ນຳເຂົ້າ",
    "actions": "ການດຳເນີນການ",
    "status": "ສະຖານະ",
    "active": "ເຮັດວຽກ",
    "inactive": "ບໍ່ເຮັດວຽກ",
    "branch": "ສາຂາ",
    "selectBranch": "ເລືອກສາຂາ",
    "selectStatus": "ເລືອກສະຖານະ",
    "showing": "ສະແດງ",
    "of": "ຂອງ",
    "confirmDelete": "ຢືນຢັນການລຶບ"
  },
  "products": {
    "title": "ຈັດການສິນຄ້າ",
    "subtitle": "ຈັດການສິນຄ້າ, ສິນຄ້າຄົງເຫລືອ, ແລະ ລາຄາຂອງທ່ານ",
    "list": "ລາຍການສິນຄ້າ",
    "addProduct": "ເພີ່ມສິນຄ້າ",
    "editProduct": "ແກ້ໄຂສິນຄ້າ",
    "viewProduct": "ເບິ່ງສິນຄ້າ",
    "name": "ຊື່ສິນຄ້າ",
    "sku": "ລະຫັດສິນຄ້າ",
    "category": "ປະເພດສິນຄ້າ",
    "price": "ລາຄາ",
    "stock": "ຈຳນວນຄົງເຫລືອ",
    "minStock": "ຈຳນວນຕໍ່າສຸດ",
    "unit": "ຫົວໜ່ວຍ",
    "image": "ຮູບພາບ",
    "description": "ຄຳອະທິບາຍ",
    "selectCategory": "ເລືອກປະເພດສິນຄ້າ",
    "selectUnit": "ເລືອກຫົວໜ່ວຍ",
    "namePlaceholder": "ພິມຊື່ສິນຄ້າ",
    "skuPlaceholder": "ພິມລະຫັດສິນຄ້າ",
    "pricePlaceholder": "0.00",
    "stockPlaceholder": "0",
    "minStockPlaceholder": "0",
    "descriptionPlaceholder": "ພິມຄຳອະທິບາຍສິນຄ້າ",
    "searchPlaceholder": "ຄົ້ນຫາສິນຄ້າໂດຍຊື່, ລະຫັດ, ຫລື ຄຳອະທິບາຍ",
    "deleteConfirmation": "ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ '{name}'? ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້."
  }
}
*/
</script>
