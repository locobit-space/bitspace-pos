import type { ChatSettings } from './use-shop'

const defaultSettings: ChatSettings = {
  enabled: false
}

const chatSettings = useState<ChatSettings>('chat-settings', () => ({ ...defaultSettings }))
const isLoaded = useState('chat-settings-loaded', () => false)

export const useChatSettings = () => {
  const shop = useShop()

  const loadSettings = async () => {
    if (!isLoaded.value) {
      await shop.init()
      if (shop.shopConfig.value?.chatSettings) {
        chatSettings.value = { ...defaultSettings, ...shop.shopConfig.value.chatSettings }
      }
      isLoaded.value = true
    }
  }

  const saveSettings = async (settings: Partial<ChatSettings>) => {
    const newSettings = { ...chatSettings.value, ...settings }
    chatSettings.value = newSettings

    // Save to shop config (syncs to Nostr)
    await shop.saveShopConfig({ chatSettings: newSettings })
  }

  const toggleChat = async () => {
    await saveSettings({ enabled: !chatSettings.value.enabled })
  }

  const resetSettings = async () => {
    chatSettings.value = { ...defaultSettings }
    await shop.saveShopConfig({ chatSettings: defaultSettings })
  }

  // Auto-load on first use
  if (import.meta.client && !isLoaded.value) {
    onMounted(async () => {
      await loadSettings()
    })
  }

  return {
    settings: chatSettings,
    saveSettings,
    toggleChat,
    resetSettings,
    loadSettings
  }
}
