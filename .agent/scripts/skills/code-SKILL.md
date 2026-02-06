---
name: BnOS Coding Style
description: Best practices, patterns, and conventions for the BnOS Nuxt project.
---

# BnOS Coding Standards

This skill defines the coding style and best practices for the BnOS project. Always refer to this when writing or refactoring code.

## Core Stack

- **Framework**: Nuxt 3 (Vue 3 + Composition API)
- **Language**: TypeScript
- **Styling**: Tailwind CSS / UnoCSS (Atomic CSS)
- **Icons**: `@nuxt/icon` (e.g., `sora:`, `svg-spinners:`)

## General Rules

- **DRY**: Don't Repeat Yourself. Extract reusable logic into composables (`use*`) and UI into components.
- **KISS**: Keep It Simple, Stupid. Avoid over-engineering.
- **Comments**: Explain _why_, not _what_. Code should be self-documenting.
- **Deletions**: Do not comment out code; delete it. Git history preserves the past.

## Vue & Nuxt Specifics

### Component Structure

- Use `<script setup lang="ts">`.
- Order of blocks: `<script>`, `<template>`, `<style>`.
- Use **PascalCase** for component names (e.g., `UserCard.vue`).
- Use **kebab-case** for file names (e.g., `user-card.vue`) in routes, but PascalCase for components in `components/`.

### Reactivity & State

- Use `ref` for primitives and objects unless `reactive` offers a clear advantage for deep state.
- **State Management**:
  - Use `useState` for shared global state across components.
  - Keep `ref`s grouped by feature (State, UI, Logic) for readability.

### Props & Emits

- Explicitly type props using `defineProps<Props>()`.
- Default values with `withDefaults`.

```ts
interface Props {
  msg?: string;
  labels?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  msg: "hello",
  labels: () => ["one", "two"],
});
```

## Styling (UnoCSS / Tailwind)

- Use utility classes directly in `class`.
- Order classes logically: Layout -> Box Model -> Typography -> Visual -> Misc.
  - Example: `flex items-center justify-between p-4 text-sm font-bold text-gray-700 bg-white rounded-lg hover:bg-gray-50`
- Use `sm:`, `md:`, `lg:` for responsive design (Mobile First).

## UI & UX Patterns

### Loading States

- **Always** provide visual feedback.
- Use `svg-spinners:180-ring-with-bg` for loading icons.
- Combine global `isLoading` and local `isLoadingMore` for smooth UX.
- **Avoid Toasts for passive actions**: Do not show "Refreshed!" toasts for pull-to-refresh or infinite scroll. It's intrusive.

## Project Structure

- **Composables** (`app/composables/`): Feature-specific logic.
  - `useNostrFeed`: Core feed logic.
  - `useNostrRelay`: Network / WebSocket interactions.
- **Components** (`app/components/`): Reusable UI elements.
- **Pages** (`app/pages/`): Route views.

## Code Quality & Performance

- **Types**: Strict TypeScript. No `any` unless absolutely necessary.
- **Cleanup**: Always remove event listeners and disconnect observers in `onUnmounted`.
- **Images**: Use `<NuxtImg>` for automatic optimization.
- **Lazy Loading**: Use `Lazy` prefix for heavy components (e.g., `<LazyModal />`).

## Naming Conventions

- **Files**: kebab-case (e.g., `feed.vue`, `user-profile.vue`).
- **Composables**: camelCase starting with `use` (e.g., `useNostrFeed`).
- **Variables/Functions**: camelCase.
- **Classes**: PascalCase.
