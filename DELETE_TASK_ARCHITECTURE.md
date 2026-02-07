# Delete Task Architecture Guide

## 🏗️ Architecture Overview

This project uses a **layered architecture** with React Query for state management and Next.js Server Actions for backend operations. Here's how the delete functionality works:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Component)                      │
│  TodoCard.tsx - User clicks delete button                    │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              React Query Layer (State Management)            │
│  useDeleteTaskMutation() - Handles async state & caching     │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            API Client Layer (Frontend Interface)             │
│  tasks.ts - deleteTask() - Calls server action              │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Server Action Layer (Backend Logic)                  │
│  actions.ts - deleteTaskAction() - Deletes from database     │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Layer (Google Sheets API)              │
│  Google Sheets - Row is permanently deleted                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure & Responsibilities

### 1. **UI Component** (`src/components/TodoCard.tsx`)

**Purpose**: User interaction and optimistic updates

**Key Concepts**:
- **Optimistic Updates**: Update UI immediately before server confirms
- **Error Rollback**: Restore UI state if deletion fails
- **useCallback**: Memoize function to prevent unnecessary re-renders

```typescript
const handleDeleteTask = useCallback(
  async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // STEP 1: Optimistic Update - Remove from UI immediately
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    
    // STEP 2: Call mutation to delete from database
    deleteMutation.mutate(taskId, {
      onSuccess: () => {
        // Success - UI already updated, just show toast
        toast.success("Task deleted successfully");
      },
      onError: (error) => {
        // Error - Rollback: Restore task to UI
        setTasks((prevTasks) => {
          const newTasks = [...prevTasks];
          const insertIndex = tasks.findIndex((t) => t.id === taskId);
          newTasks.splice(insertIndex, 0, task);
          return newTasks;
        });
        toast.error("Failed to delete task");
      },
    });
  },
  [tasks, deleteMutation]
);
```

