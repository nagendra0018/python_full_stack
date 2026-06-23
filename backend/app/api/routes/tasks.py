from fastapi import APIRouter, HTTPException, Query, status

from app import crud
from app.api.deps import CurrentUser, DbSession
from app.schemas.task import TaskBulkCreate, TaskBulkCreateResult, TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def ensure_project_access(db: DbSession, user_id: int, project_id: int) -> None:
    if crud.get_project(db, user_id, project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.get("", response_model=list[TaskRead])
def get_tasks(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[TaskRead]:
    return crud.list_tasks(db, current_user.id, limit=limit, offset=offset)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def post_task(task_in: TaskCreate, db: DbSession, current_user: CurrentUser) -> TaskRead:
    ensure_project_access(db, current_user.id, task_in.project_id)
    return crud.create_task(db, current_user.id, task_in)


@router.post("/bulk", response_model=TaskBulkCreateResult, status_code=status.HTTP_201_CREATED)
def post_tasks_bulk(task_bulk_in: TaskBulkCreate, db: DbSession, current_user: CurrentUser) -> TaskBulkCreateResult:
    project_ids = {task.project_id for task in task_bulk_in.tasks}
    for project_id in project_ids:
        ensure_project_access(db, current_user.id, project_id)
    inserted_count = crud.bulk_create_tasks(db, current_user.id, task_bulk_in.tasks)
    return TaskBulkCreateResult(inserted_count=inserted_count)


@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(task_id: int, task_in: TaskUpdate, db: DbSession, current_user: CurrentUser) -> TaskRead:
    task = crud.get_task(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task_in.project_id is not None:
        ensure_project_access(db, current_user.id, task_in.project_id)
    return crud.update_task(db, task, task_in)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: DbSession, current_user: CurrentUser) -> None:
    task = crud.get_task(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()
