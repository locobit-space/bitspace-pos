// ============================================
// 💬 EMPLOYEE CHAT COMPOSABLE
// Real-time messaging with Nostr + Dexie
// End-to-end encrypted communication
// ============================================

import { nip04 } from "nostr-tools";
import type { Event as NostrEvent, VerifiedEvent } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";
import {
  db,
  type ChatMessageRecord,
  type ChatConversationRecord,
} from "~/db/db";
import type { StoreUser } from "~/types";
import CryptoJS from "crypto-js";

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderPubkey: string;
  senderName: string;
  senderAvatar?: string;
  recipientPubkey: string;
  content: string;
  timestamp: number;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  replyToId?: string;
  nostrEventId?: string;
}

export interface ChatConversation {
  id: string;
  type: "direct" | "channel" | "group";
  participants: { pubkey: string; name: string; avatar?: string }[];
  groupName?: string;
  groupAvatar?: string;
  lastMessage: {
    content: string;
    timestamp: number;
    senderName: string;
  };
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isPrivate?: boolean;
  key?: string;
  // NEW: Shop/Team Context
  shopId?: string; // Filter by specific shop
  scope?: "shop" | "company" | "department"; // Channel visibility level
  tags?: string[]; // Categorization tags (e.g., ['sales', 'kitchen'])
  isReadOnly?: boolean; // For announcement channels
  memberPubkeys?: string[]; // Private channel members list
}

export interface ChatContact {
  id: string;
  name: string;
  pubkey: string;
  avatar?: string;
  isOnline?: boolean;
}

// ============================================
// Singleton State
// ============================================

const conversations = ref<ChatConversation[]>([]);
const messages = ref<Map<string, ChatMessage[]>>(new Map());
const activeConversationId = ref<string | null>(null);
const isLoading = ref(false);
const isSending = ref(false);
const isOpen = ref(false);
const searchQuery = ref("");
const typingUsers = ref<Map<string, { name: string; timestamp: number }>>(
  new Map()
);

// Real-time subscription reference
let chatSubscription: { close: () => void } | null = null;

// ============================================
// Composable
// ============================================

