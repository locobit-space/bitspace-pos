<template>
  <div class="barcode-scanner">
    <!-- Scanner Input Mode -->
    <div v-if="inputMode === 'keyboard'" class="relative">
      <UInput
        ref="inputRef"
        v-model="barcodeInput"
        :placeholder="placeholder"
        icon="i-heroicons-qr-code"
        class="font-mono"
        @keydown.enter="handleScan"
        @focus="isActive = true"
        @blur="handleBlur"
      />
      <div
        v-if="isActive"
        class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
      >
        <UBadge color="success" variant="subtle" size="xs">
          <UIcon name="i-heroicons-signal" class="animate-pulse" />
          {{ $t('pos.scanner.listening') }}
        </UBadge>
      </div>
    </div>

    <!-- Camera Scanner Mode -->
    <div v-if="inputMode === 'camera'" class="relative">
      <div
        ref="videoContainer"
        class="aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden"
      >
        <video
          ref="videoRef"
          class="w-full h-full object-cover"
          playsinline
        />
        
        <!-- Scanning overlay -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-64 h-64 border-2 border-white/50 rounded-lg relative">
            <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            
            <!-- Scanning line animation -->
            <div class="absolute left-4 right-4 h-0.5 bg-primary animate-scan" />
          </div>
        </div>
      </div>
      
      <div class="flex justify-center gap-2 mt-4">
        <UButton
          v-if="!cameraActive"
          icon="i-heroicons-video-camera"
          @click="startCamera"
        >
          {{ $t('pos.scanner.startCamera') }}
        </UButton>
        <UButton
          v-else
          variant="outline"
          icon="i-heroicons-video-camera-slash"
          @click="stopCamera"
        >
          {{ $t('pos.scanner.stopCamera') }}
        </UButton>
      </div>
    </div>

    <!-- Mode Toggle -->
    <div class="flex justify-center gap-2 mt-4">
      <UFieldGroup>
        <UButton
          :variant="inputMode === 'keyboard' ? 'solid' : 'outline'"
          size="sm"
          icon="i-heroicons-keyboard"
          @click="inputMode = 'keyboard'"
        >
          {{ $t('pos.scanner.keyboard') }}
        </UButton>
        <UButton
          :variant="inputMode === 'camera' ? 'solid' : 'outline'"
          size="sm"
          icon="i-heroicons-camera"
          @click="inputMode = 'camera'"
        >
          {{ $t('pos.scanner.camera') }}
        </UButton>
      </UFieldGroup>
    </div>

    <!-- Last Scanned -->
    <div v-if="lastScanned" class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted">{{ $t('pos.scanner.lastScanned') }}</p>
          <p class="font-mono font-bold">{{ lastScanned }}</p>
        </div>
        <UButton
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="xs"
          @click="lastScanned = ''"
        />
      </div>
    </div>

    <!-- Scan History -->
    <div v-if="showHistory && scanHistory.length > 0" class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium">{{ $t('pos.scanner.recentScans') }}</p>
        <UButton
          variant="ghost"
          size="xs"
          @click="scanHistory = []"
        >
          {{ $t('common.clear') }}
        </UButton>
      </div>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        <div
          v-for="(scan, index) in scanHistory"
          :key="index"
          class="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('scan', scan.code)"
        >
          <span class="font-mono">{{ scan.code }}</span>
          <span class="text-xs text-muted">{{ formatTime(scan.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Note: For camera scanning, install @zxing/library: npm install @zxing/library
// import { BrowserMultiFormatReader } from '@zxing/library'

const props = withDefaults(defineProps<{
  placeholder?: string
  autoFocus?: boolean
  showHistory?: boolean
  continuous?: boolean
}>(), {
  placeholder: 'Scan or enter barcode...',
  autoFocus: true,
  showHistory: false,
  continuous: false
})

const emit = defineEmits<{
  scan: [code: string]
  error: [error: Error]
}>()

const _t = useI18n()

// State
const inputMode = ref<'keyboard' | 'camera'>('keyboard')
const barcodeInput = ref('')
const lastScanned = ref('')
const isActive = ref(false)
const cameraActive = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

interface ScanRecord {
  code: string
  time: Date
}
const scanHistory = ref<ScanRecord[]>([])

// ZXing reader instance (any type as library may not be installed)
let codeReader: unknown = null
let mediaStream: MediaStream | null = null

// Methods
function handleScan() {
  const code = barcodeInput.value.trim()
  if (code) {
    emitScan(code)
    barcodeInput.value = ''
  }
}

function emitScan(code: string) {
  lastScanned.value = code
  
  // Add to history
  scanHistory.value.unshift({
    code,
    time: new Date()
  })
  
  // Keep only last 10 scans
  if (scanHistory.value.length > 10) {
    scanHistory.value = scanHistory.value.slice(0, 10)
  }
  
  emit('scan', code)
  
  // Play sound feedback
  playBeep()
}

function handleBlur() {
  // Delay to allow for re-focus
  setTimeout(() => {
    if (document.activeElement !== inputRef.value) {
      isActive.value = false
    }
  }, 100)
}

async function startCamera() {
  try {
    // Camera scanning requires @zxing/library
    // Install with: npm install @zxing/library
    // Then uncomment the import at the top
    
    // For now, show a message
    emit('error', new Error('Camera scanning requires @zxing/library. Please use keyboard/scanner mode.'))
    
    /* Uncomment when @zxing/library is installed:
    codeReader = new BrowserMultiFormatReader()
    
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
      
      cameraActive.value = true
      scanWithCamera()
    }
    */
  } catch (error) {
    console.error('Camera error:', error)
    emit('error', error as Error)
  }
}

// Camera scanning function - used when @zxing/library is installed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function scanWithCameraLoop() {
  const reader = codeReader as { decodeFromVideoElement?: (video: HTMLVideoElement) => Promise<{ getText: () => string }> } | null
  if (!reader?.decodeFromVideoElement || !videoRef.value || !cameraActive.value) return
  
  try {
    const result = await reader.decodeFromVideoElement(videoRef.value)
    if (result) {
      emitScan(result.getText())
      
      if (!props.continuous) {
        stopCamera()
      } else {
        // Continue scanning after a delay
        setTimeout(scanWithCameraLoop, 1500)
      }
    }
  } catch {
    // No barcode found, continue scanning
    if (cameraActive.value) {
      requestAnimationFrame(scanWithCameraLoop)
    }
  }
}

function stopCamera() {
  cameraActive.value = false
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  
  if (codeReader) {
    const reader = codeReader as { reset?: () => void }
    reader.reset?.()
    codeReader = null
  }
}

function playBeep() {
  try {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 1000
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch {
    // Audio not supported
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Focus input on mount
onMounted(() => {
  if (props.autoFocus && inputRef.value) {
    inputRef.value.focus()
    isActive.value = true
  }
  
  // Global keyboard listener for barcode scanners
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // Most barcode scanners send data rapidly followed by Enter
    if (inputMode.value === 'keyboard' && !isActive.value) {
      if (e.key.length === 1) {
        barcodeInput.value += e.key
        inputRef.value?.focus()
        isActive.value = true
      }
    }
  }
  
  document.addEventListener('keydown', handleGlobalKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown)
    stopCamera()
  })
})
</script>

<style scoped>
@keyframes scan {
  0%, 100% {
    top: 0;
  }
  50% {
    top: calc(100% - 2px);
  }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