**Why this pattern?**
- **Optimistic updates** = Better UX (feels instant)
- **Error rollback** = Data consistency (UI matches reality)
- **useCallback** = Performance (function doesn't recreate on every render)

---

### 2. **React Query Hook** (`src/hooks/useTasksQuery.ts`)

**Purpose**: Wraps API calls with React Query's mutation system

**Key Concepts**:
- **useMutation**: React Query hook for write operations
- **mutationFn**: The actual function that does the work
- **onSuccess**: Callback after successful mutation
- **queryClient.invalidateQueries**: Refreshes cached data

```typescript
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // This function runs when you call .mutate()
    mutationFn: (taskId: string) => deleteTask(taskId),
    
    // After successful deletion, refresh the task list
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
```

**Why React Query?**
- **Automatic loading/error states**
- **Request deduplication** (prevents duplicate calls)
- **Cache invalidation** (refreshes data after mutations)
- **Retry logic** (can retry failed requests)

**Usage in component**:
```typescript
const deleteMutation = useDeleteTaskMutation();
// Later...
deleteMutation.mutate(taskId, { onSuccess: ..., onError: ... });
```

---

### 3. **API Client** (`src/lib/tasks.ts`)

**Purpose**: Frontend interface to backend - abstracts server actions

**Key Concepts**:
- **Dynamic import**: Loads server action only when needed
- **Error handling**: Catches and re-throws errors
- **Type safety**: TypeScript ensures correct function signatures

```typescript
export async function deleteTask(taskId: string): Promise<void> {
  try {
    // Dynamic import - only loads when called
    const { deleteTaskAction } = await import("@/app/api/tasks/actions");
    await deleteTaskAction(taskId);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error; // Re-throw so React Query can handle it
  }
}
```

**Why this layer?**
- **Separation of concerns**: Component doesn't know about server actions
- **Reusability**: Can be used from anywhere in the app
- **Type safety**: TypeScript catches errors at compile time

---

### 4. **Server Action** (`src/app/api/tasks/actions.ts`)

**Purpose**: Server-side logic that actually deletes from database

**Key Concepts**:
- **"use server"**: Next.js directive - runs on server only
- **Environment variables**: Access to secrets (API keys, etc.)
- **Database operations**: Direct access to Google Sheets API
- **Error handling**: Validates input and handles errors

```typescript
"use server"; // This file runs on the server

export async function deleteTaskAction(taskId: string) {
  // Validation
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  // Security check (server-side only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }

  // Connect to database
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // Find the task
  const range = `${sheetName}!A2:F1000`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const taskRowIndex = rows.findIndex((row) => row[0] === taskId);

  if (taskRowIndex === -1) {
    throw new Error("Task not found");
  }

  // Get sheet metadata to find sheet ID
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = sheet?.properties?.sheetId;

  // Delete the row
  const actualRowNumber = taskRowIndex + 2; // +2 because array is 0-indexed and we skip header

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: actualRowNumber - 1, // 0-indexed
              endIndex: actualRowNumber,
            },
          },
        },
      ],
    },
  });

  return { success: true, message: "Task deleted successfully" };
}
```

**Why Server Actions?**
- **Security**: API keys never exposed to client
- **Type safety**: TypeScript ensures correct types
- **Simpler than REST**: No need to create API routes
- **Automatic serialization**: Next.js handles data transfer

---

## 🔄 Complete Flow Example

Let's trace what happens when a user clicks delete:

### Step 1: User Clicks Delete Button
```typescript
// TodoCard.tsx
<button onClick={() => handleDeleteTask(task.id)}>
  <Trash2 />
</button>
```

### Step 2: Optimistic UI Update
```typescript
// TodoCard.tsx - handleDeleteTask()
setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
// Task disappears from UI immediately! ✨
```

### Step 3: Call Mutation
```typescript
// TodoCard.tsx
deleteMutation.mutate(taskId, { onSuccess: ..., onError: ... });
```

### Step 4: React Query Calls API Client
```typescript
// useTasksQuery.ts
mutationFn: (taskId: string) => deleteTask(taskId)
// ↓
// tasks.ts
await deleteTaskAction(taskId);
```

### Step 5: Server Action Executes
```typescript
// actions.ts
// 1. Validates input
// 2. Connects to Google Sheets
// 3. Finds the task row
// 4. Deletes the row
// 5. Returns success
```

### Step 6: Success/Error Handling
```typescript
// If success:
onSuccess: () => {
  toast.success("Task deleted successfully");
  // React Query automatically refreshes task list
}

// If error:
onError: (error) => {
  // Restore task to UI (rollback)
  setTasks(...);
  toast.error("Failed to delete task");
}
```

---

## 🎯 Key Patterns to Recreate

### Pattern 1: Optimistic Updates
```typescript
// 1. Update UI immediately
setState(newState);

// 2. Call mutation
mutation.mutate(data, {
  onError: () => {
    // 3. Rollback on error
    setState(oldState);
  }
});
```

### Pattern 2: React Query Mutation Hook
```typescript
export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
```

### Pattern 3: Server Action
```typescript
"use server";

export async function deleteItemAction(id: string) {
  // Validation
  if (!id) throw new Error("ID required");
  
  // Database operation
  await database.delete(id);
  
  return { success: true };
}
```

### Pattern 4: API Client Wrapper
```typescript
export async function deleteItem(id: string): Promise<void> {
  const { deleteItemAction } = await import("@/app/api/items/actions");
  await deleteItemAction(id);
}
```

---

## 🛠️ How to Recreate This Pattern

### Step 1: Create Server Action
```typescript
// src/app/api/items/actions.ts
"use server";

export async function deleteItemAction(id: string) {
  // Your delete logic here
  await database.delete(id);
  return { success: true };
}
```

### Step 2: Create API Client
```typescript
// src/lib/items.ts
export async function deleteItem(id: string): Promise<void> {
  const { deleteItemAction } = await import("@/app/api/items/actions");
  await deleteItemAction(id);
}
```

### Step 3: Create React Query Hook
```typescript
// src/hooks/useItemsQuery.ts
export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
```

### Step 4: Use in Component
```typescript
// src/components/ItemList.tsx
const deleteMutation = useDeleteItemMutation();

const handleDelete = (id: string) => {
  // Optimistic update
  setItems(items.filter(item => item.id !== id));
  
  // Call mutation
  deleteMutation.mutate(id, {
    onSuccess: () => toast.success("Deleted!"),
    onError: () => {
      // Rollback
      setItems(originalItems);
      toast.error("Failed to delete");
    },
  });
};
```

---

## 💡 Key Takeaways

1. **Layered Architecture**: Each layer has a specific responsibility
2. **Optimistic Updates**: Update UI first, then sync with server
3. **Error Rollback**: Always restore UI state on error
4. **React Query**: Handles loading states, caching, and refetching
5. **Server Actions**: Secure server-side operations
6. **Type Safety**: TypeScript ensures correctness at every layer

---

## 🔍 Common Variations

### Variation 1: Without Optimistic Updates
```typescript
// Wait for server confirmation before updating UI
deleteMutation.mutate(id, {
  onSuccess: () => {
    setItems(items.filter(item => item.id !== id));
  }
});
```

### Variation 2: With Loading State
```typescript
const deleteMutation = useDeleteItemMutation();

// Show loading indicator
{deleteMutation.isPending && <Spinner />}
```

### Variation 3: Batch Delete
```typescript
const handleBatchDelete = (ids: string[]) => {
  Promise.all(ids.map(id => deleteMutation.mutateAsync(id)))
    .then(() => toast.success("All deleted!"))
    .catch(() => toast.error("Some failed"));
};
```

---

This architecture provides:
- ✅ **Great UX** (optimistic updates)
- ✅ **Data consistency** (error rollback)
- ✅ **Type safety** (TypeScript)
- ✅ **Security** (server actions)
- ✅ **Performance** (React Query caching)
- ✅ **Maintainability** (clear separation of concerns)

