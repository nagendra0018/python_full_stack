import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  LogOut,
  Plus,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { api } from "./api";
import type { Project, Task, TaskPriority, TaskStatus, User } from "./types";

const tokenKey = "taskflow_token";
const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

function statusLabel(status: TaskStatus) {
  return status.replace("_", " ");
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(tokenKey) ?? "",
  );
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authForm, setAuthForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    project_id: "",
    priority: "medium" as TaskPriority,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData(activeToken = token) {
    if (!activeToken) return;
    const [profile, projectList, taskList] = await Promise.all([
      api.me(activeToken),
      api.projects(activeToken),
      api.tasks(activeToken),
    ]);
    setUser(profile);
    setProjects(projectList);
    setTasks(taskList);
  }

  useEffect(() => {
    loadData().catch(() => {
      localStorage.removeItem(tokenKey);
      setToken("");
    });
  }, []);

  const taskCounts = useMemo(() => {
    return statuses.reduce<Record<TaskStatus, number>>(
      (counts, status) => {
        counts[status] = tasks.filter((task) => task.status === status).length;
        return counts;
      },
      { todo: 0, in_progress: 0, done: 0 },
    );
  }, [tasks]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (authMode === "register") {
        await api.register(authForm);
      }
      const auth = await api.login({
        email: authForm.email,
        password: authForm.password,
      });
      localStorage.setItem(tokenKey, auth.access_token);
      setToken(auth.access_token);
      await loadData(auth.access_token);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError("");
    try {
      await api.createProject(token, projectForm);
      setProjectForm({ name: "", description: "" });
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create project",
      );
    }
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!token || !taskForm.project_id) return;
    setError("");
    try {
      await api.createTask(token, {
        title: taskForm.title,
        description: taskForm.description,
        project_id: Number(taskForm.project_id),
        priority: taskForm.priority,
      });
      setTaskForm({
        title: "",
        description: "",
        project_id: taskForm.project_id,
        priority: "medium",
      });
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create task",
      );
    }
  }

  async function moveTask(task: Task, status: TaskStatus) {
    if (!token) return;
    await api.updateTask(token, task.id, { status });
    await loadData();
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setToken("");
    setUser(null);
    setProjects([]);
    setTasks([]);
  }

  if (!token || !user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-row">
            <Rocket size={30} />
            <div>
              <h1>TaskFlow</h1>
              <p>Full-stack Python project for EC2 and RDS</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="form-grid">
            <div className="mode-switch" role="tablist">
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
            </div>
            {authMode === "register" && (
              <label>
                Full name
                <input
                  value={authForm.full_name}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, full_name: event.target.value })
                  }
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({ ...authForm, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({ ...authForm, password: event.target.value })
                }
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="primary-button" disabled={loading}>
              {loading
                ? "Please wait"
                : authMode === "register"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-row compact">
          <Rocket size={26} />
          <div>
            <h1>TaskFlow</h1>
            <p>{user.full_name}</p>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={20} />
        </button>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="metrics-grid">
        <div>
          <Circle size={22} />
          <span>Todo</span>
          <strong>{taskCounts.todo}</strong>
        </div>
        <div>
          <Clock3 size={22} />
          <span>In progress</span>
          <strong>{taskCounts.in_progress}</strong>
        </div>
        <div>
          <CheckCircle2 size={22} />
          <span>Done</span>
          <strong>{taskCounts.done}</strong>
        </div>
        <div>
          <ShieldCheck size={22} />
          <span>Projects</span>
          <strong>{projects.length}</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="panel">
          <h2>Create Project</h2>
          <form onSubmit={handleCreateProject} className="form-grid">
            <label>
              Name
              <input
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, name: event.target.value })
                }
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <button className="primary-button">
              <Plus size={18} /> Add project
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Create Task</h2>
          <form onSubmit={handleCreateTask} className="form-grid">
            <label>
              Title
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, title: event.target.value })
                }
                required
              />
            </label>
            <label>
              Project
              <select
                value={taskForm.project_id}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, project_id: event.target.value })
                }
                required
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    priority: event.target.value as TaskPriority,
                  })
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, description: event.target.value })
                }
              />
            </label>
            <button className="primary-button">
              <Plus size={18} /> Add task
            </button>
          </form>
        </div>
      </section>

      <section className="board-grid">
        {statuses.map((status) => (
          <div className="task-column" key={status}>
            <h2>{statusLabel(status)}</h2>
            {tasks
              .filter((task) => task.status === status)
              .map((task) => {
                const project = projects.find(
                  (item) => item.id === task.project_id,
                );
                return (
                  <article className="task-card" key={task.id}>
                    <div className="task-card-header">
                      <strong>{task.title}</strong>
                      <span className={`priority ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p>{task.description || "No description"}</p>
                    <small>{project?.name ?? "Project"}</small>
                    <select
                      value={task.status}
                      onChange={(event) =>
                        moveTask(task, event.target.value as TaskStatus)
                      }
                    >
                      {statuses.map((nextStatus) => (
                        <option key={nextStatus} value={nextStatus}>
                          {statusLabel(nextStatus)}
                        </option>
                      ))}
                    </select>
                  </article>
                );
              })}
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;
