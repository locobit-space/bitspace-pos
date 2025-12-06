<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('pos.tables.title')"
      :description="$t('pos.tables.description')"
    >
      <template #actions>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            icon="i-heroicons-cog-6-tooth"
            @click="showSettingsModal = true"
          >
            {{ $t('pos.tables.settings') }}
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            @click="openTableModal()"
          >
            {{ $t('pos.tables.addTable') }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Floor Summary -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ stats.total }}</p>
          <p class="text-sm text-muted">{{ $t('pos.tables.totalTables') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.available }}</p>
          <p class="text-sm text-muted">{{ $t('pos.tables.available') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.occupied }}</p>
          <p class="text-sm text-muted">{{ $t('pos.tables.occupied') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-orange-600">{{ stats.reserved }}</p>
          <p class="text-sm text-muted">{{ $t('pos.tables.reserved') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold">{{ stats.totalSeats }}</p>
          <p class="text-sm text-muted">{{ $t('pos.tables.totalSeats') }}</p>
        </div>
      </UCard>
    </div>

    <!-- Floor Selector -->
    <div class="flex items-center gap-4 mb-6">
      <UFieldGroup>
        <UButton
          v-for="floor in floors"
          :key="floor.id"
          :variant="currentFloor === floor.id ? 'solid' : 'outline'"
          @click="currentFloor = floor.id"
        >
          {{ floor.name }}
        </UButton>
      </UFieldGroup>
      
      <div class="flex-1" />
      
      <UFieldGroup>
        <UButton
          :variant="viewMode === 'grid' ? 'solid' : 'outline'"
          icon="i-heroicons-squares-2x2"
          @click="viewMode = 'grid'"
        />
        <UButton
          :variant="viewMode === 'list' ? 'solid' : 'outline'"
          icon="i-heroicons-list-bullet"
          @click="viewMode = 'list'"
        />
      </UFieldGroup>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <UCard
        v-for="table in currentFloorTables"
        :key="table.id"
        class="cursor-pointer hover:shadow-lg transition-shadow"
        :class="getTableCardClass(table)"
        @click="selectTable(table)"
      >
        <div class="text-center py-4">
          <div
            class="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-3"
            :class="getTableIconClass(table)"
          >
            <UIcon :name="getTableIcon(table)" class="text-2xl" />
          </div>
          
          <p class="font-bold text-lg">{{ table.name }}</p>
          <p class="text-sm text-muted">{{ table.seats }} {{ $t('pos.tables.seats') }}</p>
          
          <UBadge
            :color="getStatusColor(table.status)"
            variant="subtle"
            class="mt-2"
          >
            {{ $t(`pos.tables.status.${table.status}`) }}
          </UBadge>
          
          <div v-if="table.status === 'occupied'" class="mt-2 text-xs text-muted">
            <p>{{ table.currentOrder?.customerName || $t('pos.tables.walkIn') }}</p>
            <p>{{ formatCurrency(table.currentOrder?.total || 0) }}</p>
          </div>
          
          <div v-if="table.status === 'reserved'" class="mt-2 text-xs text-muted">
            <p>{{ table.reservation?.customerName }}</p>
            <p>{{ formatTime(table.reservation?.time) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- List View -->
    <UCard v-else>
      <div class="divide-y">
        <div
          v-for="table in currentFloorTables"
          :key="table.id"
          class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 px-4 -mx-4 cursor-pointer"
          @click="selectTable(table)"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              :class="getTableIconClass(table)"
            >
              <UIcon :name="getTableIcon(table)" class="text-xl" />
            </div>
            <div>
              <p class="font-medium">{{ table.name }}</p>
              <p class="text-sm text-muted">{{ table.seats }} {{ $t('pos.tables.seats') }} · {{ getFloorName(table.floorId) }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="text-right">
              <UBadge :color="getStatusColor(table.status)" variant="subtle">
                {{ $t(`pos.tables.status.${table.status}`) }}
              </UBadge>
              <p v-if="table.currentOrder" class="text-sm font-medium mt-1">
                {{ formatCurrency(table.currentOrder.total) }}
              </p>
            </div>
            
            <UDropdownMenu :items="getTableActions(table)">
              <UButton variant="ghost" icon="i-heroicons-ellipsis-vertical" />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Table Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="selectedTable ? getTableIconClass(selectedTable) : ''"
              >
                <UIcon :name="selectedTable ? getTableIcon(selectedTable) : 'i-heroicons-squares-2x2'" />
              </div>
              <div>
                <h3 class="font-semibold">{{ selectedTable?.name }}</h3>
                <p class="text-sm text-muted">{{ selectedTable?.seats }} {{ $t('pos.tables.seats') }}</p>
              </div>
            </div>
          </template>
      
          <div v-if="selectedTable" class="space-y-4">
        <!-- Status Actions -->
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="selectedTable.status === 'available'"
            color="primary"
            icon="i-heroicons-shopping-cart"
            @click="startOrder(selectedTable)"
          >
            {{ $t('pos.tables.startOrder') }}
          </UButton>
          
          <UButton
            v-if="selectedTable.status === 'available'"
            variant="outline"
            icon="i-heroicons-calendar"
            @click="makeReservation(selectedTable)"
          >
            {{ $t('pos.tables.reserve') }}
          </UButton>
          
          <UButton
            v-if="selectedTable.status === 'occupied'"
            variant="outline"
            icon="i-heroicons-plus"
            @click="addToOrder(selectedTable)"
          >
            {{ $t('pos.tables.addItems') }}
          </UButton>
          
          <UButton
            v-if="selectedTable.status === 'occupied'"
            color="success"
            icon="i-heroicons-banknotes"
            @click="processPayment(selectedTable)"
          >
            {{ $t('pos.tables.payment') }}
          </UButton>
          
          <UButton
            v-if="selectedTable.status === 'reserved'"
            variant="outline"
            icon="i-heroicons-check"
            @click="seatGuests(selectedTable)"
          >
            {{ $t('pos.tables.seatGuests') }}
          </UButton>
          
          <UButton
            v-if="selectedTable.status === 'reserved'"
            variant="outline"
            color="error"
            icon="i-heroicons-x-mark"
            @click="cancelReservation(selectedTable)"
          >
            {{ $t('pos.tables.cancelReservation') }}
          </UButton>
        </div>
        
        <!-- Current Order Details -->
        <div v-if="selectedTable.currentOrder">
          <h4 class="font-medium mb-3">{{ $t('pos.tables.currentOrder') }}</h4>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.customer') }}</span>
              <span>{{ selectedTable.currentOrder.customerName || $t('pos.tables.walkIn') }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.items') }}</span>
              <span>{{ selectedTable.currentOrder.items }} items</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.duration') }}</span>
              <span>{{ selectedTable.currentOrder.duration }}</span>
            </div>
            <div class="flex justify-between font-bold border-t pt-2 mt-2">
              <span>{{ $t('pos.tables.total') }}</span>
              <span>{{ formatCurrency(selectedTable.currentOrder.total) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Reservation Details -->
        <div v-if="selectedTable.reservation">
          <h4 class="font-medium mb-3">{{ $t('pos.tables.reservationDetails') }}</h4>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.customer') }}</span>
              <span>{{ selectedTable.reservation.customerName }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.phone') }}</span>
              <span>{{ selectedTable.reservation.phone }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.time') }}</span>
              <span>{{ formatTime(selectedTable.reservation.time) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ $t('pos.tables.partySize') }}</span>
              <span>{{ selectedTable.reservation.partySize }} {{ $t('pos.tables.guests') }}</span>
            </div>
            <div v-if="selectedTable.reservation.notes" class="text-sm">
              <span class="text-muted">{{ $t('pos.tables.notes') }}:</span>
              <p class="mt-1">{{ selectedTable.reservation.notes }}</p>
            </div>
          </div>
        </div>
          </div>
      
          <template #footer>
            <div class="flex justify-between">
              <UButton variant="ghost" @click="openTableModal(selectedTable || undefined)">
                {{ $t('common.edit') }}
              </UButton>
              <UButton variant="ghost" @click="showDetailModal = false">
                {{ $t('common.close') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Add/Edit Table Modal -->
    <UModal v-model:open="showTableModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              {{ editingTable ? $t('pos.tables.editTable') : $t('pos.tables.addTable') }}
            </h3>
          </template>
      
          <div class="space-y-4">
          <UFormField :label="$t('pos.tables.tableName')" required>
            <UInput
              v-model="tableForm.name"
              :placeholder="$t('pos.tables.tableNamePlaceholder')"
            />
          </UFormField>
        
          <UFormField :label="$t('pos.tables.seats')" required>
            <UInput
              v-model.number="tableForm.seats"
              type="number"
              min="1"
              max="20"
            />
          </UFormField>
        
          <UFormField :label="$t('pos.tables.floor')">
            <USelect
              v-model="tableForm.floorId"
              :items="floors"
              value-key="id"
              label-key="name"
            />
          </UFormField>
        
          <UFormField :label="$t('pos.tables.shape')">
            <USelect
              v-model="tableForm.shape"
              :items="shapeOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>
        
          <UFormField :label="$t('pos.tables.minSeats')">
            <UInput
              v-model.number="tableForm.minSeats"
              type="number"
              min="1"
            />
          </UFormField>
          </div>
      
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="showTableModal = false">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton :loading="savingTable" @click="saveTable">
                {{ editingTable ? $t('common.update') : $t('common.create') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Reservation Modal -->
    <UModal v-model:open="showReservationModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t('pos.tables.makeReservation') }}</h3>
          </template>
      
          <div class="space-y-4">
            <UFormField :label="$t('pos.tables.customer')" required>
              <UInput
                v-model="reservationForm.customerName"
                :placeholder="$t('pos.tables.customerNamePlaceholder')"
              />
            </UFormField>
            
            <UFormField :label="$t('pos.tables.phone')" required>
              <UInput
                v-model="reservationForm.phone"
                type="tel"
                :placeholder="$t('pos.tables.phonePlaceholder')"
              />
            </UFormField>
            
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="$t('pos.tables.date')" required>
                <UInput v-model="reservationForm.date" type="date" />
              </UFormField>
              
              <UFormField :label="$t('pos.tables.time')" required>
                <UInput v-model="reservationForm.time" type="time" />
              </UFormField>
            </div>
            
            <UFormField :label="$t('pos.tables.partySize')" required>
              <UInput
                v-model.number="reservationForm.partySize"
                type="number"
                min="1"
              />
            </UFormField>
            
            <UFormField :label="$t('pos.tables.notes')">
              <UTextarea
                v-model="reservationForm.notes"
                :placeholder="$t('pos.tables.notesPlaceholder')"
                :rows="2"
              />
            </UFormField>
          </div>
      
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="showReservationModal = false">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton :loading="savingReservation" @click="saveReservation">
                {{ $t('pos.tables.confirmReservation') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Settings Modal -->
    <UModal v-model:open="showSettingsModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t('pos.tables.floorSettings') }}</h3>
          </template>
          
          <div class="space-y-4">
            <h4 class="font-medium">{{ $t('pos.tables.manageFloors') }}</h4>
            
            <div v-for="floor in floors" :key="floor.id" class="flex items-center gap-2">
              <UInput v-model="floor.name" class="flex-1" />
              <UButton
                v-if="floors.length > 1"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                @click="removeFloor(floor.id)"
              />
            </div>
            
            <UButton
              variant="outline"
              icon="i-heroicons-plus"
              size="sm"
              @click="addFloor"
            >
              {{ $t('pos.tables.addFloor') }}
            </UButton>
          </div>
          
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" @click="showSettingsModal = false">
                {{ $t('common.close') }}
              </UButton>
              <UButton @click="saveFloors">
                {{ $t('common.save') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'permission']
})

const { t } = useI18n()
const toast = useToast()
const { format } = useCurrency()
const router = useRouter()

interface Table {
  id: string
  name: string
  seats: number
  minSeats: number
  floorId: string
  shape: 'round' | 'square' | 'rectangle'
  status: 'available' | 'occupied' | 'reserved' | 'unavailable'
  currentOrder?: {
    id: string
    customerName?: string
    items: number
    total: number
    duration: string
    startTime: Date
  }
  reservation?: {
    id: string
    customerName: string
    phone: string
    time: string
    partySize: number
    notes?: string
  }
}

interface Floor {
  id: string
  name: string
}

// State
const viewMode = ref<'grid' | 'list'>('grid')
const currentFloor = ref('floor-1')
const showDetailModal = ref(false)
const showTableModal = ref(false)
const showReservationModal = ref(false)
const showSettingsModal = ref(false)
const savingTable = ref(false)
const savingReservation = ref(false)
const selectedTable = ref<Table | null>(null)
const editingTable = ref<Table | null>(null)
const reservingTable = ref<Table | null>(null)

const floors = ref<Floor[]>([
  { id: 'floor-1', name: 'Main Floor' },
  { id: 'floor-2', name: 'Outdoor' },
  { id: 'floor-3', name: 'Private Room' }
])

const tableForm = reactive({
  name: '',
  seats: 4,
  minSeats: 1,
  floorId: 'floor-1',
  shape: 'square' as 'round' | 'square' | 'rectangle'
})

const reservationForm = reactive({
  customerName: '',
  phone: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  partySize: 2,
  notes: ''
})

// Mock tables data
const tables = ref<Table[]>([
  { id: '1', name: 'T1', seats: 2, minSeats: 1, floorId: 'floor-1', shape: 'round', status: 'available' },
  { id: '2', name: 'T2', seats: 4, minSeats: 2, floorId: 'floor-1', shape: 'square', status: 'occupied', currentOrder: { id: 'ord-1', customerName: 'John', items: 5, total: 150000, duration: '45m', startTime: new Date() } },
  { id: '3', name: 'T3', seats: 4, minSeats: 2, floorId: 'floor-1', shape: 'square', status: 'available' },
  { id: '4', name: 'T4', seats: 6, minSeats: 4, floorId: 'floor-1', shape: 'rectangle', status: 'reserved', reservation: { id: 'res-1', customerName: 'Smith Family', phone: '+856 20 1234567', time: '19:00', partySize: 5 } },
  { id: '5', name: 'T5', seats: 2, minSeats: 1, floorId: 'floor-1', shape: 'round', status: 'occupied', currentOrder: { id: 'ord-2', items: 3, total: 80000, duration: '20m', startTime: new Date() } },
  { id: '6', name: 'T6', seats: 8, minSeats: 6, floorId: 'floor-1', shape: 'rectangle', status: 'available' },
  { id: '7', name: 'O1', seats: 4, minSeats: 2, floorId: 'floor-2', shape: 'round', status: 'available' },
  { id: '8', name: 'O2', seats: 4, minSeats: 2, floorId: 'floor-2', shape: 'round', status: 'occupied', currentOrder: { id: 'ord-3', customerName: 'Tourist Group', items: 8, total: 250000, duration: '1h 15m', startTime: new Date() } },
  { id: '9', name: 'P1', seats: 10, minSeats: 6, floorId: 'floor-3', shape: 'rectangle', status: 'reserved', reservation: { id: 'res-2', customerName: 'Company Meeting', phone: '+856 20 9876543', time: '18:30', partySize: 8, notes: 'Business dinner, vegetarian options needed' } }
])

const shapeOptions = computed(() => [
  { value: 'round', label: t('pos.tables.shapeRound') },
  { value: 'square', label: t('pos.tables.shapeSquare') },
  { value: 'rectangle', label: t('pos.tables.shapeRectangle') }
])

// Computed
const stats = computed(() => {
  const all = tables.value
  return {
    total: all.length,
    available: all.filter(t => t.status === 'available').length,
    occupied: all.filter(t => t.status === 'occupied').length,
    reserved: all.filter(t => t.status === 'reserved').length,
    totalSeats: all.reduce((sum, t) => sum + t.seats, 0)
  }
})

const currentFloorTables = computed(() => {
  return tables.value.filter(t => t.floorId === currentFloor.value)
})

// Methods
function formatCurrency(amount: number): string {
  return format(amount, 'LAK')
}

function formatTime(time?: string): string {
  if (!time) return ''
  return time
}

function getFloorName(floorId: string): string {
  return floors.value.find(f => f.id === floorId)?.name || ''
}

function getStatusColor(status: string): 'success' | 'primary' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'neutral'> = {
    available: 'success',
    occupied: 'primary',
    reserved: 'warning',
    unavailable: 'neutral'
  }
  return colors[status] || 'neutral'
}

function getTableIcon(table: Table): string {
  const icons: Record<string, string> = {
    round: 'i-heroicons-stop-circle',
    square: 'i-heroicons-stop',
    rectangle: 'i-heroicons-rectangle-group'
  }
  return icons[table.shape] || 'i-heroicons-stop'
}

function getTableIconClass(table: Table): string {
  const classes: Record<string, string> = {
    available: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    occupied: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    reserved: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    unavailable: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
  return classes[table.status] ?? classes.available ?? ''
}

function getTableCardClass(table: Table): string {
  if (table.status === 'occupied') return 'border-blue-500 border-2'
  if (table.status === 'reserved') return 'border-orange-500 border-2'
  return ''
}

function selectTable(table: Table) {
  selectedTable.value = table
  showDetailModal.value = true
}

function openTableModal(table?: Table) {
  if (table) {
    editingTable.value = table
    tableForm.name = table.name
    tableForm.seats = table.seats
    tableForm.minSeats = table.minSeats
    tableForm.floorId = table.floorId
    tableForm.shape = table.shape
  } else {
    editingTable.value = null
    tableForm.name = ''
    tableForm.seats = 4
    tableForm.minSeats = 1
    tableForm.floorId = currentFloor.value
    tableForm.shape = 'square'
  }
  showDetailModal.value = false
  showTableModal.value = true
}

async function saveTable() {
  if (!tableForm.name) {
    toast.add({ title: t('pos.tables.nameRequired'), color: 'error' })
    return
  }
  
  savingTable.value = true
  
  try {
    if (editingTable.value) {
      const index = tables.value.findIndex(t => t.id === editingTable.value?.id)
      const existingTable = tables.value[index]
      if (index !== -1 && existingTable) {
        tables.value[index] = {
          id: existingTable.id,
          status: existingTable.status,
          currentOrder: existingTable.currentOrder,
          reservation: existingTable.reservation,
          name: tableForm.name,
          seats: tableForm.seats,
          minSeats: tableForm.minSeats,
          floorId: tableForm.floorId,
          shape: tableForm.shape
        }
      }
      toast.add({ title: t('pos.tables.tableUpdated'), color: 'success' })
    } else {
      tables.value.push({
        id: Date.now().toString(),
        name: tableForm.name,
        seats: tableForm.seats,
        minSeats: tableForm.minSeats,
        floorId: tableForm.floorId,
        shape: tableForm.shape,
        status: 'available'
      })
      toast.add({ title: t('pos.tables.tableCreated'), color: 'success' })
    }
    
    localStorage.setItem('tables', JSON.stringify(tables.value))
    showTableModal.value = false
  } catch (error) {
    console.error('Failed to save table:', error)
  } finally {
    savingTable.value = false
  }
}

function startOrder(table: Table) {
  // Navigate to POS with table context - set table as occupied
  const index = tables.value.findIndex(t => t.id === table.id)
  const tableToUpdate = tables.value[index]
  if (index !== -1 && tableToUpdate) {
    tableToUpdate.status = 'occupied'
    tableToUpdate.currentOrder = {
      id: `order-${Date.now()}`,
      customerName: table.reservation?.customerName,
      items: 0,
      total: 0,
      duration: '0m',
      startTime: new Date()
    }
    tableToUpdate.reservation = undefined
    localStorage.setItem('tables', JSON.stringify(tables.value))
  }
  
  router.push({
    path: '/pos',
    query: { tableId: table.id, tableName: table.name }
  })
}

function addToOrder(table: Table) {
  if (table.currentOrder) {
    // Go to POS with existing table order
    router.push({
      path: '/pos',
      query: { tableId: table.id, tableName: table.name }
    })
  }
}

function processPayment(table: Table) {
  if (table.currentOrder) {
    // Go to POS to process payment for this table
    router.push({
      path: '/pos',
      query: { tableId: table.id, tableName: table.name, action: 'pay' }
    })
  }
}

function makeReservation(table: Table) {
  reservingTable.value = table
  reservationForm.customerName = ''
  reservationForm.phone = ''
  reservationForm.date = new Date().toISOString().slice(0, 10)
  reservationForm.time = ''
  reservationForm.partySize = 2
  reservationForm.notes = ''
  showDetailModal.value = false
  showReservationModal.value = true
}

async function saveReservation() {
  if (!reservationForm.customerName || !reservationForm.phone || !reservationForm.time) {
    toast.add({ title: t('pos.tables.fillRequired'), color: 'error' })
    return
  }
  
  savingReservation.value = true
  
  try {
    if (reservingTable.value) {
      const index = tables.value.findIndex(t => t.id === reservingTable.value?.id)
      const tableToUpdate = tables.value[index]
      if (index !== -1 && tableToUpdate) {
        tableToUpdate.status = 'reserved'
        tableToUpdate.reservation = {
          id: Date.now().toString(),
          customerName: reservationForm.customerName,
          phone: reservationForm.phone,
          time: reservationForm.time,
          partySize: reservationForm.partySize,
          notes: reservationForm.notes
        }
      }
    }
    
    localStorage.setItem('tables', JSON.stringify(tables.value))
    toast.add({ title: t('pos.tables.reservationCreated'), color: 'success' })
    showReservationModal.value = false
  } catch (error) {
    console.error('Failed to save reservation:', error)
  } finally {
    savingReservation.value = false
  }
}

function seatGuests(table: Table) {
  const index = tables.value.findIndex(t => t.id === table.id)
  const tableToUpdate = tables.value[index]
  if (index !== -1 && tableToUpdate) {
    tableToUpdate.status = 'occupied'
    tableToUpdate.currentOrder = {
      id: Date.now().toString(),
      customerName: table.reservation?.customerName,
      items: 0,
      total: 0,
      duration: '0m',
      startTime: new Date()
    }
    tableToUpdate.reservation = undefined
    
    localStorage.setItem('tables', JSON.stringify(tables.value))
    toast.add({ title: t('pos.tables.guestsSeated'), color: 'success' })
    showDetailModal.value = false
  }
}

function cancelReservation(table: Table) {
  const index = tables.value.findIndex(t => t.id === table.id)
  const tableToUpdate = tables.value[index]
  if (index !== -1 && tableToUpdate) {
    tableToUpdate.status = 'available'
    tableToUpdate.reservation = undefined
    
    localStorage.setItem('tables', JSON.stringify(tables.value))
    toast.add({ title: t('pos.tables.reservationCancelled'), color: 'success' })
    showDetailModal.value = false
  }
}

function getTableActions(table: Table) {
  const actions = []
  
  if (table.status === 'available') {
    actions.push([
      { label: t('pos.tables.startOrder'), icon: 'i-heroicons-shopping-cart', onSelect: () => startOrder(table) },
      { label: t('pos.tables.reserve'), icon: 'i-heroicons-calendar', onSelect: () => makeReservation(table) }
    ])
  }
  
  if (table.status === 'occupied') {
    actions.push([
      { label: t('pos.tables.viewOrder'), icon: 'i-heroicons-eye', onSelect: () => addToOrder(table) },
      { label: t('pos.tables.payment'), icon: 'i-heroicons-banknotes', onSelect: () => processPayment(table) }
    ])
  }
  
  if (table.status === 'reserved') {
    actions.push([
      { label: t('pos.tables.seatGuests'), icon: 'i-heroicons-check', onSelect: () => seatGuests(table) },
      { label: t('pos.tables.cancelReservation'), icon: 'i-heroicons-x-mark', color: 'error' as const, onSelect: () => cancelReservation(table) }
    ])
  }
  
  actions.push([
    { label: t('common.edit'), icon: 'i-heroicons-pencil', onSelect: () => openTableModal(table) }
  ])
  
  return actions
}

function addFloor() {
  floors.value.push({
    id: `floor-${Date.now()}`,
    name: `Floor ${floors.value.length + 1}`
  })
}

function removeFloor(floorId: string) {
  const index = floors.value.findIndex(f => f.id === floorId)
  if (index !== -1) {
    floors.value.splice(index, 1)
    if (currentFloor.value === floorId && floors.value.length > 0 && floors.value[0]) {
      currentFloor.value = floors.value[0].id
    }
  }
}

function saveFloors() {
  localStorage.setItem('tableFloors', JSON.stringify(floors.value))
  toast.add({ title: t('pos.tables.floorsSaved'), color: 'success' })
  showSettingsModal.value = false
}

// Load data on mount
onMounted(() => {
  const savedTables = localStorage.getItem('tables')
  if (savedTables) {
    tables.value = JSON.parse(savedTables)
  }
  
  const savedFloors = localStorage.getItem('tableFloors')
  if (savedFloors) {
    floors.value = JSON.parse(savedFloors)
  }
  
  if (floors.value.length > 0 && floors.value[0]) {
    currentFloor.value = floors.value[0].id
  }
})
</script>
