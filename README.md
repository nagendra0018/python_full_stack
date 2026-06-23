# TaskFlow Full Stack Python Project

TaskFlow is a full-stack Python project designed for AWS EC2 deployment with an AWS RDS MySQL database.

It includes:

- React + Vite frontend
- FastAPI Python backend
- MySQL/RDS database connection code using username and password from environment variables
- JWT authentication
- REST APIs for users, projects, and tasks
- Alembic database migrations
- Nginx EC2 deployment instructions

No Docker or Kubernetes is required.

## Project Structure

```text
backend/          FastAPI backend API
frontend/         React frontend application
infra/            AWS EC2 + RDS deployment guide
.env.example      Root environment template
```

## Backend APIs

Base URL:

```text
http://localhost:8000/api/v1
```

Main endpoints:

```text
POST   /auth/register
POST   /auth/login
GET    /auth/me
GET    /projects
POST   /projects
PATCH  /projects/{project_id}
DELETE /projects/{project_id}
GET    /tasks
GET    /tasks?limit=100&offset=0
POST   /tasks
POST   /tasks/bulk
PATCH  /tasks/{task_id}
DELETE /tasks/{task_id}
```

Bulk task insert accepts up to 1000 rows per request:

```json
{
  "tasks": [
    {
      "title": "Prepare customer report",
      "description": "Load initial report data into RDS",
      "status": "todo",
      "priority": "high",
      "project_id": 1
    }
  ]
}
```

For very large datasets, send data to `/tasks/bulk` in batches of 500 to 1000 records, or load CSV/SQL files directly from EC2 using MySQL tools and use the APIs for application workflows.

FastAPI Swagger docs:

```text
http://localhost:8000/docs
```

## RDS Database Configuration

The backend connects to MySQL using `DATABASE_URL`. Put the RDS username, password, endpoint, port, and database name in this value.

For AWS RDS MySQL:

```env
DATABASE_URL=mysql+pymysql://RDS_USER:RDS_PASSWORD@RDS_ENDPOINT:3306/RDS_DB_NAME
```

## Run Backend Locally

Create `backend/.env` from the template:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your RDS or local MySQL values.

Install and run:

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

On macOS/Linux, activate with:

```bash
source .venv/bin/activate
```

## Run Frontend Locally

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Install and run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Deploy To AWS EC2

Use the step-by-step guide:

[infra/aws-ec2-rds-deploy.md](infra/aws-ec2-rds-deploy.md)

The deployment approach is:

1. Create AWS RDS MySQL.
2. Launch Ubuntu EC2.
3. Install Python, Node.js, PM2, Nginx, and MySQL client.
4. Configure backend `.env` with the RDS username, password, endpoint, and database name.
5. Run Alembic migrations against RDS.
6. Run FastAPI with Gunicorn and PM2.
7. Build React frontend.
8. Serve frontend and proxy `/api/v1` through Nginx.

## Notes

- Keep `SECRET_KEY` private in production.
- Do not commit real passwords or AWS credentials.
- In AWS security groups, allow RDS MySQL port `3306` only from the EC2 security group.
