from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app import crud
from app.api.deps import CurrentUser, DbSession
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def get_projects(db: DbSession, current_user: CurrentUser) -> list[ProjectRead]:
    return crud.list_projects(db, current_user.id)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def post_project(project_in: ProjectCreate, db: DbSession, current_user: CurrentUser) -> ProjectRead:
    return crud.create_project(db, current_user.id, project_in)


@router.patch("/{project_id}", response_model=ProjectRead)
def patch_project(project_id: int, project_in: ProjectUpdate, db: DbSession, current_user: CurrentUser) -> ProjectRead:
    project = crud.get_project(db, current_user.id, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return crud.update_project(db, project, project_in)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: DbSession, current_user: CurrentUser) -> None:
    project = crud.get_project(db, current_user.id, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()