export function useChat() {
  const { $nostr } = useNuxtApp();
  const usersStore = useUsers();
  const nostrKey = useNostrKey();
  const sound = useSound();
  const { DEFAULT_RELAYS } = useNostrRelay();
  const nostrData = useNostrData();
  const company = useCompany();

  // ============================================
  // State
  // ============================================

  const isOpen = useState("chat-is-open", () => false);
  const isSending = ref(false);
  const searchQuery = ref("");

  const openChat = () => (isOpen.value = true);
  const closeChat = () => (isOpen.value = false);
  const toggleChat = () => (isOpen.value = !isOpen.value);

  // ============================================
  // Computed
  // ============================================

  const unreadCount = computed(() => {
    return conversations.value.reduce((sum, c) => sum + c.unreadCount, 0);
  });

  const activeConversation = computed(() => {
    return conversations.value.find((c) => c.id === activeConversationId.value);
  });

  const activeMessages = computed(() => {
    if (!activeConversationId.value) return [];
    return messages.value.get(activeConversationId.value) || [];
  });

  const filteredConversations = computed(() => {
    if (!searchQuery.value) return conversations.value;
    const query = searchQuery.value.toLowerCase();
    return conversations.value.filter((c) => {
      const namMatch = c.participants.some((p) =>
        p.name.toLowerCase().includes(query)
      );
      const msgMatch = c.lastMessage.content.toLowerCase().includes(query);
      const grpMatch = c.groupName?.toLowerCase().includes(query);
      return namMatch || msgMatch || grpMatch;
    });
  });

  const sortedConversations = computed(() => {
    return [...filteredConversations.value].sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by last message time
      return b.lastMessage.timestamp - a.lastMessage.timestamp;
    });
  });

  // Available contacts (staff members)
  const availableContacts = computed<ChatContact[]>(() => {
    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    return usersStore.users.value
      .filter(
        (u) =>
          u.pubkeyHex && u.pubkeyHex !== currentPubkey && u.isActive !== false
      )
      .map((u) => ({
        id: u.id,
        name: u.name,
        pubkey: u.pubkeyHex!,
        avatar: u.avatar,
        isOnline: true, // TODO: Implement presence
      }));
  });

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Get current user's Nostr keys from localStorage
   * Similar to getUserKeys() in use-nostr-data.ts
   */
  const getUserKeys = (): { pubkey: string; privkey: string | null } | null => {
    if (!import.meta.client) return null;

    // 1. Try nostrUser localStorage (users who logged in with nsec)
    const stored = localStorage.getItem("nostrUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const pubkey = user.pubkey || user.publicKey;
        const privkey = user.privateKey || user.privkey || user.nsec;
        if (pubkey) {
          return { pubkey, privkey: privkey || null };
        }
      } catch {
        // Continue to fallback
      }
    }

    // 2. Try current user from composable
    const currentUser = usersStore.currentUser.value;
    if (currentUser?.pubkeyHex) {
      return { pubkey: currentUser.pubkeyHex, privkey: null };
    }

    // 3. Try nostr-pubkey cookie (for NIP-07 extension users)
    const nostrCookie = useCookie("nostr-pubkey");
    if (nostrCookie.value) {
      return { pubkey: nostrCookie.value, privkey: null };
    }

    return null;
  };

  const generateConversationId = (pubkey1: string, pubkey2: string): string => {
    // Sort pubkeys to ensure consistent ID regardless of who starts chat
    const sorted = [pubkey1, pubkey2].sort();
    return `dm_${sorted[0]?.slice(0, 8) || "unknown"}_${
      sorted[1]?.slice(0, 8) || "unknown"
    }`;
  };

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  // ============================================
  // Database Operations
  // ============================================

  async function loadConversationsFromLocal(): Promise<void> {
    try {
      const records = await db.chatConversations.toArray();
      conversations.value = records.map((r) => ({
        id: r.id,
        type: r.type,
        participants: JSON.parse(r.participantPubkeys).map(
          (pubkey: string, i: number) => ({
            pubkey,
            name: JSON.parse(r.participantNames)[i] || "Unknown",
          })
        ),
        groupName: r.groupName,
        groupAvatar: r.groupAvatar,
        lastMessage: {
          content: r.lastMessageContent,
          timestamp: r.lastMessageTime,
          senderName: r.lastMessageSenderName,
        },
        unreadCount: r.unreadCount,
        isPinned: r.isPinned,
        isMuted: r.isMuted,
        isPrivate: r.isPrivate,
        key: r.key,
        // NEW: Shop/Team Context
        shopId: r.shopId,
        scope: r.scope as "shop" | "company" | "department" | undefined,
        tags: r.tags ? JSON.parse(r.tags) : [],
        isReadOnly: r.isReadOnly,
        memberPubkeys: r.memberPubkeys ? JSON.parse(r.memberPubkeys) : [],
      }));
    } catch (e) {
      console.error("[Chat] Failed to load conversations:", e);
    }
  }

  async function saveConversationToLocal(
    conversation: ChatConversation
  ): Promise<void> {
    const record: ChatConversationRecord = {
      id: conversation.id,
      type: conversation.type,
      participantPubkeys: JSON.stringify(
        conversation.participants.map((p) => p.pubkey)
      ),
      participantNames: JSON.stringify(
        conversation.participants.map((p) => p.name)
      ),
      groupName: conversation.groupName,
      groupAvatar: conversation.groupAvatar,
      lastMessageContent: conversation.lastMessage.content,
      lastMessageTime: conversation.lastMessage.timestamp,
      lastMessageSenderName: conversation.lastMessage.senderName,
      unreadCount: conversation.unreadCount,
      isPinned: conversation.isPinned,
      isMuted: conversation.isMuted,
      isPrivate: conversation.isPrivate,
      key: conversation.key,
      // NEW: Shop/Team Context
      shopId: conversation.shopId,
      scope: conversation.scope,
      tags: conversation.tags ? JSON.stringify(conversation.tags) : undefined,
      isReadOnly: conversation.isReadOnly,
      memberPubkeys: conversation.memberPubkeys
        ? JSON.stringify(conversation.memberPubkeys)
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.chatConversations.put(record);
  }

  async function loadMessagesForConversation(
    conversationId: string
  ): Promise<ChatMessage[]> {
    try {
      const records = await db.chatMessages
        .where("conversationId")
        .equals(conversationId)
        .sortBy("timestamp");
      return records.map((r) => ({
        id: r.id,
        conversationId: r.conversationId,
        senderPubkey: r.senderPubkey,
        senderName: r.senderName,
        senderAvatar: r.senderAvatar,
        recipientPubkey: r.recipientPubkey,
        content: r.content,
        timestamp: r.timestamp,
        status: r.status,
        replyToId: r.replyToId,
        nostrEventId: r.nostrEventId,
      }));
    } catch (e) {
      console.error("[Chat] Failed to load messages:", e);
      return [];
    }
  }

  async function saveMessageToLocal(message: ChatMessage): Promise<void> {
    const record: ChatMessageRecord = {
      id: message.id,
      conversationId: message.conversationId,
      senderPubkey: message.senderPubkey,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      recipientPubkey: message.recipientPubkey,
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      replyToId: message.replyToId,
      nostrEventId: message.nostrEventId,
      isEncrypted: true,
      synced: !!message.nostrEventId,
    };
    await db.chatMessages.put(record);
  }

  // ============================================
  // Crypto Operations
  // ============================================

  const generateChannelKey = (): string => {
    return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
  };

  const encryptChannelMessage = (content: string, key: string): string => {
    return CryptoJS.AES.encrypt(content, key).toString();
  };

  const decryptChannelMessage = (encrypted: string, key: string): string => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("[Chat] Failed to decrypt channel message", e);
      return "[Encrypted Message]";
    }
  };

  // ============================================
  // Nostr Operations
  // ============================================

  async function encryptMessage(
    content: string,
    recipientPubkey: string
  ): Promise<string> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      throw new Error(
        "No private key available for encryption. Please login with your nsec key."
      );
    }

    const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
    const privateKey = hexToBytes(privateKeyHex);
    return await nip04.encrypt(privateKey, recipientPubkey, content);
  }

  async function decryptMessage(
    encryptedContent: string,
    senderPubkey: string
  ): Promise<string> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      throw new Error(
        "No private key available for decryption. Please login with your nsec key."
      );
    }

    const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
    const privateKey = hexToBytes(privateKeyHex);
    return await nip04.decrypt(privateKey, senderPubkey, encryptedContent);
  }

  async function sendMessage(
    recipientPubkey: string,
    content: string,
    recipientName: string,
    replyToId?: string
  ): Promise<boolean> {
    const keys = getUserKeys();
    const currentUser = usersStore.currentUser.value;

    if (!keys?.pubkey || !keys?.privkey) {
      console.error(
        "[Chat] Current user has no Nostr private key. Please login with nsec."
      );
      return false;
    }

    isSending.value = true;
    const conversationId = generateConversationId(keys.pubkey, recipientPubkey);
    const messageId = generateMessageId();

    // Create message object
    const message: ChatMessage = {
      id: messageId,
      conversationId,
      senderPubkey: keys.pubkey,
      senderName: currentUser?.name || "Me",
      senderAvatar: currentUser?.avatar,
      recipientPubkey,
      content,
      timestamp: Date.now(),
      status: "sending",
      replyToId,
    };

    // Add to local state immediately (optimistic update)
    const currentMessages = messages.value.get(conversationId) || [];
    messages.value.set(conversationId, [...currentMessages, message]);

    // Save to local DB
    await saveMessageToLocal(message);

    try {
      // Encrypt and send via Nostr
      const encryptedContent = await encryptMessage(content, recipientPubkey);

      // Publish encrypted DM via Nostr relay
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const eventTemplate = {
        kind: 4, // NIP-04 encrypted DM
        content: encryptedContent,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", recipientPubkey]],
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);

      // Wait for at least one relay to confirm
      await Promise.race(pubs).catch(() => null);

      // Use the signed event ID since we know it was successfully signed
      if (signedEvent) {
        // Update message status
        message.status = "sent";
        message.nostrEventId = signedEvent.id;
        await saveMessageToLocal(message);

        // Update in state
        const msgs = messages.value.get(conversationId) || [];
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          msgs[idx] = message;
          messages.value.set(conversationId, [...msgs]);
        }

        // Update or create conversation
        await updateConversationWithMessage(
          conversationId,
          recipientPubkey,
          recipientName,
          message
        );

        console.log("[Chat] Message sent successfully");
        isSending.value = false;
        return true;
      }
    } catch (e) {
      console.error("[Chat] Failed to send message:", e);
      message.status = "failed";
      await saveMessageToLocal(message);
    }

    isSending.value = false;
    return false;
  }

  async function updateConversationWithMessage(
    conversationId: string,
    otherPubkey: string,
    otherName: string,
    message: ChatMessage,
    type: "direct" | "channel" = "direct",
    channelName?: string
  ): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    const existingConv = conversations.value.find(
      (c) => c.id === conversationId
    );

    if (existingConv) {
      existingConv.lastMessage = {
        content: message.content,
        timestamp: message.timestamp,
        senderName: message.senderName,
      };
      await saveConversationToLocal(existingConv);
    } else {
      // Create new conversation
      const newConversation: ChatConversation = {
        id: conversationId,
        type,
        participants:
          type === "direct"
            ? [
                {
                  pubkey: currentUser!.pubkeyHex!,
                  name: currentUser!.name,
                  avatar: currentUser!.avatar,
                },
                { pubkey: otherPubkey, name: otherName },
              ]
            : [], // Channels don't track all participants in this list usually, or we add creator
        groupName: channelName,
        lastMessage: {
          content: message.content,
          timestamp: message.timestamp,
          senderName: message.senderName,
        },
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
      };
      conversations.value.unshift(newConversation);
      await saveConversationToLocal(newConversation);
    }
  }

  // ============================================
  // Shop Context & Filtering
  // ============================================

  /**
   * Get channels for a specific shop
   */
  const getShopChannels = (shopId: string): ChatConversation[] => {
    return conversations.value.filter(
      (c) => c.type === "channel" && c.scope === "shop" && c.shopId === shopId
    );
  };

  /**
   * Get company-wide channels
   */
  const getCompanyChannels = (): ChatConversation[] => {
    return conversations.value.filter(
      (c) => c.type === "channel" && c.scope === "company"
    );
  };

  /**
   * Get department channels
   */
  const getDepartmentChannels = (department: string): ChatConversation[] => {
    return conversations.value.filter(
      (c) =>
        c.type === "channel" &&
        c.scope === "department" &&
        c.tags?.includes(department)
    );
  };

  /**
   * Check if current user can access a channel
   */
  const canAccessChannel = (channelId: string): boolean => {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel) return false;

    // Public channels are accessible to all
    if (!channel.isPrivate) return true;

    // For private channels, check member list
    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    if (!currentPubkey) return false;

    return channel.memberPubkeys?.includes(currentPubkey) || false;
  };

  /**
   * Add member to private channel
   */
  async function addChannelMember(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel || !channel.isPrivate) return false;

    // Add to member list if not already present
    if (!channel.memberPubkeys) {
      channel.memberPubkeys = [];
    }

    if (!channel.memberPubkeys.includes(pubkey)) {
      channel.memberPubkeys.push(pubkey);
      await saveConversationToLocal(channel);
      return true;
    }

    return false;
  }

  /**
   * Remove member from private channel
   */
  async function removeChannelMember(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel || !channel.isPrivate) return false;

    if (channel.memberPubkeys) {
      const index = channel.memberPubkeys.indexOf(pubkey);
      if (index > -1) {
        channel.memberPubkeys.splice(index, 1);
        await saveConversationToLocal(channel);
        return true;
      }
    }

    return false;
  }

  /**
   * Get channel members
   */
  const getChannelMembers = (channelId: string): string[] => {
    const channel = conversations.value.find((c) => c.id === channelId);
    return channel?.memberPubkeys || [];
  };

  // ============================================
  // Channel Operations
  // ============================================

  async function createChannel(
    name: string,
    about: string = "",
    isPrivate: boolean = false,
    shopId?: string,
    scope: "shop" | "company" | "department" = "company",
    tags: string[] = []
  ): Promise<string | null> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      console.error("[Chat] No private key to create channel");
      return null;
    }

    try {
      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const secretKey = isPrivate ? generateChannelKey() : undefined;

      const content = {
        name,
        about,
        picture: "",
        isPrivate, // Custom field to indicate privacy
        shopId, // NEW: Shop context
        scope, // NEW: Visibility scope
        tags, // NEW: Categorization tags
      };

      const eventTemplate = {
        kind: 40, // NIP-28 Channel Creation
        content: JSON.stringify(content),
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);

      if (signedEvent) {
        // Create local conversation for the new channel
        const conversationId = signedEvent.id;
        const currentPubkey = usersStore.currentUser.value?.pubkeyHex;

        const newConversation: ChatConversation = {
          id: conversationId,
          type: "channel",
          participants: [],
          groupName: name,
          lastMessage: {
            content: "Channel created",
            timestamp: Date.now(),
            senderName: "System",
          },
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isPrivate,
          key: secretKey,
          // NEW: Shop/Team Context
          shopId,
          scope,
          tags,
          isReadOnly: false,
          memberPubkeys: isPrivate && currentPubkey ? [currentPubkey] : [], // Add creator to private channel
        };
        conversations.value.unshift(newConversation);
        await saveConversationToLocal(newConversation);

        // NEW: Sync to Nostr if team mode and not a DM
        if (
          company.isCompanyCodeEnabled.value &&
          newConversation.type !== "direct"
        ) {
          try {
            await nostrData.saveConversation({
              id: newConversation.id,
              type: newConversation.type,
              groupName: newConversation.groupName,
              groupAvatar: newConversation.groupAvatar,
              shopId: newConversation.shopId,
              scope: newConversation.scope,
              tags: newConversation.tags,
              isReadOnly: newConversation.isReadOnly,
              memberPubkeys: newConversation.memberPubkeys,
              isPrivate: newConversation.isPrivate,
            });
            console.log("[Chat] Team conversation synced to Nostr:", name);
          } catch (err) {
            console.warn("[Chat] Failed to sync conversation to Nostr:", err);
          }
        }

        return conversationId;
      }
    } catch (e) {
      console.error("[Chat] Failed to create channel:", e);
    }
    return null;
  }

  async function inviteToChannel(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const conv = conversations.value.find((c) => c.id === channelId);
    if (!conv || !conv.isPrivate || !conv.key) {
      console.error(
        "[Chat] Cannot invite: Channel not found, not private, or missing key"
      );
      return false;
    }

    // We send the key securely via DM (Kind 4)
    const inviteContent = JSON.stringify({
      type: "channel_invite",
      channelId: conv.id,
      channelName: conv.groupName,
      key: conv.key,
    });

    return await sendMessage(pubkey, inviteContent, "User"); // This sends Kind 4
  }

  async function sendChannelMessage(
    channelId: string,
    content: string
  ): Promise<boolean> {
    const keys = getUserKeys();
    const currentUser = usersStore.currentUser.value;

    if (!keys?.privkey) return false;

    const conv = conversations.value.find((c) => c.id === channelId);
    let finalContent = content;

    if (conv?.isPrivate && conv.key) {
      finalContent = encryptChannelMessage(content, conv.key);
    }

    isSending.value = true;
    const messageId = generateMessageId();

    const message: ChatMessage = {
      id: messageId,
      conversationId: channelId,
      senderPubkey: keys.pubkey,
      senderName: currentUser?.name || "Me",
      senderAvatar: currentUser?.avatar,
      recipientPubkey: "", // Public channel
      content: content, // We store decrypted locally
      timestamp: Date.now(),
      status: "sending",
    };

    // Optimistic update
    const currentMessages = messages.value.get(channelId) || [];
    messages.value.set(channelId, [...currentMessages, message]);
    await saveMessageToLocal(message);

    try {
      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      // Use NIP-29 kind 9 for better cross-client compatibility
      const tags: string[][] = [
        ["h", channelId], // NIP-29: group/channel reference
        ["e", channelId, "", "root"], // Backward compatibility
      ];

      // Add company code hash for team filtering (CRITICAL!)
      if (company.companyCodeHash.value) {
        tags.push(["c", company.companyCodeHash.value]);
        console.log(
          "[Chat] Publishing message with company code:",
          company.companyCodeHash.value.slice(0, 8)
        );
      } else {
        console.warn("[Chat] No company code hash - message may not sync!");
      }

      const eventTemplate = {
        kind: 9, // NIP-29 Group Chat Message (better compatibility)
        content: finalContent,
        created_at: Math.floor(Date.now() / 1000),
        tags,
      };

      console.log("[Chat] Publishing message:", {
        kind: eventTemplate.kind,
        channelId,
        hasCompanyCode: !!company.companyCodeHash.value,
      });

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);

      if (signedEvent) {
        console.log("[Chat] Message published successfully:", signedEvent.id);
        message.status = "sent";
        message.nostrEventId = signedEvent.id;
        await saveMessageToLocal(message);

        // Update conversation last message
        await updateConversationWithMessage(
          channelId,
          "",
          "", // No specific recipient for channel
          message,
          "channel"
        );
        isSending.value = false;
        return true;
      }
    } catch (e) {
      console.error("[Chat] Failed to send channel message:", e);
      message.status = "failed";
      await saveMessageToLocal(message);
    }

    isSending.value = false;
    return false;
  }

  // ============================================
  // Real-time Subscription
  // ============================================

  async function subscribeToMessages(): Promise<void> {
    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    if (!currentPubkey || !$nostr?.pool) return;

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    // Filter 1: DMs to me
    const dmFilter = {
      kinds: [4],
      "#p": [currentPubkey],
      since: Math.floor(Date.now() / 1000) - 86400,
    };

    //Filter 2: Team Channels (with company code hash)
    const filters: any[] = [dmFilter];

    // If team mode, subscribe to team channel messages
    if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
      // Primary filter: by company code tag (for relays that support #c)
      const teamChannelFilter = {
        kinds: [9, 40, 42], // NIP-29 (kind 9) + NIP-28 (40, 42) for compatibility
        "#c": [company.companyCodeHash.value], // Filter by company code
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(teamChannelFilter);

      // Fallback filter: subscribe to all kind 9 messages (for relays that don't support #c)
      // This catches all group messages and we filter by company code in handleIncomingMessage
      const fallbackChannelFilter = {
        kinds: [9],
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(fallbackChannelFilter);

      console.log("[Chat] Subscribing to team channels:", {
        kinds: [9, 40, 42],
        companyCodeHash: company.companyCodeHash.value.slice(0, 8),
        hasFallback: true,
      });
    } else {
      // Solo mode: subscribe to all public channels
      const channelFilter = {
        kinds: [9, 40, 42],
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(channelFilter);
      console.log("[Chat] Subscribing to public channels (solo mode)");
    }

    chatSubscription = $nostr.pool.subscribeMany(relayUrls, filters, {
      async onevent(event: NostrEvent) {
        await handleIncomingMessage(event);
      },
      oneose() {
        console.log("[Chat] Subscription established");
      },
    });
  }

  async function handleIncomingMessage(event: NostrEvent): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex) return;

    // Check if we already have this message/event
    const existingMsg =
      (await db.chatMessages.where("nostrEventId").equals(event.id).first()) ||
      (await db.chatConversations.where("id").equals(event.id).first()); // Check conv ID for kind 40 too
    if (existingMsg) {
      console.log("[Chat] Duplicate event, ignoring");
      return;
    }

    try {
      // HANDLE GROUP CHAT MESSAGE (Kind 9 - NIP-29)
      if (event.kind === 9) {
        // Skip if it's my own message
        if (event.pubkey === currentUser.pubkeyHex) {
          console.log("[Chat] Own message, ignoring");
          return;
        }

        // Verify company code if in team mode (fallback filter may include unwanted messages)
        if (
          company.isCompanyCodeEnabled.value &&
          company.companyCodeHash.value
        ) {
          const messageCompanyCode = event.tags.find((t) => t[0] === "c")?.[1];
          if (messageCompanyCode !== company.companyCodeHash.value) {
            return; // Silently ignore messages from different companies
          }
        }

        const channelId =
          event.tags.find((t) => t[0] === "h")?.[1] ||
          event.tags.find((t) => t[0] === "e")?.[1];

        if (!channelId) {
          console.warn("[Chat] Kind 9 message without channel ID");
          return;
        }

        const conversation = conversations.value.find(
          (c) => c.id === channelId
        );
        if (!conversation) {
          console.warn("[Chat] Channel not found:", channelId);
          return;
        }

        // Parse message content
        let content = event.content;
        try {
          const parsed = JSON.parse(event.content);
          content = parsed.content || event.content;
        } catch {
          // Content is plain text
        }

        // Get sender info
        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );

        const newMessage: ChatMessage = {
          id: event.id,
          conversationId: channelId,
          senderPubkey: event.pubkey,
          senderName: sender?.name || "Unknown",
          senderAvatar: sender?.avatar,
          recipientPubkey: "",
          content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
        };

        // Add to messages
        const currentMessages = messages.value.get(channelId) || [];
        messages.value.set(channelId, [...currentMessages, newMessage]);
        await saveMessageToLocal(newMessage);

        // Update conversation
        conversation.lastMessage = {
          content,
          timestamp: newMessage.timestamp,
          senderName: newMessage.senderName,
        };
        conversation.unreadCount += 1;
        await saveConversationToLocal(conversation);

        // Play sound
        sound.playNotification();
        console.log("[Chat] ✅ Group message received and displayed");
        return;
      }

      // HANDLE CHANNEL MESSAGE (Kind 42 - Legacy NIP-28)
      if (event.kind === 42) {
        // Skip if it's my own message
        if (event.pubkey === currentUser.pubkeyHex) {
          console.log("[Chat] Own kind 42 message, ignoring");
          return;
        }

        // Try to parse content (may be encrypted or plain text)
        let content = event.content;

        // Check if it's encrypted (starts with specific pattern or has encrypted tag)
        const isEncrypted = event.tags.some(
          (t) => t[0] === "encrypted" && t[1] === "true"
        );

        if (isEncrypted) {
          try {
            content = await decryptMessage(event.content, event.pubkey);
          } catch (e) {
            console.warn(
              "[Chat] Failed to decrypt kind 42 message, using plain text:",
              e
            );
            // Use plain text content as fallback
          }
        }

        // CHECK FOR INVITE
        try {
          const parsed = JSON.parse(content);
          if (
            parsed.type === "channel_invite" &&
            parsed.channelId &&
            parsed.key
          ) {
            // It's an invite!
            // Check if we already have this channel
            let existingConv = conversations.value.find(
              (c) => c.id === parsed.channelId
            );
            if (existingConv) {
              // Update key if missing
              if (!existingConv.key) {
                existingConv.key = parsed.key;
                existingConv.isPrivate = true;
                await saveConversationToLocal(existingConv);
              }
            } else {
              // Create new channel placeholder with key
              const newConv: ChatConversation = {
                id: parsed.channelId,
                type: "channel",
                participants: [],
                groupName: parsed.channelName || "Private Channel",
                lastMessage: {
                  content: "You were invited to this private channel",
                  timestamp: event.created_at * 1000,
                  senderName: "System",
                },
                unreadCount: 1,
                isPinned: false,
                isMuted: false,
                isPrivate: true,
                key: parsed.key,
              };
              conversations.value.unshift(newConv);
              await saveConversationToLocal(newConv);
              sound.playSuccess();
              return; // Stop processing as normal DM
            }
          }
        } catch (e) {
          // Not JSON, continue as normal channel message
        }

        const conversationId = generateConversationId(
          currentUser.pubkeyHex,
          event.pubkey
        );

        // Find sender info
        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );
        const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

        const message: ChatMessage = {
          id: generateMessageId(),
          conversationId,
          senderPubkey: event.pubkey,
          senderName,
          senderAvatar: sender?.avatar,
          recipientPubkey: currentUser.pubkeyHex,
          content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
        };

        await saveMessageToLocal(message);

        // Update state
        const currentMessages = messages.value.get(conversationId) || [];
        messages.value.set(conversationId, [...currentMessages, message]);

        await updateConversationWithMessage(
          conversationId,
          event.pubkey,
          senderName,
          message
        );

        // Notify
        if (activeConversationId.value !== conversationId) {
          const conv = conversations.value.find((c) => c.id === conversationId);
          if (conv && !conv.isMuted) {
            conv.unreadCount++;
            await saveConversationToLocal(conv);
            sound.playNotification();

            if (!isOpen.value) {
              const toast = useToast();
              toast.add({
                title: senderName,
                description:
                  message.content.length > 60
                    ? message.content.substring(0, 60) + "..."
                    : message.content,
                icon: "i-heroicons-chat-bubble-left-right",
                timeout: 5000,
                click: () => {
                  openChat();
                  selectConversation(conversationId);
                },
              });
            }
          }
        }
      }
      // HANDLE CHANNEL CREATION (Kind 40)
      else if (event.kind === 40) {
        const content = JSON.parse(event.content);
        const conversationId = event.id;

        const newConversation: ChatConversation = {
          id: conversationId,
          type: "channel",
          participants: [],
          groupName: content.name || "Unnamed Channel",
          lastMessage: {
            content: content.about || "Channel created",
            timestamp: event.created_at * 1000,
            senderName: "System",
          },
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isPrivate: content.isPrivate || false,
        };

        // Check if exists (might be loaded from local)
        const existing = conversations.value.find(
          (c) => c.id === conversationId
        );
        if (!existing) {
          conversations.value.unshift(newConversation);
          await saveConversationToLocal(newConversation);
        } else {
          // Update metadata if it exists
          if (content.isPrivate !== undefined)
            existing.isPrivate = content.isPrivate;
          await saveConversationToLocal(existing);
        }
      }
      // HANDLE CHANNEL MESSAGE (Kind 42)
      else if (event.kind === 42) {
        const rootTag =
          event.tags.find((t) => t[0] === "e" && t[3] === "root") ||
          event.tags.find((t) => t[0] === "e");

        if (!rootTag || !rootTag[1]) return;
        const channelId = rootTag[1];

        // Ensure we know about this channel
        let conv = conversations.value.find((c) => c.id === channelId);

        if (!conv) {
          // Placeholder creation if we missed Kind 40
          conv = {
            id: channelId,
            type: "channel",
            participants: [],
            groupName: "Unknown Channel",
            lastMessage: {
              content: "",
              timestamp: 0,
              senderName: "",
            },
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
          };
          conversations.value.unshift(conv);
          // We should ideally fetch channel metadata here
        }

        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );
        const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

        let content = event.content;
        // Decrypt if private
        if (conv.isPrivate && conv.key) {
          content = decryptChannelMessage(event.content, conv.key);
        } else if (conv.isPrivate && !conv.key) {
          content = "🔒 Encrypted Message (Key missing)";
        }

        const message: ChatMessage = {
          id: generateMessageId(),
          conversationId: channelId,
          senderPubkey: event.pubkey,
          senderName,
          senderAvatar: sender?.avatar,
          recipientPubkey: "",
          content: content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
        };

        await saveMessageToLocal(message);

        // Update memory
        const currentMessages = messages.value.get(channelId) || [];
        messages.value.set(channelId, [...currentMessages, message]);

        await updateConversationWithMessage(
          channelId,
          "",
          "",
          message,
          "channel",
          conv.groupName
        );

        // Notify
        if (
          activeConversationId.value !== channelId &&
          event.pubkey !== currentUser.pubkeyHex &&
          !conv.isMuted
        ) {
          conv.unreadCount++;
          await saveConversationToLocal(conv);
          sound.playNotification();

          if (!isOpen.value) {
            const toast = useToast();
            toast.add({
              title: `#${conv.groupName} - ${senderName}`,
              description:
                message.content.length > 60
                  ? message.content.substring(0, 60) + "..."
                  : message.content,
              icon: "i-heroicons-hashtag",
              timeout: 5000,
              click: () => {
                openChat();
                selectConversation(channelId);
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("[Chat] Failed to process incoming message:", e);
    }
  }

  async function selectConversation(conversationId: string): Promise<void> {
    activeConversationId.value = conversationId;

    // Load messages if not cached
    if (!messages.value.has(conversationId)) {
      const msgs = await loadMessagesForConversation(conversationId);
      messages.value.set(conversationId, msgs);
    }

    // Mark as read
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      await saveConversationToLocal(conv);
    }
  }

  async function startNewChat(contact: ChatContact): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex) return;

    const conversationId = generateConversationId(
      currentUser.pubkeyHex,
      contact.pubkey
    );

    // Check if conversation already exists
    const existing = conversations.value.find((c) => c.id === conversationId);
    if (existing) {
      await selectConversation(conversationId);
      return;
    }

    // Create new conversation
    const newConversation: ChatConversation = {
      id: conversationId,
      type: "direct",
      participants: [
        {
          pubkey: currentUser.pubkeyHex,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        { pubkey: contact.pubkey, name: contact.name, avatar: contact.avatar },
      ],
      lastMessage: {
        content: "",
        timestamp: Date.now(),
        senderName: "",
      },
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
    };

    conversations.value.unshift(newConversation);
    await saveConversationToLocal(newConversation);
    await selectConversation(conversationId);
  }

  async function togglePinConversation(conversationId: string): Promise<void> {
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) {
      conv.isPinned = !conv.isPinned;
      await saveConversationToLocal(conv);
    }
  }

  async function toggleMuteConversation(conversationId: string): Promise<void> {
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) {
      conv.isMuted = !conv.isMuted;
      await saveConversationToLocal(conv);
    }
  }

  async function deleteConversation(conversationId: string): Promise<void> {
    // Delete from DB
    await db.chatConversations.delete(conversationId);
    await db.chatMessages
      .where("conversationId")
      .equals(conversationId)
      .delete();

    // Remove from state
    conversations.value = conversations.value.filter(
      (c) => c.id !== conversationId
    );
    messages.value.delete(conversationId);

    if (activeConversationId.value === conversationId) {
      activeConversationId.value = null;
    }
  }

  // ============================================
  // Initialize
  // ============================================

  /**
   * Sync team conversations from Nostr
   * Fetches channel metadata and updates existing conversations
   */
  async function syncConversations(): Promise<void> {
    if (!company.isCompanyCodeEnabled.value || !company.companyCodeHash.value) {
      // Solo mode: only local conversations
      return;
    }

    try {
      // Query team conversations by company code hash
      const teamConversations = await nostrData.getAllConversations({
        companyCodeHash: company.companyCodeHash.value,
      });

      console.log(
        `[Chat] Found ${teamConversations.length} team conversations from Nostr`
      );

      // Merge with local conversations
      for (const conv of teamConversations) {
        const existingIndex = conversations.value.findIndex(
          (c) => c.id === conv.id
        );

        if (existingIndex >= 0) {
          // UPDATE existing conversation metadata (fixes "Unknown Channel")
          const existing = conversations.value[existingIndex]!;
          if (conv.groupName && existing.groupName !== conv.groupName) {
            existing.groupName = conv.groupName;
            existing.groupAvatar = conv.groupAvatar;
            existing.scope = conv.scope;
            existing.tags = conv.tags;
            await saveConversationToLocal(existing);
            console.log(
              `[Chat] Updated conversation metadata: ${conv.groupName}`
            );
          }
        } else {
          // ADD new conversation
          const newConv: ChatConversation = {
            id: conv.id,
            type: conv.type,
            participants: [],
            groupName: conv.groupName || "Unknown Channel",
            groupAvatar: conv.groupAvatar,
            lastMessage: {
              content: "Channel synced from team",
              timestamp: Date.now(),
              senderName: "System",
            },
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            isPrivate: false,
            shopId: conv.shopId,
            scope: conv.scope,
            tags: conv.tags,
            isReadOnly: conv.isReadOnly,
            memberPubkeys: conv.memberPubkeys,
          };
          conversations.value.push(newConv);
          await saveConversationToLocal(newConv);
          console.log(
            "[Chat] Synced new team conversation:",
            conv.groupName || conv.id
          );
        }
      }
    } catch (e) {
      console.error("[Chat] Failed to sync conversations:", e);
    }
  }

  /**
   * Subscribe to real-time conversation updates
   * Replaces setInterval polling with efficient Nostr subscription
   */
  let conversationSubscription: { close: () => void } | null = null;

  async function subscribeToConversations(): Promise<void> {
    if (!company.isCompanyCodeEnabled.value || !company.companyCodeHash.value) {
      return;
    }

    if (!$nostr?.pool) {
      console.warn(
        "[Chat] Nostr pool not available for conversation subscription"
      );
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    // Subscribe to team channel updates (kind 30900)
    const conversationFilter = {
      kinds: [30900], // CHAT_CHANNEL from nostr-kinds
      "#c": [company.companyCodeHash.value],
      since: Math.floor(Date.now() / 1000),
    };

    console.log("[Chat] Subscribing to real-time conversation updates");

    conversationSubscription = $nostr.pool.subscribeMany(
      relayUrls,
      [conversationFilter],
      {
        async onevent(event: NostrEvent) {
          try {
            // Parse conversation from event
            const data = JSON.parse(event.content);
            const existingIndex = conversations.value.findIndex(
              (c) => c.id === data.id
            );

            if (existingIndex >= 0) {
              // Update existing
              const existing = conversations.value[existingIndex]!;
              existing.groupName = data.groupName || existing.groupName;
              existing.groupAvatar = data.groupAvatar;
              existing.scope = data.scope;
              existing.tags = data.tags;
              await saveConversationToLocal(existing);
              console.log(`[Chat] Real-time update: ${data.groupName}`);
            } else {
              // Add new conversation
              const newConv: ChatConversation = {
                id: data.id,
                type: data.type || "channel",
                participants: [],
                groupName: data.groupName || "Unknown Channel",
                groupAvatar: data.groupAvatar,
                lastMessage: {
                  content: "Channel created",
                  timestamp: Date.now(),
                  senderName: "System",
                },
                unreadCount: 0,
                isPinned: false,
                isMuted: false,
                isPrivate: data.isPrivate || false,
                shopId: data.shopId,
                scope: data.scope,
                tags: data.tags,
                isReadOnly: data.isReadOnly,
                memberPubkeys: data.memberPubkeys,
              };
              conversations.value.push(newConv);
              await saveConversationToLocal(newConv);
              console.log(`[Chat] Real-time new channel: ${data.groupName}`);
            }
          } catch (e) {
            console.warn("[Chat] Failed to process conversation event:", e);
          }
        },
        oneose() {
          console.log("[Chat] Conversation subscription established");
        },
      }
    );
  }

  async function init(): Promise<void> {
    isLoading.value = true;
    try {
      await loadConversationsFromLocal();

      // NEW: Initial sync + real-time subscription (NO setInterval!)
      if (company.isCompanyCodeEnabled.value) {
        await syncConversations();
        await subscribeToConversations(); // Real-time updates!
      }

      await subscribeToMessages();
      console.log("[Chat] Initialized successfully");
    } catch (e) {
      console.error("[Chat] Failed to initialize:", e);
    }
    isLoading.value = false;
  }

  function cleanup(): void {
    if (chatSubscription) {
      chatSubscription.close();
      chatSubscription = null;
    }
    if (conversationSubscription) {
      conversationSubscription.close();
      conversationSubscription = null;
    }
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    conversations,
    messages,
    activeConversationId,
    isLoading,
    isSending,
    isOpen,
    searchQuery,
    typingUsers,

    // Computed
    unreadCount,
    activeConversation,
    activeMessages,
    filteredConversations,
    sortedConversations,
    availableContacts,

    // Functions
    init,
    cleanup,
    openChat,
    closeChat,
    toggleChat,
    startNewChat,
    sendMessage,
    createChannel,
    sendChannelMessage,
    inviteToChannel,
    selectConversation,
    deleteConversation,
    togglePinConversation,
    toggleMuteConversation,

    // NEW: Shop Context & Filtering
    getShopChannels,
    getCompanyChannels,
    getDepartmentChannels,
    canAccessChannel,
    addChannelMember,
    removeChannelMember,
    getChannelMembers,

    // Utilities
    generateConversationId,
  };
}
