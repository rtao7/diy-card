export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

export class TaskNotFoundError extends Error {
  constructor() {
    super("Task not found");
    this.name = "TaskNotFoundError";
  }
}

export class SheetAccessError extends Error {
  hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = "SheetAccessError";
    this.hint = hint;
  }
}
