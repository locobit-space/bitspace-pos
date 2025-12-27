/**
 * Feedback System Composable
 * Submit bug reports and feature requests via Nostr DM
 */

export type FeedbackType = "bug" | "feature" | "question";
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

export interface FeedbackSubmission {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  page?: string;
  deviceInfo?: string;
  appVersion?: string;
  screenshot?: string; // base64
  createdAt: string;
  status: "pending" | "sent" | "failed";
  nostrEventId?: string;
}

const FEEDBACK_STORAGE_KEY = "bitspace_feedback_history";
const DEVELOPER_NPUB_KEY = "bitspace_developer_npub";

export function useFeedback() {
  const config = useRuntimeConfig();
  const route = useRoute();
  const toast = useToast();
  const { t } = useI18n();

  const isModalOpen = useState<boolean>("isModalOpen", () => false);
  const isSubmitting = useState<boolean>("isSubmitting", () => false);
  const feedbackHistory = useState<FeedbackSubmission[]>(
    "feedbackHistory",
    () => []
  );
  const feedbackType = useState<FeedbackType>("feedbackType", () => "bug");

  // Get developer npub from config or localStorage
  const developerNpub = computed(() => {
    if (import.meta.client) {
      return (
        localStorage.getItem(DEVELOPER_NPUB_KEY) ||
        config.public?.developerNpub ||
        ""
      );
    }
    return "";
  });

  // Get app version
  const appVersion = computed(() => {
    return config.public?.appVersion || "1.0.0";
  });

  /**
   * Get device info string
   */
  function getDeviceInfo(): string {
    if (!import.meta.client) return "Unknown";

    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Detect browser
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    // Detect OS
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  }

  /**
   * Load feedback history from localStorage
   */
  function loadHistory(): void {
    if (!import.meta.client) return;

    try {
      const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (saved) {
        feedbackHistory.value = JSON.parse(saved);
      }
    } catch (e) {
      console.error("[Feedback] Failed to load history:", e);
    }
  }

  /**
   * Save feedback history
   */
  function saveHistory(): void {
    if (!import.meta.client) return;

    try {
      localStorage.setItem(
        FEEDBACK_STORAGE_KEY,
        JSON.stringify(feedbackHistory.value)
      );
    } catch (e) {
      console.error("[Feedback] Failed to save history:", e);
    }
  }

  /**
   * Generate unique ID
   */
  function generateId(): string {
    return `fb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Submit feedback via Nostr DM
   */
  async function submitFeedback(data: {
    type: FeedbackType;
    title: string;
    description: string;
    priority?: FeedbackPriority;
    screenshot?: string;
  }): Promise<boolean> {
    if (!developerNpub.value) {
      toast.add({
        title: t("feedback.noDeveloperNpub") || "Configuration Error",
        description:
          t("feedback.noDeveloperNpubDesc") ||
          "Developer contact not configured",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
      return false;
    }

    isSubmitting.value = true;

    const submission: FeedbackSubmission = {
      id: generateId(),
      type: data.type,
      title: data.title,
      description: data.description,
      priority: data.priority,
      page: route.path,
      deviceInfo: getDeviceInfo(),
      appVersion: appVersion.value,
      screenshot: data.screenshot,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      // Build message content
      const messageContent = JSON.stringify(
        {
          app: "BitSpace POS",
          version: submission.appVersion,
          type: submission.type,
          title: submission.title,
          description: submission.description,
          priority: submission.priority,
          page: submission.page,
          device: submission.deviceInfo,
          timestamp: submission.createdAt,
          hasScreenshot: !!submission.screenshot,
        },
        null,
        2
      );

      // Try to send via Nostr (NIP-04 encrypted DM)
      const { $nostr } = useNuxtApp();

      if ($nostr) {
        // Convert npub to hex pubkey
        const { decode } = await import("nostr-tools/nip19");
        const decoded = decode(developerNpub.value);

        if (decoded.type !== "npub") {
          throw new Error("Invalid developer npub");
        }

        const devPubkey = decoded.data;

        // Create and send encrypted DM
        const event = await $nostr.sendEncryptedDM(devPubkey, messageContent);

        if (event) {
          submission.status = "sent";
          submission.nostrEventId = event.id;

          toast.add({
            title:
              submission.type === "bug"
                ? t("feedback.bugReported") || "Bug Reported"
                : t("feedback.featureRequested") || "Feature Requested",
            description:
              t("feedback.thankYou") || "Thank you for your feedback!",
            icon: "i-heroicons-check-circle",
            color: "green",
          });
        } else {
          throw new Error("Failed to send DM");
        }
      } else {
        // Fallback: save locally only
        console.warn("[Feedback] Nostr not available, saving locally");
        submission.status = "pending";

        toast.add({
          title: t("feedback.savedLocally") || "Saved Locally",
          description:
            t("feedback.willSendLater") || "Will send when connected",
          icon: "i-heroicons-cloud-arrow-up",
          color: "blue",
        });
      }

      // Add to history
      feedbackHistory.value.unshift(submission);
      saveHistory();

      return true;
    } catch (e) {
      console.error("[Feedback] Failed to submit:", e);

      submission.status = "failed";
      feedbackHistory.value.unshift(submission);
      saveHistory();

      toast.add({
        title: t("feedback.submitFailed") || "Submission Failed",
        description: t("feedback.tryAgainLater") || "Please try again later",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });

      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Open feedback modal
   */
  function openFeedback(type: FeedbackType = "bug") {
    feedbackType.value = type;
    isModalOpen.value = true;
  }

  /**
   * Close feedback modal
   */
  function closeFeedback() {
    isModalOpen.value = false;
  }

  /**
   * Retry failed submissions
   */
  async function retryFailed(): Promise<number> {
    const failed = feedbackHistory.value.filter((f) => f.status === "failed");
    let retried = 0;

    for (const submission of failed) {
      const success = await submitFeedback({
        type: submission.type,
        title: submission.title,
        description: submission.description,
        priority: submission.priority,
        screenshot: submission.screenshot,
      });

      if (success) {
        retried++;
        // Remove old failed entry
        const index = feedbackHistory.value.findIndex(
          (f) => f.id === submission.id
        );
        if (index !== -1) {
          feedbackHistory.value.splice(index, 1);
        }
      }
    }

    saveHistory();
    return retried;
  }

  /**
   * Set developer npub
   */
  function setDeveloperNpub(npub: string): void {
    if (import.meta.client) {
      localStorage.setItem(DEVELOPER_NPUB_KEY, npub);
    }
  }

  // Initialize
  if (import.meta.client) {
    loadHistory();
  }

  return {
    // State
    isModalOpen,
    isSubmitting,
    feedbackHistory,
    feedbackType,
    developerNpub,

    // Methods
    openFeedback,
    closeFeedback,
    submitFeedback,
    retryFailed,
    setDeveloperNpub,
    getDeviceInfo,
  };
}
