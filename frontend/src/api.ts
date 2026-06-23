import type { Project, Task, TaskPriority, TaskStatus, User } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

type AuthResponse = {
  access_token: string;
  token_type: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  register(payload: { full_name: string; email: string; password: string }) {
    return request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me(token: string) {
    return request<User>("/auth/me", {}, token);
  },
  projects(token: string) {
    return request<Project[]>("/projects", {}, token);
  },
  createProject(
    token: string,
    payload: { name: string; description?: string },
  ) {
    return request<Project>(
      "/projects",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
  },
  tasks(token: string) {
    return request<Task[]>("/tasks", {}, token);
  },
  createTask(
    token: string,
    payload: {
      title: string;
      description?: string;
      project_id: number;
      priority: TaskPriority;
    },
  ) {
    return request<Task>(
      "/tasks",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
  },
  updateTask(
    token: string,
    taskId: number,
    payload: Partial<{
      title: string;
      description: string;
      project_id: number;
      priority: TaskPriority;
      status: TaskStatus;
    }>,
  ) {
    return request<Task>(
      `/tasks/${taskId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    );
  },
};
