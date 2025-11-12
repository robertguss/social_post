# Component Inventory

## Overview

The Social Post application uses **shadcn/ui** components built on **Radix UI primitives** styled with **Tailwind CSS 4**. Components are organized into UI primitives and feature-specific components.

---

## UI Primitives (`components/ui/`)

shadcn/ui components (33 total):

### Form & Input Components
- `button.tsx` - Button variants (default, destructive, outline, ghost, link)
- `input.tsx` - Text input field
- `textarea.tsx` - Multi-line text input
- `label.tsx` - Form labels
- `checkbox.tsx` - Checkbox input
- `switch.tsx` - Toggle switch
- `select.tsx` - Dropdown select
- `form.tsx` - React Hook Form integration
- `calendar.tsx` - Date picker calendar
- `popover.tsx` - Floating content container

### Navigation & Layout
- `separator.tsx` - Visual divider
- `tabs.tsx` - Tabbed interface
- `dropdown-menu.tsx` - Dropdown menus
- `sheet.tsx` - Slide-out panel
- `sidebar.tsx` - Sidebar navigation
- `breadcrumb.tsx` - Navigation breadcrumbs
- `collapsible.tsx` - Expandable sections

### Feedback & Overlays
- `dialog.tsx` - Modal dialogs
- `alert-dialog.tsx` - Confirmation dialogs
- `toast.tsx` - Toast notifications (via Sonner)
- `tooltip.tsx` - Hover tooltips
- `alert.tsx` - Alert messages
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars

### Data Display
- `table.tsx` - Data tables
- `card.tsx` - Content cards
- `chart.tsx` - Chart components (via Recharts)
- `skeleton.tsx` - Loading skeletons

### Advanced
- `toggle.tsx` - Toggle button
- `toggle-group.tsx` - Toggle button group
- `scroll-area.tsx` - Custom scrollbars
- `visually-hidden.tsx` - Accessibility helper
- `drawer.tsx` - Bottom drawer (via Vaul)

---

## Feature Components (`components/features/`)

### Post Creation & Scheduling

#### `PostScheduler.tsx`
- **Purpose**: Main post creation and scheduling interface
- **Features**:
  - Dual platform text fields (Twitter/LinkedIn)
  - Character counter with validation
  - Date/time picker for scheduling
  - Platform selection toggles
  - Draft saving
- **Dependencies**: Calendar, DualPlatformTextFields, RecommendedTimes

#### `DualPlatformTextFields.tsx`
- **Purpose**: Side-by-side Twitter and LinkedIn content editors
- **Features**:
  - Platform-specific character limits (280 for Twitter, 3000 for LinkedIn)
  - Live character counting
  - Platform enable/disable toggles
  - Content validation
- **State**: Manages platform-specific content

#### `QuickReschedule.tsx`
- **Purpose**: Quickly reschedule posts
- **Features**:
  - Date/time picker
  - Conflict detection
  - One-click rescheduling
- **Use Case**: Dashboard post management

#### `PreviewModal.tsx`
- **Purpose**: Preview post before publishing
- **Features**:
  - Platform-specific preview rendering
  - Twitter character counter
  - LinkedIn formatting display
  - Schedule confirmation

### AI Features

#### `AISuggestionPanel.tsx`
- **Purpose**: AI-powered content enhancement panel
- **Features**:
  - Tone adjustment (professional, casual, friendly, etc.)
  - LinkedIn expansion from Twitter content
  - Hashtag generation
  - Loading states
  - Error handling
- **API**: Calls Convex AI actions (Gemini)

#### `HashtagSuggestionPanel.tsx`
- **Purpose**: AI hashtag generation interface
- **Features**:
  - Generate hashtags from content
  - One-click insertion
  - Platform-specific hashtag formatting
- **Integration**: Part of post creation flow

#### `AIFeedbackDialog.tsx`
- **Purpose**: Report AI content quality issues
- **Features**:
  - Feedback type selection (inappropriate, low-quality, other)
  - Free-text feedback field
  - Submission tracking
- **Use Case**: Monitor and improve AI quality

### Templates & Content Reuse

#### `TemplatePickerModal.tsx`
- **Purpose**: Browse and select content templates
- **Features**:
  - Template list with tags
  - Search/filter
  - Preview template content
  - One-click insertion into post
  - Usage statistics display
- **Data**: Fetches from `templates` table

### Recurring Queues

#### `QueueEditModal.tsx`
- **Purpose**: Create and edit recurring post queues
- **Features**:
  - Select original post template
  - Set recurrence interval (days)
  - Set max executions
  - Status management (active/paused)
  - Conflict detection
- **Data**: Manages `recurring_queues` table

#### `QueueCard.tsx`
- **Purpose**: Display queue information card
- **Features**:
  - Queue status badge
  - Next scheduled time
  - Execution count
  - Pause/resume controls
  - Edit/delete actions
- **Use Case**: Dashboard queue list

### Scheduling Intelligence

#### `RecommendedTimes.tsx`
- **Purpose**: Show optimal posting times
- **Features**:
  - Research-based time recommendations
  - Platform-specific suggestions
  - Day-of-week filtering
  - One-click time selection
  - Custom preference override support
