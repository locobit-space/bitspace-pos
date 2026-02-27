import type { Event, Filter } from "nostr-tools";
import type { PmProject } from "~/types/project-manager";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export const useProjects = () => {
  const { queryEvents, publishEvent } = useNostrRelay();
  const { createEvent } = useNostrData();
  const { currentUserInfo, user } = useNostrUser();
  const toast = useToast();

  const projects = ref<PmProject[]>([]);
  const isLoading = ref(false);

  /**
   * Helper to parse Nostr Event into a PmProject interface
   */
  const parseProjectEvent = (event: Event): PmProject => {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || "";
    const nameTag =
      event.tags.find((t) => t[0] === "name")?.[1] ||
      event.tags.find((t) => t[0] === "title")?.[1] ||
      "Untitled Project";
    const memberTags = event.tags
      .filter((t) => t[0] === "p" && t[1])
      .map((t) => t[1] as string);

    return {
      id: dTag,
      pubkey: event.pubkey,
      name: nameTag,
      description: event.content,
      members: memberTags,
      createdAt: event.created_at,
      updatedAt: event.created_at, // In a real app we might look for 'updated_at' tag, but created_at on a replaceable event suffices
      event: event as any, // Cast to avoid deep TS errors with NDK vs nostr-tools
    };
  };

  /**
   * Fetch all projects the current user has access to
   */
  const fetchProjects = async () => {
    // If we only want authenticated users to fetch, check authStore
    if (!user.value) return;

    // We can also fetch by a known pubkey if available
    const userPubkey = user.value.pubkey;
    if (!userPubkey) return;
    isLoading.value = true;
    try {
      // Find projects where user is either the author or tagged as a member
      const filter1: Filter = {
        kinds: [NOSTR_KINDS.PM_PROJECT],
        "#p": [], // We are tagged as a member
      };

      const filter2: Filter = {
        kinds: [NOSTR_KINDS.PM_PROJECT],
        authors: [userPubkey], // We are the creator
      };

      // Since useNostrRelay's queryEvents only takes a single filter in the current signature,
      // we need to run them sequentially or update the signature if the pool supports arrays.
      // Assuming it supports a single filter per call:
      const events1 = await queryEvents(filter1);
      const events2 = await queryEvents(filter2);

      const allEvents = [...events1, ...events2];

      const parsed: PmProject[] = [];
      allEvents.forEach((event) => {
        parsed.push(parseProjectEvent(event));
      });

      // Simple dedup by D tag in case they match both filters
      const uniqueProjects = new Map<string, PmProject>();
      parsed.forEach((p) => {
        if (
          !uniqueProjects.has(p.id) ||
          p.createdAt > uniqueProjects.get(p.id)!.createdAt
        ) {
          uniqueProjects.set(p.id, p);
        }
      });

      projects.value = Array.from(uniqueProjects.values()).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
    } catch (e) {
      console.error("Failed to fetch projects", e);
      toast.add({
        title: "Error",
        description: "Failed to load projects from relays",
        color: "red",
      });
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create or update a project
   */
  const saveProject = async (
    project: Omit<PmProject, "event" | "createdAt" | "updatedAt" | "pubkey">,
  ) => {
    try {
      console.log(user.value);
      const pubkey = user?.value?.pubkey;
      if (!pubkey) throw new Error("Not authenticated");

      const tags = [
        ["d", project.id],
        ["name", project.name],
        ["alt", `Project: ${project.name}`],
      ];

      // Members (always include self initially)
      const members = new Set([...project.members, pubkey]);
      members.forEach((p) => tags.push(["p", p]));

      // We rely on authStore or useSigner to sign it.
      // If authStore provides a signEvent method, we use it.
      // Fallback: assume the event payload is passed to authStore.signEvent
      let signedEvent = await createEvent(
        NOSTR_KINDS.PM_PROJECT,
        project.description,
        tags,
      );

      console.log(signedEvent);

      if (!signedEvent) {
        throw new Error("Failed to create event");
      }

      await publishEvent(signedEvent);

      toast.add({
        title: "Success",
        description: "Project saved successfully",
        color: "green",
      });

      // Optimistically update list
      const updated = parseProjectEvent(signedEvent as Event);
      const idx = projects.value.findIndex((p) => p.id === updated.id);
      if (idx > -1) {
        projects.value[idx] = updated;
      } else {
        projects.value.unshift(updated);
      }

      return updated;
    } catch (e) {
      console.error("Failed to save project", e);
      toast.add({
        title: "Error",
        description: "Failed to save the project",
        color: "red",
      });
      throw e;
    }
  };

  return {
    projects,
    isLoading,
    fetchProjects,
    saveProject,
  };
};
