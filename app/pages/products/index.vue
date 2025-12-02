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
      <div class="flex items-center gap-2">
        <!-- Quick Management Buttons (only for users who can edit) -->
        <template v-if="canEditProducts">
          <UTooltip :text="$t('products.settings.manageCategories') || 'Manage Categories'">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-heroicons-folder"
              @click="openSettingsPanel('categories')"
            >
              <span class="hidden sm:inline">{{ $t('products.category') }}</span>
            </UButton>
          </UTooltip>
          <UTooltip :text="$t('products.settings.manageUnits') || 'Manage Units'">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-heroicons-scale"
              @click="openSettingsPanel('units')"
            >
              <span class="hidden sm:inline">{{ $t('products.unit') }}</span>
            </UButton>
          </UTooltip>
        </template>
        <UButton
          v-if="canEditProducts"
          color="primary"
          size="lg"
          :label="$t('common.add')"
          icon="i-heroicons-plus"
          @click="openProductModal()"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex px-4 flex-wrap gap-4 items-end">
      <!-- Branch Filter -->
      <UFormField :label="$t('common.branch')" class="min-w-[200px]">
        <USelect
          v-model="selectedBranch"
          :items="branchOptions"
          label-key="name"
          value-key="id"
          :placeholder="$t('common.selectBranch')"
        />
      </UFormField>

      <!-- Category Filter -->
      <UFormField :label="$t('products.category')" class="min-w-[200px]">
        <div class="flex gap-1">
          <USelect
            v-model="selectedCategory"
            :items="categoryOptions"
            label-key="name"
            value-key="id"
            :placeholder="$t('products.selectCategory')"
            class="flex-1"
          />
          <UTooltip :text="$t('common.add') + ' ' + $t('products.category')">
            <UButton
              icon="i-heroicons-plus"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openCategoryModal()"
            />
          </UTooltip>
        </div>
      </UFormField>

      <!-- Status Filter -->
      <UFormField :label="$t('common.status')" class="min-w-[150px]">
        <USelect
          v-model="selectedStatus"
          :items="statusOptions"
          label-key="label"
          value-key="value"
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
                  v-if="canEditProducts"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-pencil"
                  @click="editProduct(product)"
                />
                <UButton
                  v-if="canDeleteProducts"
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
              <!-- Product Name (Required) -->
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

              <!-- Price (Required) -->
              <UFormField :label="$t('products.price')" name="price" required>
                <UInput
                  v-model="productForm.price"
                  type="number"
                  step="0.01"
                  :placeholder="$t('products.pricePlaceholder')"
                />
              </UFormField>

              <!-- SKU (Optional) -->
              <UFormField :label="$t('products.sku')" name="sku">
                <UInput
                  v-model="productForm.sku"
                  :placeholder="$t('products.skuPlaceholder') || 'Auto-generated if empty'"
                />
              </UFormField>

              <!-- Category (Optional) -->
              <UFormField
                :label="$t('products.category')"
                name="categoryId"
              >
                <div class="flex gap-1">
                  <USelect
                    v-model="productForm.categoryId"
                    :items="categoryOptions"
                    label-key="name"
                    value-key="id"
                    :placeholder="$t('products.selectCategory')"
                    class="flex-1"
                  />
                  <UTooltip :text="$t('common.add') + ' ' + $t('products.category')">
                    <UButton
                      icon="i-heroicons-plus"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="openCategoryModal()"
                    />
                  </UTooltip>
                </div>
              </UFormField>

              <!-- Unit (Optional) -->
              <UFormField :label="$t('products.unit')" name="unitId">
                <div class="flex gap-1">
                  <USelect
                    v-model="productForm.unitId"
                    :items="unitOptions"
                    label-key="name"
                    value-key="id"
                    :placeholder="$t('products.selectUnit')"
                    class="flex-1"
                  />
                  <UTooltip :text="$t('common.add') + ' ' + $t('products.unit')">
                    <UButton
                      icon="i-heroicons-plus"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="openUnitModal()"
                    />
                  </UTooltip>
                </div>
              </UFormField>

              <!-- Stock (Optional) -->
              <UFormField :label="$t('products.stock')" name="stock">
                <UInput
                  v-model="productForm.stock"
                  type="number"
                  :placeholder="$t('products.stockPlaceholder') || '0'"
                />
              </UFormField>

              <!-- Min Stock (Optional) -->
              <UFormField
                :label="$t('products.minStock')"
                name="minStock"
              >
                <UInput
                  v-model="productForm.minStock"
                  type="number"
                  :placeholder="$t('products.minStockPlaceholder') || '0'"
                />
              </UFormField>

              <!-- Branch (Optional) -->
              <UFormField :label="$t('common.branch')" name="branchId">
                <USelect
                  v-model="productForm.branchId"
                  :items="branchOptions"
                  label-key="name"
                  value-key="id"
                  :placeholder="$t('common.selectBranch')"
                />
              </UFormField>

              <!-- Status (Optional) -->
              <UFormField :label="$t('common.status')" name="status">
                <USelect
                  v-model="productForm.status"
                  :items="statusOptions"
                  label-key="label"
                  value-key="value"
                  :placeholder="$t('common.selectStatus')"
                />
              </UFormField>

              <!-- Image/Emoji (Optional) -->
              <UFormField label="Image/Emoji" name="image">
                <div class="flex gap-2">
                  <UInput
                    v-model="productForm.image"
                    placeholder="📦 or image URL"
                    class="flex-1"
                  />
                  <div class="flex gap-1">
                    <button
                      v-for="emoji in ['📦', '🍹', '🍜', '🍰', '☕', '🍺', '🍔', '🛒']"
                      :key="emoji"
                      type="button"
                      class="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      @click="productForm.image = emoji"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </UFormField>

              <!-- Description (Optional) -->
              <UFormField
                :label="$t('products.description')"
                name="description"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="productForm.description"
                  :placeholder="$t('products.descriptionPlaceholder')"
                  :rows="3"
                  class="w-full"
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

    <!-- ============================================ -->
    <!-- Settings Slide-Over Panel (Categories/Units) -->
    <!-- ============================================ -->
    <USlideover v-model:open="showSettingsPanel" :side="'right'">
      <template #content>
        <div class="flex flex-col h-full bg-white dark:bg-gray-900">
          <!-- Panel Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
                {{ settingsPanelTab === 'categories' ? '📁' : '📐' }}
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ settingsPanelTab === 'categories' 
                    ? ($t('products.settings.manageCategories') || 'Manage Categories')
                    : ($t('products.settings.manageUnits') || 'Manage Units') }}
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ settingsPanelTab === 'categories'
                    ? ($t('products.settings.manageCategoriesDesc') || 'Add, edit or delete product categories')
                    : ($t('products.settings.manageUnitsDesc') || 'Manage product measurement units') }}
                </p>
              </div>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="showSettingsPanel = false"
            />
          </div>

          <!-- Panel Tabs -->
          <div class="flex border-b border-gray-200 dark:border-gray-700">
            <button
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="settingsPanelTab === 'categories'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="settingsPanelTab = 'categories'"
            >
              <span class="flex items-center justify-center gap-2">
                <span>📁</span>
                <span>{{ $t('products.category') || 'Categories' }}</span>
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ categories.length }}
                </UBadge>
              </span>
              <div 
                v-if="settingsPanelTab === 'categories'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
              />
            </button>
            <button
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="settingsPanelTab === 'units'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="settingsPanelTab = 'units'"
            >
              <span class="flex items-center justify-center gap-2">
                <span>📐</span>
                <span>{{ $t('products.unit') || 'Units' }}</span>
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ units.length }}
                </UBadge>
              </span>
              <div 
                v-if="settingsPanelTab === 'units'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
              />
            </button>
          </div>

          <!-- Panel Content -->
          <div class="flex-1 overflow-y-auto p-4">
            <!-- Categories List -->
            <div v-if="settingsPanelTab === 'categories'" class="space-y-3">
              <div
                v-for="category in categories"
                :key="category.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ category.icon || '📦' }}</span>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ category.name }}
                    </h3>
                    <p v-if="category.description" class="text-xs text-gray-500 dark:text-gray-400">
                      {{ category.description }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <UButton
                    v-if="!['all', 'favorites'].includes(category.id)"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openCategoryModal(category)"
                  />
                  <UButton
                    v-if="!['all', 'favorites'].includes(category.id)"
                    icon="i-heroicons-trash"
                    color="red"
                    variant="ghost"
                    size="xs"
                    @click="confirmDeleteCategory(category)"
                  />
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="categories.length === 0" class="text-center py-8 text-gray-400">
                <span class="text-4xl block mb-2">📁</span>
                <p>{{ $t('products.noCategories') || 'No categories yet' }}</p>
              </div>
            </div>

            <!-- Units List -->
            <div v-if="settingsPanelTab === 'units'" class="space-y-3">
              <div
                v-for="unit in units"
                :key="unit.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                    {{ unit.symbol }}
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ unit.name }}
                    </h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ $t('products.units.symbol') || 'Symbol' }}: {{ unit.symbol }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openUnitModal(unit)"
                  />
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="units.length === 0" class="text-center py-8 text-gray-400">
                <span class="text-4xl block mb-2">📐</span>
                <p>{{ $t('products.noUnits') || 'No units yet' }}</p>
              </div>
            </div>
          </div>

          <!-- Panel Footer with Add Button -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              block
              color="primary"
              icon="i-heroicons-plus"
              @click="settingsPanelTab === 'categories' ? openCategoryModal() : openUnitModal()"
            >
              {{ settingsPanelTab === 'categories'
                ? ($t('products.addCategory') || 'Add Category')
                : ($t('products.addUnit') || 'Add Unit') }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- ============================================ -->
    <!-- Category Modal -->
    <!-- ============================================ -->
    <UModal v-model:open="showCategoryModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📁</span>
            {{ editingCategory ? ($t('common.edit') || 'Edit') : ($t('common.add') || 'Add') }}
            {{ $t('products.category') || 'Category' }}
          </h3>

          <div class="space-y-4">
            <!-- Icon Selection -->
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                {{ $t('common.icon') || 'Icon' }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="icon in commonIcons"
                  :key="icon"
                  type="button"
                  class="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all"
                  :class="categoryForm.icon === icon
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 scale-110'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'"
                  @click="categoryForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>

            <!-- Name -->
            <UFormField :label="$t('common.name') || 'Name'" required>
              <UInput
                v-model="categoryForm.name"
                :placeholder="$t('products.categories.namePlaceholder') || 'e.g., Drinks, Food, Snacks'"
              />
            </UFormField>

            <!-- Description -->
            <UFormField :label="$t('common.description') || 'Description'">
              <UInput
                v-model="categoryForm.description"
                :placeholder="$t('common.optional') || 'Optional description'"
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showCategoryModal = false"
              >
                {{ $t('common.cancel') || 'Cancel' }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :loading="savingCategory"
                @click="saveCategory"
              >
                {{ editingCategory ? ($t('common.update') || 'Update') : ($t('common.create') || 'Create') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============================================ -->
    <!-- Unit Modal -->
    <!-- ============================================ -->
    <UModal v-model:open="showUnitModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📐</span>
            {{ editingUnit ? ($t('common.edit') || 'Edit') : ($t('common.add') || 'Add') }}
            {{ $t('products.unit') || 'Unit' }}
          </h3>

          <div class="space-y-4">
            <!-- Quick Unit Presets -->
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                {{ $t('common.quickSelect') || 'Quick Select' }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in unitPresets"
                  :key="preset.symbol"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-sm transition-all"
                  :class="unitForm.symbol === preset.symbol
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'"
                  @click="unitForm.name = preset.name; unitForm.symbol = preset.symbol"
                >
                  {{ preset.name }} ({{ preset.symbol }})
                </button>
              </div>
            </div>

            <!-- Name -->
            <UFormField :label="$t('common.name') || 'Name'" required>
              <UInput
                v-model="unitForm.name"
                :placeholder="$t('products.units.namePlaceholder') || 'e.g., Piece, Kilogram, Liter'"
              />
            </UFormField>

            <!-- Symbol -->
            <UFormField :label="$t('products.units.symbol') || 'Symbol'" required>
              <UInput
                v-model="unitForm.symbol"
                :placeholder="$t('products.units.symbolPlaceholder') || 'e.g., pc, kg, L'"
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                block
                @click="showUnitModal = false"
              >
                {{ $t('common.cancel') || 'Cancel' }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :loading="savingUnit"
                block
                @click="saveUnit"
              >
                {{ editingUnit ? ($t('common.update') || 'Update') : ($t('common.create') || 'Create') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============================================ -->
    <!-- Delete Category Confirmation Modal -->
    <!-- ============================================ -->
    <UModal v-model:open="showDeleteCategoryModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
            {{ $t('common.confirmDelete') || 'Confirm Delete' }}
          </h3>

          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ $t('common.deleteConfirmMessage') || 'Are you sure you want to delete' }}
            <strong class="text-gray-900 dark:text-white">
              "{{ categoryToDelete?.name }}"
            </strong>?
            {{ $t('common.cannotUndo') || 'This action cannot be undone.' }}
          </p>

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              class="flex-1"
              block
              @click="showDeleteCategoryModal = false"
            >
              {{ $t('common.cancel') || 'Cancel' }}
            </UButton>
            <UButton
              color="red"
              class="flex-1"
              :loading="deletingCategory"
              block
              @click="executeDeleteCategory"
            >
              {{ $t('common.delete') || 'Delete' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";
import type { Product } from '~/types';

// ============================================
// 📦 PRODUCTS PAGE - Connected to Nostr/Dexie
// ============================================

// Use real products store with Nostr sync & encryption
const productsStore = useProductsStore();
const toast = useToast();
const { canEditProducts, canDeleteProducts } = usePermissions();

// Types (local only)
interface _Product {
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
  image: string;
}

// Validation Schema - Only name and price required
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  branchId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
// Categories loaded from store (Dexie/Nostr)

// Units loaded from store (Dexie/Nostr)

const mockBranches: Branch[] = [
  { id: "1", name: "ສາຂາໃຈກາງ / Central Branch", code: "CB001" },
  { id: "2", name: "ສາຂາຫ້ວຍໂຮ້ງ / Huay Hong Branch", code: "HH001" },
  { id: "3", name: "ສາຂາດົງໂດກ / Dongdok Branch", code: "DD001" },
];

// Reactive Data from Store (Dexie + Nostr with encryption)
const products = computed(() => productsStore.products.value);
const categories = computed(() => productsStore.categories.value);
const units = computed(() => productsStore.units.value);
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

// ============================================
// Settings Panel State (Categories/Units)
// ============================================
const showSettingsPanel = ref<boolean>(false);
const settingsPanelTab = ref<'categories' | 'units'>('categories');

// Category Modal
const showCategoryModal = ref<boolean>(false);
const editingCategory = ref<Category | null>(null);
const categoryForm = ref({
  name: '',
  description: '',
  icon: '📦',
});
const savingCategory = ref<boolean>(false);

// Unit Modal
const showUnitModal = ref<boolean>(false);
const editingUnit = ref<Unit | null>(null);
const unitForm = ref({
  name: '',
  symbol: '',
});
const savingUnit = ref<boolean>(false);

// Delete Category Modal
const showDeleteCategoryModal = ref<boolean>(false);
const categoryToDelete = ref<Category | null>(null);
const deletingCategory = ref<boolean>(false);

// Common icons for categories
const commonIcons = ['📦', '🍹', '🍜', '🍰', '🍿', '☕', '🍺', '🍔', '🍕', '🌮', '🍣', '🥗', '🍪', '🎂', '🍦', '🧃', '🥤', '🍵', '🛒', '⭐'];

// Common unit presets
const unitPresets = [
  { name: 'Piece', symbol: 'pc' },
  { name: 'Kilogram', symbol: 'kg' },
  { name: 'Gram', symbol: 'g' },
  { name: 'Liter', symbol: 'L' },
  { name: 'Milliliter', symbol: 'ml' },
  { name: 'Box', symbol: 'box' },
  { name: 'Pack', symbol: 'pk' },
  { name: 'Bottle', symbol: 'btl' },
  { name: 'Can', symbol: 'can' },
  { name: 'Dozen', symbol: 'dz' },
];

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
  image: "📦",
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
      sku: product.sku || "",
      description: product.description || "",
      categoryId: product.categoryId || "",
      unitId: product.unitId || "",
      price: product.price,
      stock: product.stock || 0,
      minStock: product.minStock || 0,
      branchId: product.branchId || "",
      status: product.status || "active",
      image: product.image || "📦",
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
      image: "📦",
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

    // Auto-generate SKU if empty
    const sku = productForm.value.sku || `SKU-${Date.now().toString(36).toUpperCase()}`;

    // Prepare product data with defaults for optional fields
    const productData = {
      name: productForm.value.name,
      sku,
      description: productForm.value.description || undefined,
      categoryId: productForm.value.categoryId || 'all',
      unitId: productForm.value.unitId || 'piece',
      price: productForm.value.price || 0,
      stock: productForm.value.stock || 0,
      minStock: productForm.value.minStock || 0,
      branchId: productForm.value.branchId || 'main',
      status: productForm.value.status || 'active',
      image: productForm.value.image || '📦',
    };

    if (selectedProduct.value) {
      // Update existing product in Dexie + Nostr (encrypted)
      await productsStore.updateProduct(selectedProduct.value.id, productData);
      toast.add({
        title: 'Product updated',
        description: `${productForm.value.name} synced to Nostr (encrypted)`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
    } else {
      // Create new product in Dexie + Nostr (encrypted)
      await productsStore.addProduct({
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Omit<Product, 'id'>);
      toast.add({
        title: 'Product created',
        description: `${productForm.value.name} saved & encrypted to Nostr`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
    }

    showProductModal.value = false;
  } catch (error) {
    console.error("Error saving product:", error);
    toast.add({
      title: 'Error',
      description: 'Failed to save product',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async () => {
  try {
    deleting.value = true;

    if (productToDelete.value) {
      // Delete from Dexie + mark as deleted in Nostr
      await productsStore.deleteProduct(productToDelete.value.id);
      toast.add({
        title: 'Product deleted',
        description: `${productToDelete.value.name} removed`,
        icon: 'i-heroicons-trash',
        color: 'orange',
      });
    }

    showDeleteModal.value = false;
  } catch (error) {
    console.error("Error deleting product:", error);
    toast.add({
      title: 'Error',
      description: 'Failed to delete product',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
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

// ============================================
// Settings Panel Methods
// ============================================
const openSettingsPanel = (tab: 'categories' | 'units') => {
  settingsPanelTab.value = tab;
  showSettingsPanel.value = true;
};

// ============================================
// Category Management Methods
// ============================================
const openCategoryModal = (category?: Category) => {
  if (category) {
    editingCategory.value = category;
    categoryForm.value = {
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📦',
    };
  } else {
    editingCategory.value = null;
    categoryForm.value = {
      name: '',
      description: '',
      icon: '📦',
    };
  }
  showCategoryModal.value = true;
};

const saveCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    toast.add({
      title: 'Error',
      description: 'Category name is required',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  savingCategory.value = true;
  try {
    if (editingCategory.value) {
      await productsStore.updateCategory(editingCategory.value.id, {
        name: categoryForm.value.name,
        description: categoryForm.value.description || undefined,
        icon: categoryForm.value.icon,
      });
      toast.add({
        title: 'Success',
        description: 'Category updated successfully',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      await productsStore.addCategory({
        name: categoryForm.value.name,
        description: categoryForm.value.description || undefined,
        icon: categoryForm.value.icon,
      });
      toast.add({
        title: 'Success',
        description: 'Category created successfully',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });
    }
    showCategoryModal.value = false;
  } catch (error) {
    console.error('Error saving category:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to save category',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    });
  } finally {
    savingCategory.value = false;
  }
};

const confirmDeleteCategory = (category: Category) => {
  if (['all', 'favorites'].includes(category.id)) {
    toast.add({
      title: 'Error',
      description: 'Cannot delete built-in category',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }
  categoryToDelete.value = category;
  showDeleteCategoryModal.value = true;
};

const executeDeleteCategory = async () => {
  if (!categoryToDelete.value) return;

  deletingCategory.value = true;
  try {
    const success = await productsStore.deleteCategory(categoryToDelete.value.id);
    if (success) {
      toast.add({
        title: 'Success',
        description: 'Category deleted successfully',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      toast.add({
        title: 'Error',
        description: productsStore.error.value || 'Failed to delete category',
        color: 'red',
        icon: 'i-heroicons-exclamation-circle',
      });
    }
    showDeleteCategoryModal.value = false;
  } finally {
    deletingCategory.value = false;
    categoryToDelete.value = null;
  }
};

// ============================================
// Unit Management Methods
// ============================================
const openUnitModal = (unit?: Unit) => {
  if (unit) {
    editingUnit.value = unit;
    unitForm.value = {
      name: unit.name,
      symbol: unit.symbol,
    };
  } else {
    editingUnit.value = null;
    unitForm.value = {
      name: '',
      symbol: '',
    };
  }
  showUnitModal.value = true;
};

const saveUnit = async () => {
  if (!unitForm.value.name.trim() || !unitForm.value.symbol.trim()) {
    toast.add({
      title: 'Error',
      description: 'Unit name and symbol are required',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    });
    return;
  }

  savingUnit.value = true;
  try {
    if (editingUnit.value) {
      await productsStore.updateUnit(editingUnit.value.id, {
        name: unitForm.value.name,
        symbol: unitForm.value.symbol,
      });
      toast.add({
        title: 'Success',
        description: 'Unit updated successfully',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      await productsStore.addUnit({
        name: unitForm.value.name,
        symbol: unitForm.value.symbol,
      });
      toast.add({
        title: 'Success',
        description: 'Unit created successfully',
        color: 'green',
        icon: 'i-heroicons-check-circle',
      });
    }
    showUnitModal.value = false;
  } catch (error) {
    console.error('Error saving unit:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to save unit',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    });
  } finally {
    savingUnit.value = false;
  }
};

// ✅ Export products as JSON (encrypted data)
const exportProducts = async () => {
  try {
    const data = await productsStore.exportProducts();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.add({
      title: 'Export successful',
      description: 'Products exported to JSON file',
      icon: 'i-heroicons-arrow-down-tray',
      color: 'green',
    });
  } catch (error) {
    console.error("Export error:", error);
    toast.add({
      title: 'Export failed',
      description: 'Could not export products',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  }
};

// ✅ Import products from JSON
const importProducts = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const result = await productsStore.importProducts(text);
      
      toast.add({
        title: 'Import successful',
        description: `Imported ${result.products} products, ${result.categories} categories`,
        icon: 'i-heroicons-arrow-up-tray',
        color: 'green',
      });
    } catch (error) {
      console.error("Import error:", error);
      toast.add({
        title: 'Import failed',
        description: 'Could not import products. Check file format.',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  };
  input.click();
};

// Watch for filter changes to reset pagination
watch([selectedBranch, selectedCategory, selectedStatus, searchQuery], () => {
  currentPage.value = 1;
});

// Initialize store on mount
onMounted(async () => {
  await productsStore.init();
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
