# Dashboard Layout Fix - TODO

## Goal
Fix the dashboard layout to ensure sections always appear in a predictable order, regardless of content length.

## Required Layout Order
1. Upcoming classes / Today and upcoming
2. Student Overview – Top 5 by attendance  
3. Attendance comments (Full schedule)

## Tasks

### Phase 1: Update ManagerDashboard.tsx
- [x] 1.1 Replace nested div structure with explicit section containers
- [x] 1.2 Use flex column with consistent gap spacing (gap-6)
- [x] 1.3 Wrap UpcomingLessons in a dedicated container
- [x] 1.4 Wrap StudentOverview in a dedicated container
- [x] 1.5 Wrap AttendanceOverview in a dedicated container
- [x] 1.6 Ensure sections don't collapse or reflow based on content

### Phase 2: Update UpcomingLessons.tsx
- [x] 2.1 Add min-height to empty state container
- [x] 2.2 Ensure consistent visual height regardless of data

### Phase 3: Update StudentOverview.tsx
- [x] 3.1 Add min-height to empty state container
- [x] 3.2 Ensure consistent visual height regardless of data

### Phase 4: Update AttendanceOverview.tsx
- [x] 4.1 Add min-height to empty state container
- [x] 4.2 Ensure consistent visual height regardless of data

## Implementation Notes
- Use `min-h-[200px]` or similar for empty states
- Use `flex-none` where appropriate to prevent dynamic sizing
- Maintain responsive design for mobile/desktop
- Keep consistent spacing between sections (gap-6)

