@AGENTS.md

# Habit App — Claude Code Instructions

## Mission

Build a production-quality habit tracking application focused on simplicity, consistency tracking, excellent UX, and reliable historical data.

The application must feel fast, calm, modern, and trustworthy.

## Architecture

- Use TypeScript.
- Use Next.js App Router.
- Use Supabase/PostgreSQL for persistence.
- Use server-side operations for mutations and sensitive operations.
- Keep business logic outside React components.
- Keep database access isolated from presentation components.
- Reuse existing components and utilities before creating new ones.
- Avoid unnecessary abstractions.

## Database

- All schema changes must use migrations.
- Never manually modify production schema.
- Every user-owned table must use Row Level Security.
- Never trust client-provided user IDs.
- Derive user ownership from the authenticated session.
- Add indexes for important query paths.
- Preserve historical completion data.

## Habit logic

The database completion history is the source of truth.

Do not store streaks as authoritative fields on the habit.

Calculate streaks from completion history and the habit schedule.

A streak is based on scheduled occurrences, not simply consecutive calendar dates.

Changing a habit schedule must not rewrite historical completion data.

## Dates and timezones

Habit dates must be interpreted using the user's configured timezone.

Do not blindly use server UTC dates for user-facing habit days.

Be especially careful around midnight, daylight-saving changes, and date boundaries.

## UI

The Today page is the primary product experience.

Prioritize:

1. What needs to be done today?
2. How much progress has been made?
3. How easy is it to complete a habit?

Avoid clutter.

Do not put unnecessary statistics on habit cards.

Use the established design system consistently.

Do not introduce arbitrary colors, spacing values, or component styles.

## UX states

Every data-driven UI must consider:

- loading
- empty
- error
- success
- optimistic update
- rollback after mutation failure

## Accessibility

- Use semantic HTML.
- All interactive elements must be keyboard accessible.
- Icon-only buttons need accessible labels.
- Maintain adequate color contrast.
- Do not communicate important information through color alone.
- Provide visible focus states.

## Responsive design

Design mobile-first.

The application must work well on:

- mobile
- tablet
- desktop

Do not simply shrink desktop layouts for mobile.

## Testing

New business logic requires unit tests.

Critical workflows require integration or E2E tests.

Before declaring a feature complete:

1. Run type checking (`pnpm typecheck`).
2. Run linting (`pnpm lint`).
3. Run unit tests (`pnpm test`).
4. Run relevant E2E tests (`pnpm test:e2e`).
5. Check the UI manually where appropriate.

## Code changes

Make small, focused changes.

Do not modify unrelated files.

Do not rewrite working code unnecessarily.

Do not install a new dependency unless there is a clear reason.

Before implementing a feature, inspect the existing architecture.

## Git

Use focused commits.

Examples:

```
feat: add habit schema
feat: add habit creation
feat: add completion tracking
feat: add streak calculation
feat: add today dashboard
feat: add analytics
fix: handle timezone boundary
```

Do not create giant commits containing unrelated changes.

## Product philosophy

The app should not feel like a spreadsheet.

Analytics should help users understand their behavior rather than overwhelm them with data.

Gamification should support consistency rather than manipulate the user.

The primary interaction should be extremely fast:

Open app → understand today → tap completion → see progress.

## Before finishing a task

Ask yourself:

- Is this consistent with the existing architecture?
- Is the database operation secure?
- Does this work on mobile?
- What happens if the request fails?
- What happens when there is no data?
- What happens at midnight?
- Does this preserve historical data?
- Is this accessible?
- Are tests covering the important logic?
