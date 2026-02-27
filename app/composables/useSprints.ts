import type { Event, Filter } from "nostr-tools";
import type { PmSprint, PmSprintStatus } from "~/types/project-manager";
import { NOSTR_KINDS } from "~/types/nostr-kinds";
const globalSprints = ref<PmSprint[]>([]);
const isSprintsLoading = ref(false);

export const useSprints = () => {
  const { queryEvents, publishEvent } = useNostrRelay();
  const { createEvent } = useNostrData();
  const { user } = useNostrUser();
  const toast = useToast();

  const sprints = globalSprints;
  const isLoading = isSprintsLoading;

  /**
   * Helper to parse nostr-tools Event into a PmSprint interface
   */
  const parseSprintEvent = (event: Event): PmSprint => {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || "";
    const nameTag =
      event.tags.find((t) => t[0] === "name")?.[1] ||
      event.tags.find((t) => t[0] === "title")?.[1] ||
      "Untitled Sprint";
    const statusTag =
      (event.tags.find((t) => t[0] === "status")?.[1] as PmSprintStatus) ||
      "planned";

    // Time bounds
    const startStr = event.tags.find((t) => t[0] === "start")?.[1];
    const endStr = event.tags.find((t) => t[0] === "end")?.[1];
    const startDate = startStr ? parseInt(startStr) : undefined;
    const endDate = endStr ? parseInt(endStr) : undefined;

    // Project reference using NIP-32 label tags
    const projectTag = event.tags.find(
      (t) =>
        (t[0] === "l" || t[0] === "e") &&
        (t[2] === "project" || t[3] === "root"),
    );
    const projectId = projectTag
      ? projectTag[1]
      : event.tags.find((t) => t[0] === "l" || t[0] === "e")?.[1] || "";

    return {
      id: dTag,
      projectId: projectId || "",
      name: nameTag,
      goal: event.content,
      status: statusTag,
      startDate,
      endDate,
      createdAt: event.created_at,
      updatedAt: event.created_at,
      event: event as any,
    };
  };

  /**
   * Fetch all sprints for a specific project
   */
  const fetchSprintsForProject = async (projectId: string) => {
    isLoading.value = true;
    try {
      const filter: Filter = {
        kinds: [NOSTR_KINDS.PM_SPRINT],
        "#l": [projectId], // Find all sprints referencing this project ID
      };

      const events = await queryEvents(filter);

      const parsed: PmSprint[] = [];
      events.forEach((event) => {
        parsed.push(parseSprintEvent(event));
      });

      // Simple dedup by D tag in case of multiple versions
      const uniqueSprints = new Map<string, PmSprint>();
      parsed.forEach((s) => {
        if (
          !uniqueSprints.has(s.id) ||
          s.createdAt > uniqueSprints.get(s.id)!.createdAt
        ) {
          uniqueSprints.set(s.id, s);
        }
      });

      // Sort by creation date descending, but active sprints should generally sort to the top in the UI
      sprints.value = Array.from(uniqueSprints.values()).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
    } catch (e) {
      console.error("Failed to fetch sprints", e);
      toast.add({
        title: "Error",
        description: "Failed to load sprints for this project",
        color: "red",
      });
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create or update a sprint
   */
  const saveSprint = async (
    sprint: Omit<PmSprint, "event" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const pubkey = user.value?.pubkey;
      if (!pubkey) throw new Error("Not authenticated");

      // Compile tags
      const tags: string[][] = [];
      tags.push(["d", sprint.id]);
      tags.push(["name", sprint.name]);
      tags.push(["status", sprint.status]);

      // Project ID (using NIP-32 label tags)
      tags.push(["l", sprint.projectId, "project"]);

      if (sprint.startDate) tags.push(["start", sprint.startDate.toString()]);
      if (sprint.endDate) tags.push(["end", sprint.endDate.toString()]);

      let signedEvent = await createEvent(
        NOSTR_KINDS.PM_SPRINT,
        sprint.goal,
        tags,
      );

      if (!signedEvent) {
        throw new Error("Failed to create sprint event");
      }

      await publishEvent(signedEvent);

      toast.add({
        title: "Sprint Saved",
        description: `'${sprint.name}' was saved successfully`,
        color: "green",
      });

      // Optimistically update list
      const updated = parseSprintEvent(signedEvent as Event);
      const idx = sprints.value.findIndex((s) => s.id === updated.id);
      if (idx > -1) {
        sprints.value[idx] = updated;
      } else {
        sprints.value.unshift(updated);
      }

      return updated;
    } catch (e) {
      console.error("Failed to save sprint", e);
      toast.add({
        title: "Error",
        description: "Failed to save the sprint",
        color: "red",
      });
      throw e;
    }
  };

  /**
   * Quick status switch (e.g. Starting or Completing a sprint)
   */
  const updateSprintStatus = async (
    sprintId: string,
    newStatus: PmSprintStatus,
  ) => {
    const existing = sprints.value.find((s) => s.id === sprintId);
    if (!existing) return;

    const oldStatus = existing.status;
    existing.status = newStatus;

    try {
      const oldEvent = existing.event as Event;
      const newTags = [...oldEvent.tags];
      const statusIdx = newTags.findIndex((t) => t[0] === "status");

      if (statusIdx > -1) {
        newTags[statusIdx] = ["status", newStatus];
      } else {
        newTags.push(["status", newStatus]);
      }

      let signedEvent = await createEvent(
        NOSTR_KINDS.PM_SPRINT,
        oldEvent.content,
        newTags,
      );

      if (!signedEvent) {
        throw new Error("Failed to create event");
      }

      await publishEvent(signedEvent as Event);

      existing.event = signedEvent;
      existing.updatedAt = signedEvent.created_at;
    } catch (e) {
      existing.status = oldStatus;
      console.error("Failed to update status", e);
      toast.add({
        title: "Error",
        description: "Failed to update sprint status",
        color: "red",
      });
    }
  };

  return {
    sprints,
    isLoading,
    fetchSprintsForProject,
    saveSprint,
    updateSprintStatus,
  };
};
