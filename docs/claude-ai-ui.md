You are a senior Nuxt 3 front-end engineer.

Please generate a UI using:
- Nuxt 3 + TypeScript
- Tailwind CSS
- Nuxt UI 2 (https://ui.nuxt.com)
- Nuxt Icon (for icons)

The UI is for a POS/ERP admin panel with multi-branch support.

🎯 The page should allow the user to:
1. Manage product metadata (categories, units, payment terms)
2. View a table of each meta type (category, unit, term)
3. Add/edit/delete records via modal dialogs
4. Filter by branch if needed
5. Use reactive composables and proper TypeScript typing

📦 Each meta object has:
- `id`: string
- `name`: string
- Optional: `description`, `symbol`, `days`, `notes`

📐 Design Guidelines:
- Use `UCard`, `UModal`, `UButton`, `UInput`, `USelect`, `UTabs`, `UForm`, `UFormField` from Nuxt UI
- Use `NuxtIcon` for action icons (e.g. pencil, trash)
- Group tabs for: Categories, Units, Terms
- Use `<script setup lang="ts">` style
- Keep components modular and clean
- Assume the data is reactive via Pinia or composables
- if data table use native `<table>` and `<tr>` tags
- use i18n for labels `${$t('common.add')}` for locale support lo_LA.json(Lao), en_US.json(English)


Please return a single file for the full page first, then separate modal/edit components if needed.
