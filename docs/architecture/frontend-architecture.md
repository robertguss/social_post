# Frontend Architecture

## Component Architecture

**Decision:** **Feature-First / Component-Based** architecture, utilizing Next.js/React and integrating **shadcn/ui** primitives.

| Component Type    | Location               | Purpose                                                                               |
| :---------------- | :--------------------- | :------------------------------------------------------------------------------------ |
| **App Shell**     | `app/layout.tsx`       | Provides Better Auth and Convex contexts, handles global styling.                           |
| **Pages/Views**   | `app/`                 | Defines routes and assembles features into a view.                                    |
| **Core Features** | `components/features/` | Components for complex workflows, e.g., `PostScheduler.tsx`, `ConnectionManager.tsx`. |
| **UI Primitives** | `components/ui/`       | Exports from `shadcn/ui`.                                                             |
| **Convex Hooks**  | `hooks/`               | Custom hooks for complex data fetching or mutations, abstracting Convex interaction.  |

## State Management Architecture

- **Global State (Data)**: Primary state driven by **Convex** via `useQuery` hooks, ensuring real-time data sync.
- **Local UI State**: Standard React hooks (`useState`) manage temporary UI state like form inputs, modal visibility, and tab selection.

## Routing Architecture

The application relies entirely on the **Next.js App Router** structure.

| Route Requirement               | Implementation Path (Example)        |
| :------------------------------ | :----------------------------------- |
| **Post Creation/Scheduling**    | `app/schedule/page.tsx`              |
| **List View / Post Management** | `app/dashboard/page.tsx` (Protected) |
| **Post History**                | `app/history/page.tsx` (Protected)   |
| **Authentication Flow**         | Handled by Better Auth components          |

---
