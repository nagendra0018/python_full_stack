from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.auth import UserCreate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.task import TaskCreate, TaskUpdate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def create_user(db: Session, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def list_projects(db: Session, owner_id: int) -> list[Project]:
    return list(db.scalars(select(Project).where(Project.owner_id == owner_id).order_by(Project.created_at.desc())))


def create_project(db: Session, owner_id: int, project_in: ProjectCreate) -> Project:
    project = Project(owner_id=owner_id, **project_in.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_project(db: Session, owner_id: int, project_id: int) -> Project | None:
    return db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == owner_id))


def update_project(db: Session, project: Project, project_in: ProjectUpdate) -> Project:
    for field, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


def list_tasks(db: Session, owner_id: int, limit: int = 100, offset: int = 0) -> list[Task]:
    return list(
        db.scalars(
            select(Task)
            .where(Task.owner_id == owner_id)
            .order_by(Task.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )


def create_task(db: Session, owner_id: int, task_in: TaskCreate) -> Task:
    task = Task(owner_id=owner_id, **task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def bulk_create_tasks(db: Session, owner_id: int, tasks_in: list[TaskCreate]) -> int:
    tasks = [Task(owner_id=owner_id, **task_in.model_dump()) for task_in in tasks_in]
    db.bulk_save_objects(tasks)
    db.commit()
    return len(tasks)


def get_task(db: Session, owner_id: int, task_id: int) -> Task | None:
    return db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == owner_id))


def update_task(db: Session, task: Task, task_in: TaskUpdate) -> Task:
    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task
