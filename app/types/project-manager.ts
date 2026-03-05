import type { NostrEvent } from "nostr-tools";

// ============================================
// 🗂️ PROJECT MANAGER (Jira/ClickUp-like Types)
// Maps to Kinds 31100-31199
// ============================================

/**
 * PM_PROJECT: 31100
 * A workspace or top-level project tracking board
 */
export interface PmProject {
  id: string; // The `d` tag
  pubkey: string;
  name: string; // The `name` tag or derived from content
  description: string; // Full markdown content
  members: string[]; // `p` tags
  createdAt: number;
  updatedAt: number;
  event: NostrEvent; // The raw backing event
}

/**
 * PM_SPRINT: 31101
 * A time-boxed iteration for planning
 */
export type PmSprintStatus = "planned" | "active" | "completed" | "closed";

export interface PmSprint {
  id: string; // `d` tag
  projectId: string; // `e` tag referencing PM_PROJECT
  name: string;
  goal: string;
  startDate?: number; // Derived from tags
  endDate?: number;
  status: PmSprintStatus;
  createdAt: number;
  updatedAt: number;
  event: NostrEvent;
}

/**
 * PM_ISSUE: 31102
 * A task, bug, story, or epic
 */
export type PmIssueType = "task" | "bug" | "story" | "epic";
export type PmIssuePriority = "low" | "medium" | "high" | "urgent";
export type PmIssueStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled"
  | string;

export interface PmIssue {
  id: string; // The d-tag of the Kind 31101 event
  projectId: string; // The project this belongs to
  sprintId?: string; // The sprint this is assigned to (optional)
  title: string; // name / title of the issue
  description: string; // content body
  type: PmIssueType; // e.g., 'task', 'bug', 'story', 'epic'
  status: PmIssueStatus; // e.g., 'todo', 'in_progress', 'done'
  priority?: PmIssuePriority; // e.g., 'low', 'medium', 'high', 'urgent'
  points?: number; // Story points / estimation
  parentIssueId?: string; // If this belongs to an epic (epic link)
  assignees: string[]; // Pubkeys
  labels: string[]; // Tags / simple string labels
  reporter: string; // Pubkey of person who created it
  createdAt: number;
  updatedAt: number;
  event?: any; // the raw nostr event
}

/**
 * PM_COMMENT: 31105
 * A comment thread on an issue
 */
export interface PmComment {
  id: string; // NIP-10 id or replaceable `d` tag
  issueId: string; // `e` tag referencing PM_ISSUE
  content: string; // Content text
  authorPubkey: string; // pubkey
  createdAt: number;
  updatedAt: number; // For editable comments
  event?: any;
}

/**
 * PM_LABEL: 31104
 * Defined labels for a project
 */
export interface PmLabel {
  name: string; // `d` tag
  projectId: string; // `e` tag
  color: string; // HEX code tag
  description?: string;
}

/**
 * PM_WORKFLOW / PM_BOARD: 31106 / 31107
 * Configuration of columns and statuses
 */
export interface PmBoardColumn {
  id: string;
  name: string;
  statuses: string[];
  order: number;
}

export interface PmBoard {
  id: string; // `d` tag
  projectId: string; // `e` tag
  name: string;
  columns: PmBoardColumn[]; // Parsed from JSON content
  createdAt: number;
  updatedAt: number;
  event: NostrEvent;
}

/**
 * PM_PAGE: 31109
 * Long-form collaborative markdown document tied to a project
 */
export interface PmPage {
  id: string; // `d` tag
  projectId: string; // `project` tag
  title: string;
  summary?: string;
  content: string;
  authorPubkey: string;
  createdAt: number;
  updatedAt: number;
}
