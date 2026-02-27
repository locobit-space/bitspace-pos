import type { Event, Filter } from "nostr-tools";
import { NOSTR_KINDS } from "~/types/nostr-kinds";
import type { PmPage } from "~/types/project-manager";

// Global module state shared across all components
const pages = ref<PmPage[]>([]);
const isLoadingPages = ref(false);

export const usePages = () => {
  const { queryEvents, publishEvent } = useNostrRelay();
  const { createEvent } = useNostrData();
  const { user } = useNostrUser();

  const parsePageEvent = (event: Event): PmPage | null => {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (!dTag) return null;

    // Project ID is stored as a NIP-32 label tag: ["l", projectId, "project"]
    const projectTag = event.tags.find(
      (t) => t[0] === "l" && t[2] === "project",
    )?.[1];
    if (!projectTag) return null;

    return {
      id: dTag,
      projectId: projectTag,
      title: event.tags.find((t) => t[0] === "title")?.[1] || "Untitled",
      summary: event.tags.find((t) => t[0] === "summary")?.[1],
      content: event.content,
      authorPubkey: event.pubkey,
      createdAt: event.created_at,
      updatedAt: event.created_at,
    };
  };

  const fetchPagesForProject = async (projectId: string) => {
    isLoadingPages.value = true;
    try {
      // Use `#l` (NIP-32 label) — relays only index single-letter tags.
      // Custom multi-char tags like "#project" are NOT indexed by relays.
      const filter: Filter = {
        kinds: [NOSTR_KINDS.PM_PAGE],
        "#l": [projectId],
      };

      const events = await queryEvents(filter);

      // Parse and deduplicate by `d` tag (keep most recent per id+author)
      const parsed: PmPage[] = [];
      for (const event of events) {
        const p = parsePageEvent(event);
        if (!p) continue;
        const existing = parsed.findIndex(
          (x) => x.id === p.id && x.authorPubkey === p.authorPubkey,
        );
        if (existing > -1) {
          const ex = parsed[existing];
          if (ex && p.createdAt > ex.createdAt) {
            parsed[existing] = p;
          }
        } else {
          parsed.push(p);
        }
      }

      // Merge into global state (preserving pages from other projects)
      pages.value = [
        ...pages.value.filter((p) => p.projectId !== projectId),
        ...parsed.sort((a, b) => b.createdAt - a.createdAt),
      ];
    } catch (e) {
      console.error("Failed to fetch pages:", e);
    } finally {
      isLoadingPages.value = false;
    }
  };

  const savePage = async (
    page: Omit<PmPage, "createdAt" | "updatedAt" | "authorPubkey">,
  ) => {
    const pubkey = user.value?.pubkey;
    if (!pubkey) throw new Error("Not authenticated");
    const tags: string[][] = [
      ["d", page.id],
      ["l", page.projectId, "project"], // NIP-32 label — single-letter so relays index it
      ["title", page.title],
    ];
    if (page.summary) tags.push(["summary", page.summary]);

    const signedEvent = await createEvent(
      NOSTR_KINDS.PM_PAGE,
      page.content,
      tags,
    );

    if (!signedEvent) throw new Error("Signing failed");

    await publishEvent(signedEvent as Event);

    const newPage: PmPage = {
      ...page,
      authorPubkey: pubkey,
      createdAt: signedEvent.created_at,
      updatedAt: signedEvent.created_at,
    };

    const index = pages.value.findIndex(
      (p) => p.id === page.id && p.authorPubkey === pubkey,
    );
    if (index > -1) {
      pages.value[index] = newPage;
    } else {
      pages.value.unshift(newPage);
    }

    return newPage;
  };

  const deletePage = async (pageId: string) => {
    const pubkey = user.value?.pubkey;
    if (!pubkey) throw new Error("Not authenticated");

    const coordinate = `${NOSTR_KINDS.PM_PAGE}:${pubkey}:${pageId}`;
    const signedEvent = await createEvent(5, "", [["a", coordinate]]);
    if (!signedEvent) throw new Error("Signing failed");
    await publishEvent(signedEvent as Event);

    pages.value = pages.value.filter(
      (p) => !(p.id === pageId && p.authorPubkey === pubkey),
    );
  };

  return {
    pages,
    isLoadingPages,
    fetchPagesForProject,
    savePage,
    deletePage,
  };
};
