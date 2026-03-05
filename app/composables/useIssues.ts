import type { Event, Filter } from "nostr-tools";
import type {
  PmIssue,
  PmIssueStatus,
  PmIssuePriority,
  PmIssueType,
} from "~/types/project-manager";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

const globalIssues = ref<PmIssue[]>([]);
const globalCurrentIssue = ref<PmIssue | null>(null);
const isIssuesLoading = ref(false);

export const useIssues = () => {
  const { queryEvents, publishEvent } = useNostrRelay();
  const { createEvent } = useNostrData();
  const { user } = useNostrUser();
  const toast = useToast();

  const issues = globalIssues;
  const currentIssue = globalCurrentIssue;
  const isLoading = isIssuesLoading;

  /**
   * Helper to parse nostr-tools Event into a PmIssue interface
   */
  const parseIssueEvent = (event: Event): PmIssue => {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || "";
    const nameTag =
      event.tags.find((t) => t[0] === "name")?.[1] ||
      event.tags.find((t) => t[0] === "title")?.[1] ||
      "Untitled Issue";
    const typeTag =
      (event.tags.find((t) => t[0] === "type")?.[1] as PmIssueType) || "task";
    const statusTag =
      (event.tags.find((t) => t[0] === "status")?.[1] as PmIssueStatus) ||
      "todo";
    const priorityTag =
      (event.tags.find((t) => t[0] === "priority")?.[1] as PmIssuePriority) ||
      "medium";

    const pointsTag = event.tags.find((t) => t[0] === "points")?.[1];
    const points = pointsTag ? parseInt(pointsTag, 10) : undefined;

    const eTags = event.tags
      .filter((t) => t[0] === "e" && t[1])
      .map((t) => t[1] as string);
    const pTags = event.tags
      .filter((t) => t[0] === "p" && t[1])
      .map((t) => t[1] as string);
    const tTags = event.tags
      .filter((t) => t[0] === "t" && t[1])
      .map((t) => t[1] as string);

    const projectTag = event.tags.find(
      (t) =>
        (t[0] === "l" || t[0] === "e") &&
        (t[2] === "project" || t[3] === "root"),
    );
    const projectId = projectTag
      ? projectTag[1]
      : event.tags.find((t) => t[0] === "l" || t[0] === "e")?.[1] ||
        eTags[0] ||
        "";

    // We use a NIP-32 label tag like ['l', sprintId, 'sprint'] to define the sprint
    const sprintTag = event.tags.find(
      (t) =>
        (t[0] === "l" || t[0] === "e") &&
        (t[2] === "sprint" || t[3] === "sprint"),
    );
    const sprintId = sprintTag ? sprintTag[1] : undefined;

    const parentTag = event.tags.find(
      (t) =>
        (t[0] === "l" || t[0] === "e") &&
        (t[2] === "parent" || t[3] === "parent"),
    );
    const parentIssueId = parentTag ? parentTag[1] : undefined;

    return {
      id: dTag,
      projectId: projectId || "",
      sprintId,
      title: nameTag,
      description: event.content,
      type: typeTag,
      status: statusTag,
      priority: priorityTag,
      points,
      assignees: pTags,
      labels: tTags,
      reporter: event.pubkey,
      parentIssueId,
      createdAt: event.created_at,
      updatedAt: event.created_at,
      event: event as any, // Cast from raw Event for generic UI store usage
    };
  };

  /**
   * Fetch all issues for a specific project
   */
  const fetchIssuesForProject = async (projectId: string) => {
    isLoading.value = true;
    try {
      const filter: Filter = {
        kinds: [NOSTR_KINDS.PM_ISSUE],
        "#l": [projectId],
      };

      const events = await queryEvents(filter);
      const parsed: PmIssue[] = [];
      events.forEach((event) => {
        parsed.push(parseIssueEvent(event));
      });

      // Simple dedup by D tag in case of multiple versions in cache vs relay
      const uniqueIssues = new Map<string, PmIssue>();
      parsed.forEach((i) => {
        if (
          !uniqueIssues.has(i.id) ||
          i.createdAt > uniqueIssues.get(i.id)!.createdAt
        ) {
          uniqueIssues.set(i.id, i);
        }
      });

      issues.value = Array.from(uniqueIssues.values()).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
    } catch (e) {
      console.error("Failed to fetch issues", e);
      toast.add({
        title: "Error",
        description: "Failed to load issues for this project",
        color: "red",
      });
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Fetch a single issue by its D tag ID
   */
  const fetchIssueById = async (issueId: string) => {
    isLoading.value = true;
    try {
      const filter: Filter = {
        kinds: [NOSTR_KINDS.PM_ISSUE],
        "#d": [issueId],
        limit: 1, // Only need the most recent instance of this D tag
      };

      const events = await queryEvents(filter);

      if (events && events.length > 0) {
        const sorted = events.sort((a, b) => b.created_at - a.created_at);
        if (sorted[0]) {
          currentIssue.value = parseIssueEvent(sorted[0]);
          return currentIssue.value;
        }
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch issue", e);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create or update an issue
   */
  const saveIssue = async (
    issue: Omit<PmIssue, "event" | "createdAt" | "updatedAt" | "reporter">,
  ) => {
    try {
      const pubkey = user.value?.pubkey;
      if (!pubkey) throw new Error("Not authenticated");

      console.log(issue);

      // Tags
      const tags: string[][] = [];
      tags.push(["d", issue.id]);
      tags.push(["name", issue.title]);
      tags.push(["type", issue.type]);
      tags.push(["status", issue.status]);
      if (issue.priority) {
        tags.push(["priority", issue.priority]);
      }
      if (issue.points !== undefined) {
        tags.push(["points", issue.points.toString()]);
      }

      // Project ID (using NIP-32 label tags to bypass strict 32-byte hex validation on e-tags)
      tags.push(["l", issue.projectId, "project"]);

      // Optional tags
      if (issue.sprintId) tags.push(["l", issue.sprintId, "sprint"]);
      if (issue.parentIssueId) tags.push(["l", issue.parentIssueId, "parent"]);

      // Arrays
      issue.assignees.forEach((p) => tags.push(["p", p]));
      issue.labels.forEach((t) => tags.push(["t", t]));

      let signedEvent = await createEvent(
        NOSTR_KINDS.PM_ISSUE,
        issue.description,
        tags,
      );

      console.log(signedEvent);

      if (!signedEvent) {
        throw new Error("Failed to create event");
      }

      const x = await publishEvent(signedEvent);
      console.log(x);

      toast.add({
        title: "Success",
        description: "Issue saved successfully",
        color: "green",
      });

      // Optimistically update list
      const updated = parseIssueEvent(signedEvent as Event);
      const idx = issues.value.findIndex((i) => i.id === updated.id);
      if (idx > -1) {
        issues.value[idx] = updated;
      } else {
        issues.value.unshift(updated);
      }

      if (currentIssue.value?.id === updated.id) {
        currentIssue.value = updated;
      }

      return updated;
    } catch (e) {
      console.error("Failed to save issue", e);
      toast.add({
        title: "Error",
        description: "Failed to save the issue",
        color: "red",
      });
      throw e;
    }
  };

  /**
   * Quick status update (for drag and drop on board)
   */
  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    const existing = issues.value.find((i) => i.id === issueId);
    if (!existing) return;

    // Optimistically update UI immediately
    const oldStatus = existing.status;
    existing.status = newStatus;

    try {
      // Build new event based on existing
      const oldEvent = existing.event as Event;

      // Copy tags but update the specific status tag
      const newTags = [...oldEvent.tags];
      const statusIdx = newTags.findIndex((t) => t[0] === "status");
      if (statusIdx > -1) {
        newTags[statusIdx] = ["status", newStatus]; // Replace tuple specifically instead of inner element map
      } else {
        newTags.push(["status", newStatus]);
      }

      let signedEvent = await createEvent(
        NOSTR_KINDS.PM_ISSUE,
        oldEvent.content,
        newTags,
      );

      if (!signedEvent) {
        throw new Error("Failed to create event");
      }

      await publishEvent(signedEvent as Event);

      // The event object is now updated with the new sig
      existing.event = signedEvent;
      existing.updatedAt = signedEvent.created_at;
    } catch (e) {
      // Revert on failure
      existing.status = oldStatus;
      console.error("Failed to update status", e);
      toast.add({
        title: "Error",
        description: "Failed to move issue",
        color: "red",
      });
    }
  };

  return {
    issues,
    currentIssue,
    isLoading,
    fetchIssuesForProject,
    fetchIssueById,
    saveIssue,
    updateIssueStatus,
  };
};
