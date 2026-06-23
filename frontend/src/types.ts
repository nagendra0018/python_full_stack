export type User = {
  id: number;
  email: string;
  full_name: string;
};

export type Project = {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: number;
  created_at: string;
  updated_at: string;
};
