# Improvement Plan for DIY Card Project

## 🔴 Critical (Do First)

### 1. Security: Fix API Key Exposure
**Problem**: `NEXT_PUBLIC_API_KEY` is exposed to client-side, making it accessible to anyone.

**Solution**:
- Remove `NEXT_PUBLIC_API_KEY` from client-side
- Create server actions or proxy endpoints for write operations
- Use session-based authentication or OAuth instead of exposing API keys

**Files to modify**:
- `src/lib/tasks.ts` - Remove client-side API key usage
- Create `src/app/api/tasks/actions.ts` - Server actions for write operations
- Update `src/components/TodoCard.tsx` - Use server actions instead of direct API calls

### 2. Add Task Update/Delete Functionality
**Problem**: Users can only create tasks, not update or delete them.

**Solution**:
- Add `PUT /api/tasks/[id]` endpoint for updating tasks
- Add `DELETE /api/tasks/[id]` endpoint for deleting tasks
- Update `src/lib/tasks.ts` with `updateTask()` and `deleteTask()` functions
- Add UI controls in `TodoCard.tsx` for editing/deleting

**Files to create**:
- `src/app/api/tasks/[id]/route.ts` - Update/Delete endpoints

**Files to modify**:
- `src/lib/tasks.ts` - Add update/delete functions
- `src/components/TodoCard.tsx` - Add edit/delete UI

### 3. Replace Alert() with Proper Error UI
**Problem**: Using `alert()` for errors is poor UX.

**Solution**:
- Install a toast library (react-hot-toast or sonner)
- Create error boundary component
- Replace all `alert()` calls with toast notifications

**Files to create**:
- `src/components/ErrorBoundary.tsx`
- `src/components/ui/toast.tsx` (if using custom solution)

**Files to modify**:
- `src/components/TodoCard.tsx` - Replace alerts
- `src/app/page.tsx` - Add error boundary

---

## 🟠 High Priority (Do Next)

### 4. Refactor Large Components
**Problem**: `page.tsx` is 431 lines and handles too many responsibilities.

**Solution**:
- Extract card carousel logic to `CardCarousel.tsx`
- Extract rate limiting to `src/lib/rateLimiter.ts`
- Create `useTaskFetcher.ts` custom hook
- Create `useCardFocus.ts` custom hook for scroll/focus logic

**Files to create**:
- `src/components/CardCarousel.tsx`
- `src/lib/rateLimiter.ts`
- `src/hooks/useTaskFetcher.ts`
- `src/hooks/useCardFocus.ts`

**Files to modify**:
- `src/app/page.tsx` - Simplify to use extracted components/hooks

### 5. Add Loading States
**Problem**: No visual feedback when tasks are loading.

**Solution**:
- Add skeleton loaders for cards
- Add loading indicators for individual tasks
- Show loading state during API calls

**Files to create**:
- `src/components/CardSkeleton.tsx`
- `src/components/TaskSkeleton.tsx`

**Files to modify**:
- `src/components/TodoCard.tsx` - Add loading states
- `src/app/page.tsx` - Show skeletons while loading

### 6. Implement Proper Caching
**Problem**: Only in-memory caching, no persistence or smart invalidation.

**Solution**:
- Use React Query or SWR for data fetching
- Add cache invalidation strategies
- Implement optimistic updates properly

**Files to modify**:
- `src/lib/tasks.ts` - Integrate React Query/SWR
- `src/app/page.tsx` - Use query hooks

### 7. Add Task Completion Persistence
**Problem**: Toggling task completion doesn't save to backend.

**Solution**:
- Add API endpoint to update task completion status
- Call API when task is toggled
- Add optimistic updates

**Files to modify**:
- `src/app/api/tasks/[id]/route.ts` - Add PATCH for completion
- `src/lib/tasks.ts` - Add `toggleTaskCompletion()` function
- `src/components/TodoCard.tsx` - Save on toggle

---

## 🟡 Medium Priority

### 8. Add Inline Task Editing
**Problem**: Users can't edit existing task text.

**Solution**:
- Make task text editable on click/double-click
- Save changes on blur or Enter key
- Show edit indicator

**Files to modify**:
- `src/components/TodoCard.tsx` - Add inline editing
- `src/lib/tasks.ts` - Add `updateTaskText()` function

### 9. Improve Error Handling
**Problem**: Errors are only logged to console, users don't see them.

**Solution**:
- Add error boundaries
- Show user-friendly error messages
- Add retry mechanisms
- Log errors to error tracking service

**Files to create**:
- `src/components/ErrorBoundary.tsx`
- `src/lib/errorHandler.ts`

**Files to modify**:
- All components - Add error handling

### 10. Add Testing Infrastructure
**Problem**: No tests at all.

**Solution**:
- Set up Jest + React Testing Library
- Add unit tests for utilities
- Add component tests
- Add API route tests

**Files to create**:
- `jest.config.js`
- `src/__tests__/` directory
- `src/lib/__tests__/tasks.test.ts`
- `src/components/__tests__/TodoCard.test.tsx`

### 11. Clean Up Code Quality
**Problem**: Console.logs everywhere, unused imports, no TypeScript strict mode.

**Solution**:
- Create logging utility
- Remove unused imports
- Enable TypeScript strict mode
- Add ESLint rules
- Set up Prettier

**Files to create**:
- `src/lib/logger.ts`
- `.prettierrc`
- `.prettierignore`

**Files to modify**:
- All files - Replace console.log with logger
- `tsconfig.json` - Enable strict mode
- `eslint.config.mjs` - Add more rules

### 12. Performance Optimizations
**Problem**: No debouncing, unnecessary re-renders, inefficient API calls.

**Solution**:
- Debounce scroll events
- Use React.memo for components
- Use useMemo/useCallback appropriately
- Batch API requests
- Add request deduplication

**Files to modify**:
- `src/app/page.tsx` - Add debouncing, memoization
- `src/components/TodoCard.tsx` - Optimize re-renders
- `src/lib/tasks.ts` - Add request batching

---

## 🟢 Low Priority (Nice to Have)

### 13. Add Keyboard Shortcuts
- Enter to add task
- Escape to cancel
- Arrow keys to navigate cards
- Cmd/Ctrl+S to save

### 14. Add Undo/Redo
- Track task operations
- Allow undo/redo of changes

### 15. Add Search/Filter
- Search tasks across dates
- Filter by completion status

### 16. Add Export Functionality
- Export tasks to CSV
- Export tasks to JSON

### 17. Improve Documentation
- Add JSDoc comments
- Create architecture docs
- Add API documentation

### 18. Add Monitoring
- Set up error tracking (Sentry)
- Add analytics
- Monitor performance

---

## Implementation Order

1. **Week 1**: Critical items (Security, Update/Delete, Error UI)
2. **Week 2**: High priority (Refactoring, Loading states, Caching)
3. **Week 3**: Medium priority (Editing, Testing, Code quality)
4. **Week 4**: Low priority (Nice-to-have features)

---

## Quick Wins (Can Do Immediately)

1. Remove unused imports from `page.tsx`
2. Replace `alert()` with console.error (temporary)
3. Add `.env.example` file
4. Add loading spinner to cards
5. Clean up console.log statements
6. Add JSDoc comments to public functions
7. Fix TypeScript errors
8. Add error boundaries

---

## Metrics to Track

- Bundle size
- API response times
- Error rates
- User interactions
- Task completion rates
- Performance metrics (LCP, FID, CLS)

