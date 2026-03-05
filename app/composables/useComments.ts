import type { Event, Filter } from "nostr-tools";
import type { PmComment } from "~/types/project-manager";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Use global module state so all components share the same comments record without re-fetching everything
const globalComments = ref<Record<string, PmComment[]>>({});
const isLoadingComments = ref(false);

export const useComments = () => {
  const { queryEvents, publishEvent } = useNostrRelay();
  const { createEvent } = useNostrData();
  const { user } = useNostrUser();
  const toast = useToast();

  const commentsByIssue = globalComments;
  const isLoading = isLoadingComments;

  /**
   * Helper to parse nostr-tools Event into a PmComment interface
   */
  const parseCommentEvent = (event: Event): PmComment => {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || event.id || ""; // Fallback to raw ID for non-replaceable

    // Find the issue this comment belongs to (`e` tag referencing PM_ISSUE)
    const issueTag = event.tags.find((t) => t[0] === "e" || t[0] === "a");
    const issueId = issueTag ? issueTag[1] : "";

    return {
      id: dTag,
      issueId,
      content: event.content,
      authorPubkey: event.pubkey,
      createdAt: event.created_at,
      updatedAt: event.created_at,
      event: event as any,
    };
  };

  /**
   * Fetch all comments for a specific issue
   */
  const fetchCommentsForIssue = async (issueId: string) => {
    isLoading.value = true;
    try {
      const filter: Filter = {
        kinds: [NOSTR_KINDS.PM_COMMENT],
        "#e": [issueId], // Find all comments tagged with this issue ID
      };

      const events = await queryEvents(filter);

      const parsed: PmComment[] = events.map(parseCommentEvent);

      // Sort chronological (oldest first, typical for comment threads)
      parsed.sort((a, b) => a.createdAt - b.createdAt);

      // Assign to the reactive state map
      commentsByIssue.value[issueId] = parsed;
    } catch (e) {
      console.error("Failed to fetch comments", e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Post a new comment to an issue
   */
  const postComment = async (issueId: string, content: string) => {
    try {
      const pubkey = user.value?.pubkey;
      if (!pubkey) throw new Error("Not authenticated");
      if (!content.trim()) return;

      // Compile tags
      const tags: string[][] = [];
      // Tag the parent issue explicitly using NIP-10 convention or standard 'e' tag
      tags.push(["e", issueId, "", "reply"]);
      // Also tag the project ID to allow sweeping garbage collection later? Skipped for simplicity currently.

      // We explicitly make comments regular events (or parameterized if we want editing later)
      // We will just use `createEvent` which handles signing
      const signedEvent = await createEvent(
        NOSTR_KINDS.PM_COMMENT,
        content,
        tags,
      );

      if (!signedEvent) {
        throw new Error("Failed to sign comment event");
      }

      await publishEvent(signedEvent as Event);

      // Optimistically update list
      const updated = parseCommentEvent(signedEvent as Event);
      if (!commentsByIssue.value[issueId]) {
        commentsByIssue.value[issueId] = [];
      }
      commentsByIssue.value[issueId].push(updated); // Appended to end

      return updated;
    } catch (e) {
      console.error("Failed to post comment", e);
      toast.add({
        title: "Error",
        description: "Failed to post your comment",
        color: "red",
      });
      throw e;
    }
  };

  /**
   * Helper to get comments for a specific ID synchronously from state
   */
  const getComments = (issueId: string) => {
    return commentsByIssue.value[issueId] || [];
  };

  return {
    commentsByIssue,
    isLoading,
    getComments,
    fetchCommentsForIssue,
    postComment,
  };
};
