# Learning Roadmap: From React Developer to Design Engineer

## Your Current Foundation
- ✅ Beginner to Intermediate React
- ✅ Understanding of components, hooks, state
- ✅ Familiar with Next.js basics

## What is Design Engineering?

Design Engineering sits at the intersection of:
- **Frontend Engineering**: Building user interfaces
- **Software Architecture**: Structuring code for maintainability
- **Product Thinking**: Understanding user needs and business goals
- **Systems Thinking**: How pieces fit together

A design engineer writes code that is:
- **Maintainable**: Easy to understand and modify
- **Scalable**: Can grow without major rewrites
- **Performant**: Fast and efficient
- **Testable**: Can be verified and validated
- **User-focused**: Solves real problems elegantly

---

## Phase 1: Core Concepts (Weeks 1-4)

### 1.1 Component Composition & Patterns

**Why it matters**: Understanding how to break down complex UIs into reusable, composable pieces.

**Key Concepts**:
- **Composition over Inheritance**: Building complex components from simple ones
- **Container/Presentational Pattern**: Separating logic from presentation
- **Render Props**: Passing functions as props to share logic
- **Compound Components**: Related components that work together (like `<Select>` + `<Option>`)

**Learning Resources**:
- [React Patterns](https://reactpatterns.com/)
- [Kent C. Dodds - Component Patterns](https://kentcdodds.com/blog/compound-components-with-react-hooks)

**Practice Exercise**:
Refactor your `TodoCard` component:
1. Extract `TaskRow` as a separate component
2. Create a `TaskList` component that composes `TaskRow`
3. Make `TaskCard` a container that handles data fetching
4. Create a `TaskCardSkeleton` for loading states

**Apply to Your App**:
```typescript
// Before: Everything in TodoCard.tsx (665 lines)
// After: 
// - TaskCard.tsx (container, ~50 lines)
// - TaskList.tsx (presentation, ~100 lines)
// - TaskRow.tsx (presentation, ~80 lines)
// - TaskCardSkeleton.tsx (loading, ~30 lines)
```

---

### 1.2 State Management Patterns

**Why it matters**: Understanding when and how to manage state prevents bugs and improves performance.

**Key Concepts**:
- **Server State vs Client State**: Different types of state need different solutions
- **Lifting State Up**: When to move state to parent components
- **State Colocation**: Keeping state close to where it's used
- **Derived State**: Computing values from other state
- **Optimistic Updates**: Updating UI before server confirms

**Learning Resources**:
- [You Might Not Need State](https://kentcdodds.com/blog/dont-sync-state-derive-it)
- [React Query Essentials](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

**Practice Exercise**:
Refactor state management in your app:
1. Identify all state in `TodoCard.tsx`
2. Categorize: Server state vs UI state
3. Move server state to React Query hooks
4. Move UI state (editing mode, focus) to Zustand or local state
5. Implement optimistic updates for task creation

**Apply to Your App**:
```typescript
// Server State (React Query)
const { data: tasks } = useTasks(date);

// UI State (Zustand or useState)
const editingTaskId = useUIStore(state => state.editingTaskId);
const setEditingTaskId = useUIStore(state => state.setEditingTaskId);

// Derived State (computed)
const completedTasks = useMemo(
  () => tasks.filter(t => t.completed),
  [tasks]
);
```

---

### 1.3 Data Fetching & Caching

**Why it matters**: Understanding how to efficiently fetch and cache data is crucial for performance.

**Key Concepts**:
- **Request Deduplication**: Avoiding duplicate API calls
- **Cache Invalidation**: When to refetch data
- **Stale-While-Revalidate**: Show cached data while fetching fresh
- **Prefetching**: Loading data before user needs it
- **Pagination & Infinite Scroll**: Handling large datasets

**Learning Resources**:
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [SWR Documentation](https://swr.vercel.app/) (alternative to React Query)

**Practice Exercise**:
Optimize data fetching:
1. Implement request deduplication (React Query does this automatically)
2. Add prefetching for adjacent dates
3. Set up cache invalidation strategies
4. Add background refetching on window focus

**Apply to Your App**:
```typescript
// Prefetch tomorrow's tasks when today's card is visible
useEffect(() => {
  if (isFocused) {
    const tomorrow = addDays(parseDate(date), 1);
    queryClient.prefetchQuery({
      queryKey: ['tasks', formatDate(tomorrow)],
      queryFn: () => getTasksForDate(formatDate(tomorrow)),
    });
  }
}, [isFocused, date]);
```

---

### 1.4 TypeScript Deep Dive

**Why it matters**: Type safety catches bugs before runtime and makes code self-documenting.

**Key Concepts**:
- **Type Inference**: Let TypeScript infer types when possible
- **Discriminated Unions**: Type-safe state machines
- **Generic Types**: Reusable type definitions
- **Utility Types**: `Pick`, `Omit`, `Partial`, etc.
- **Type Guards**: Runtime type checking

**Learning Resources**:
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

**Practice Exercise**:
Improve type safety:
1. Enable strict mode in `tsconfig.json`
2. Add types for all function parameters and returns
3. Create discriminated unions for loading/error/success states
4. Use generic types for reusable hooks

**Apply to Your App**:
```typescript
// Discriminated Union for async state
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Generic hook
function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  // Implementation
}
```

---

## Phase 2: Architecture & Patterns (Weeks 5-8)

### 2.1 Separation of Concerns

**Why it matters**: Code that mixes concerns is hard to test, maintain, and reason about.

**Key Concepts**:
- **Single Responsibility Principle**: Each module does one thing
- **Dependency Inversion**: Depend on abstractions, not implementations
- **Layered Architecture**: Presentation → Application → Domain → Infrastructure
- **Feature-Based Organization**: Group related code together

**Learning Resources**:
- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

**Practice Exercise**:
Refactor to layered architecture:
1. Create `features/tasks/domain/` for business logic
2. Create `features/tasks/application/` for use cases
3. Create `features/tasks/infrastructure/` for database access
4. Keep components in `components/` (presentation only)

**Apply to Your App**:
```
features/tasks/
├── domain/
│   ├── Task.ts              # Domain model
│   └── TaskRepository.ts     # Interface (abstraction)
├── application/
│   ├── CreateTask.ts        # Use case
│   └── UpdateTask.ts        # Use case
└── infrastructure/
    └── TaskRepositoryImpl.ts # Implementation (Supabase)
```

---

### 2.2 Repository Pattern

**Why it matters**: Abstracts data access, making it easy to swap implementations and test.

**Key Concepts**:
- **Interface-Based Design**: Define contracts, not implementations
- **Dependency Injection**: Pass dependencies as parameters
- **Testability**: Easy to mock repositories in tests

**Learning Resources**:
- [Repository Pattern Explained](https://martinfowler.com/eaaCatalog/repository.html)

**Practice Exercise**:
Implement repository pattern:
1. Create `TaskRepository` interface
2. Implement `SupabaseTaskRepository`
3. Create `MockTaskRepository` for tests
4. Inject repository into use cases

**Apply to Your App**:
```typescript
// Domain/Repository Interface
interface TaskRepository {
  getByDate(date: string): Promise<Task[]>;
  create(task: CreateTaskInput): Promise<Task>;
  update(id: string, updates: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
}

// Infrastructure/Implementation
class SupabaseTaskRepository implements TaskRepository {
  async getByDate(date: string): Promise<Task[]> {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', date);
    return data;
  }
  // ... other methods
}
```

---

### 2.3 Error Handling Patterns

**Why it matters**: Proper error handling prevents crashes and provides good UX.

**Key Concepts**:
- **Error Boundaries**: Catch React errors
- **Error Types**: Custom error classes
- **Error Recovery**: Retry logic, fallbacks
- **User-Friendly Messages**: Don't expose technical errors

**Learning Resources**:
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-an-error-object)

**Practice Exercise**:
Implement comprehensive error handling:
1. Create custom error classes (`TaskError`, `ValidationError`)
2. Add error boundaries to catch React errors
3. Implement retry logic for network errors
4. Show user-friendly error messages

**Apply to Your App**:
```typescript
// Custom error class
class TaskError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

// Error boundary
class ErrorBoundary extends React.Component {
  // Implementation
}

// Retry logic in React Query
const { data, error } = useQuery({
  queryKey: ['tasks', date],
  queryFn: () => taskRepository.getByDate(date),
  retry: (failureCount, error) => {
    if (error instanceof TaskError && !error.retryable) {
      return false;
    }
    return failureCount < 3;
  },
});
```

---

### 2.4 Testing Fundamentals

**Why it matters**: Tests give confidence to refactor and catch bugs early.

**Key Concepts**:
- **Unit Tests**: Test individual functions
- **Integration Tests**: Test how pieces work together
- **E2E Tests**: Test complete user flows
- **Test-Driven Development**: Write tests before code
- **Mocking**: Isolate units under test

**Learning Resources**:
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

**Practice Exercise**:
Add tests to your app:
1. Write unit tests for date formatting functions
2. Write component tests for `TaskRow`
3. Write integration tests for task creation flow
4. Set up E2E tests with Playwright

**Apply to Your App**:
```typescript
// Unit test
describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate(new Date('2024-12-25'))).toBe('12/25/2024');
  });
});

// Component test
describe('TaskRow', () => {
  it('calls onToggle when checkbox clicked', () => {
    const onToggle = jest.fn();
    render(<TaskRow task={mockTask} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(mockTask.id);
  });
});
```

---

## Phase 3: Performance & Optimization (Weeks 9-12)

### 3.1 React Performance

**Why it matters**: Slow apps frustrate users and waste resources.

**Key Concepts**:
- **React.memo**: Prevent unnecessary re-renders
- **useMemo & useCallback**: Memoize expensive computations
- **Code Splitting**: Load code on demand
- **Virtual Scrolling**: Render only visible items
- **Bundle Analysis**: Identify what's making your bundle large

**Learning Resources**:
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web.dev Performance](https://web.dev/performance/)

**Practice Exercise**:
Optimize your app:
1. Profile with React DevTools Profiler
2. Add `React.memo` to prevent re-renders
3. Memoize expensive computations
4. Implement code splitting for routes
5. Analyze bundle size with `@next/bundle-analyzer`

**Apply to Your App**:
```typescript
// Memoize expensive computation
const completedTasks = useMemo(
  () => tasks.filter(t => t.completed),
  [tasks]
);

// Memoize callback
const handleToggle = useCallback((id: string) => {
  updateTask(id, { completed: !tasks.find(t => t.id === id)?.completed });
}, [tasks, updateTask]);

// Memoize component
export const TaskRow = React.memo(function TaskRow({ task, onToggle }) {
  // Component implementation
});
```

---

### 3.2 Database Optimization

**Why it matters**: Slow database queries make the entire app feel slow.

**Key Concepts**:
- **Indexing**: Speed up queries
- **Query Optimization**: Write efficient queries
- **Connection Pooling**: Reuse database connections
- **Caching**: Cache frequently accessed data

**Learning Resources**:
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Database Indexing Explained](https://use-the-index-luke.com/)

**Practice Exercise**:
Optimize database:
1. Add indexes on frequently queried columns
2. Analyze query performance with `EXPLAIN ANALYZE`
3. Implement connection pooling
4. Add database-level caching

**Apply to Your App**:
```sql
-- Add index for date queries
CREATE INDEX idx_tasks_date ON tasks(date);

-- Add composite index for user + date queries
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM tasks WHERE date = '2024-12-25';
```

---

### 3.3 Network Optimization

**Why it matters**: Reducing network requests improves performance and reduces server load.

**Key Concepts**:
- **Request Batching**: Combine multiple requests
- **Request Deduplication**: Avoid duplicate requests
- **Compression**: Gzip/Brotli compression
- **CDN**: Serve static assets from edge locations

**Learning Resources**:
- [Web.dev Network](https://web.dev/network-requests/)

**Practice Exercise**:
Optimize network:
1. Implement request batching for multiple date queries
2. Use React Query's automatic deduplication
3. Enable compression in Next.js
4. Optimize images with Next.js Image component

**Apply to Your App**:
```typescript
// Batch multiple date queries
const dates = ['2024-12-25', '2024-12-26', '2024-12-27'];
const tasks = await Promise.all(
  dates.map(date => taskRepository.getByDate(date))
);

// React Query automatically deduplicates
// Multiple components requesting same query share the request
```

---

## Phase 4: Advanced Patterns (Weeks 13-16)

### 4.1 Design Systems

**Why it matters**: Consistent UI components speed up development and improve UX.

**Key Concepts**:
- **Component API Design**: Intuitive, flexible APIs
- **Composition**: Build complex from simple
- **Theming**: Support multiple themes
- **Accessibility**: WCAG compliance

**Learning Resources**:
- [shadcn/ui](https://ui.shadcn.com/) - Great example of component design
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [A11y Project](https://www.a11yproject.com/)

**Practice Exercise**:
Build a design system:
1. Create base components (Button, Input, Card)
2. Document component APIs
3. Add TypeScript types
4. Write Storybook stories
5. Ensure accessibility

**Apply to Your App**:
```typescript
// Well-designed component API
<Button
  variant="primary"
  size="large"
  disabled={false}
  onClick={handleClick}
>
  Click me
</Button>

// Flexible composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

---

### 4.2 State Machines

**Why it matters**: Complex UI state is easier to reason about with state machines.

**Key Concepts**:
- **Finite State Machines**: Explicit states and transitions
- **XState**: Library for state machines
- **State Charts**: Visual representation of state

**Learning Resources**:
- [XState Documentation](https://xstate.js.org/docs/)
- [State Machines in React](https://kentcdodds.com/blog/implementing-a-simple-state-machine-library-in-javascript)

**Practice Exercise**:
Model task editing as a state machine:
1. Define states: `idle`, `editing`, `saving`, `error`
2. Define transitions
3. Implement with XState or custom hook

**Apply to Your App**:
```typescript
// State machine for task editing
const taskEditingMachine = {
  initial: 'idle',
  states: {
    idle: {
      on: { EDIT: 'editing' },
    },
    editing: {
      on: { SAVE: 'saving', CANCEL: 'idle' },
    },
    saving: {
      on: { SUCCESS: 'idle', ERROR: 'error' },
    },
    error: {
      on: { RETRY: 'saving', CANCEL: 'idle' },
    },
  },
};
```

---

### 4.3 Advanced React Patterns

**Why it matters**: Advanced patterns solve complex problems elegantly.

**Key Concepts**:
- **Render Props**: Share logic via props
- **Higher-Order Components**: Enhance components
- **Custom Hooks**: Extract reusable logic
- **Context API**: Share data without prop drilling

**Learning Resources**:
- [React Patterns](https://reactpatterns.com/)
- [Advanced React Patterns](https://kentcdodds.com/blog/compound-components-with-react-hooks)

**Practice Exercise**:
Implement advanced patterns:
1. Create a `useTaskForm` custom hook
2. Use Context API for theme
3. Create a `withErrorBoundary` HOC
4. Implement render props for data fetching

**Apply to Your App**:
```typescript
// Custom hook
function useTaskForm(initialTask?: Task) {
  const [text, setText] = useState(initialTask?.text || '');
  const [completed, setCompleted] = useState(initialTask?.completed || false);
  
  const reset = useCallback(() => {
    setText(initialTask?.text || '');
    setCompleted(initialTask?.completed || false);
  }, [initialTask]);
  
  return { text, setText, completed, setCompleted, reset };
}

// Context API
const ThemeContext = createContext<'light' | 'dark'>('light');
```

---

## Practical Learning Approach

### 1. Learn by Refactoring

**Strategy**: Take your current app and refactor it using new concepts.

**Example**:
- Week 1: Refactor `TodoCard` into smaller components
- Week 2: Move state management to React Query + Zustand
- Week 3: Implement repository pattern
- Week 4: Add error handling

### 2. Build Small Projects

**Strategy**: Build small projects to practice specific concepts.

**Projects**:
- **Todo App**: Practice state management
- **Weather App**: Practice data fetching and caching
- **Chat App**: Practice real-time updates
- **Dashboard**: Practice performance optimization

### 3. Read Code

**Strategy**: Study well-written open-source projects.

**Recommended Projects**:
- [shadcn/ui](https://github.com/shadcn-ui/ui) - Component design
- [TanStack Query Examples](https://tanstack.com/query/latest/docs/react/examples/react/basic) - Data fetching patterns
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples) - Next.js patterns

### 4. Write Tests

**Strategy**: Writing tests forces you to understand code deeply.

**Practice**:
- Write tests for existing code
- Refactor to make code more testable
- Use TDD for new features

### 5. Document Your Learning

**Strategy**: Write about what you learn.

**Practice**:
- Write blog posts explaining concepts
- Create code comments explaining decisions
- Document architecture decisions (ADRs)

---

## Key Metrics for Progress

### Code Quality
- [ ] Components are <200 lines
- [ ] Functions are <50 lines
- [ ] TypeScript strict mode enabled
- [ ] Zero ESLint errors
- [ ] Test coverage >80%

### Architecture
- [ ] Clear separation of concerns
- [ ] Repository pattern implemented
- [ ] Error boundaries in place
- [ ] Proper state management

### Performance
- [ ] Initial load <1s
- [ ] Interactions <100ms
- [ ] Bundle size optimized
- [ ] Database queries optimized

### User Experience
- [ ] Loading states everywhere
- [ ] Error messages are user-friendly
- [ ] Keyboard navigation works
- [ ] Accessible (WCAG AA)

---

## Recommended Learning Resources

### Books
- **Clean Code** by Robert Martin
- **Designing Data-Intensive Applications** by Martin Kleppmann
- **Refactoring** by Martin Fowler

### Courses
- [Epic React](https://epicreact.dev/) by Kent C. Dodds
- [Testing JavaScript](https://testingjavascript.com/) by Kent C. Dodds
- [Next.js Course](https://nextjs.org/learn)

### Blogs
- [Kent C. Dodds Blog](https://kentcdodds.com/blog)
- [Dan Abramov's Blog](https://overreacted.io/)
- [Josh Comeau's Blog](https://www.joshwcomeau.com/)

### Communities
- [Reactiflux Discord](https://discord.gg/reactiflux)
- [r/reactjs](https://www.reddit.com/r/reactjs/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/reactjs)

---

## Next Steps

1. **Start with Phase 1**: Focus on component composition and state management
2. **Apply to Your App**: Refactor your current code as you learn
3. **Build Small Projects**: Practice concepts in isolation
4. **Join Communities**: Ask questions and learn from others
5. **Write Tests**: This will deepen your understanding

Remember: **Learning is iterative**. Don't try to learn everything at once. Focus on one concept at a time, apply it to your code, then move to the next.

Good luck! 🚀