- **Data**: Queries `posting_time_recommendations` and `posting_preferences`

#### `ConflictWarning.tsx`
- **Purpose**: Warn about scheduling conflicts
- **Features**:
  - Detects overlapping posts
  - Shows conflicting posts
  - Suggests alternative times
  - Option to proceed anyway
- **Logic**: Queries nearby scheduled posts

### Dashboard & Navigation

#### `site-header.tsx`
- **Purpose**: Main application header
- **Features**:
  - Logo and branding
  - User authentication status
  - Theme toggle (light/dark)
  - Mobile responsive menu

#### `nav-main.tsx`
- **Purpose**: Main navigation menu
- **Features**:
  - Dashboard, Posts, Templates, Queues, Analytics, Settings
  - Active link highlighting
  - Icon navigation
- **Integration**: Sidebar navigation

#### `nav-documents.tsx`
- **Purpose**: Document/help navigation
- **Features**:
  - Links to documentation
  - Help resources
- **Integration**: Sidebar secondary navigation

#### `section-cards.tsx`
- **Purpose**: Dashboard section cards
- **Features**:
  - Stat cards (total posts, scheduled, published)
  - Platform-specific stats
  - Quick action buttons
- **Layout**: Grid layout

### Data Display

#### `data-table.tsx`
- **Purpose**: Reusable data table component
- **Features**:
  - Sorting
  - Filtering
  - Pagination
  - Column customization
- **Library**: @tanstack/react-table
- **Use Case**: Posts list, templates list, queues list

#### `chart-area-interactive.tsx`
- **Purpose**: Interactive area chart
- **Features**:
  - Engagement metrics visualization
  - Interactive tooltips
  - Time series data
  - Multiple data series
- **Library**: Recharts
- **Use Case**: Analytics dashboard

---

## Component Architecture

### Design System
- **Base**: Radix UI primitives (headless, accessible)
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **Variants**: class-variance-authority (CVA) for component variants
- **Icons**: Lucide React + Tabler Icons
- **Animations**: tw-animate-css

### Theme System
- **Provider**: next-themes for dark/light mode
- **CSS Variables**: Defined in `app/globals.css`
- **Colors**: Neutral base color (from shadcn config)
- **Mode**: Automatic theme switching

### Component Patterns
- **Composition**: Small, focused components
- **Controlled Components**: State lifted to parent where needed
- **Hooks**: Custom hooks in `/hooks` directory
- **Form Handling**: React Hook Form + Zod validation

---

## State Management

### Client State
- **React State**: Local component state with `useState`
- **Form State**: React Hook Form for complex forms
- **URL State**: Next.js App Router for navigation state

### Server State
- **Convex Queries**: Automatic reactivity and caching
- **Optimistic Updates**: Built-in Convex optimistic mutations
- **Real-time**: WebSocket connection via Convex
- **No Redux/Zustand**: Convex handles global server state

### Data Flow
```
User Input
  ↓
Component State (useState, React Hook Form)
  ↓
Convex Mutation (via useMutation hook)
  ↓
Database Update
  ↓
Convex Query Re-runs (automatic)
  ↓
Component Re-renders with Fresh Data
```

---

## Testing Components

Test files located in:
- `components/features/__tests__/` - Component unit tests
- Uses @testing-library/react for component testing
- Jest + jsdom environment

Example tests:
- `QueueCard.test.tsx` - Queue card rendering and interactions
- `AIAssistantButton.test.tsx` - AI button states
- `LinkedInFormattingHints.test.tsx` - Formatting helper

---

## Component Dependencies

### UI Libraries
- `@radix-ui/*` - Accessible primitives
- `lucide-react` - Icon library
- `@tabler/icons-react` - Additional icons
- `recharts` - Chart visualizations
- `react-day-picker` - Date picker
- `sonner` - Toast notifications
- `vaul` - Drawer component

### Form & Validation
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration
- `zod` - Schema validation

### Drag & Drop
- `@dnd-kit/*` - Drag and drop for list reordering

### Styling
- `tailwind-merge` - Merge Tailwind classes
- `clsx` - Conditional classes
- `class-variance-authority` - Component variants

---

## Reusable Patterns

### Modal Pattern
Most modals follow this structure:
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Pattern
Forms use React Hook Form + Zod:
```tsx
const form = useForm({
  resolver: zodResolver(schema),
});

<Form {...form}>
  <FormField
    control={form.control}
    name="field"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Convex Query Pattern
Data fetching with Convex:
```tsx
const posts = useQuery(api.posts.getPosts, { userId });
```

### Convex Mutation Pattern
Data mutations with Convex:
```tsx
const createPost = useMutation(api.posts.createPost);

const handleSubmit = async (data) => {
  await createPost(data);
};
```

---

## Accessibility

- All components use Radix UI accessible primitives
- Keyboard navigation supported
- ARIA labels and roles
- Focus management
- Screen reader support via `visually-hidden` component

---

*Generated: 2025-11-12*
*Project: Social Post*
