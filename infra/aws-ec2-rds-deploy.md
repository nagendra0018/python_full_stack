# AWS EC2 + RDS Deployment Without Docker

This guide deploys the frontend and backend directly on an Ubuntu EC2 instance and connects the FastAPI backend to AWS RDS MySQL.

## 1. Create RDS MySQL

1. Open AWS RDS and create a MySQL database.
2. Save the database name, username, password, port, and endpoint.
3. In the RDS security group, allow inbound MySQL port `3306` from the EC2 security group.
4. Do not make RDS public unless your organization requires it.

## 2. Create EC2

1. Launch Ubuntu 22.04 or 24.04 EC2.
2. In the EC2 security group, allow inbound:
   - `22` for SSH
   - `80` for HTTP
   - `443` for HTTPS when SSL is configured
3. SSH into EC2.

## 3. Install Server Packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nodejs npm nginx mysql-client
sudo npm install -g pm2
```

For newer Node.js, install NodeSource Node 20 before running `npm install`.

## 4. Upload Project

From your local machine, copy the project to EC2:

```bash
scp -r Python_full_stack_project ubuntu@EC2_PUBLIC_IP:/home/ubuntu/taskflow
```

## 5. Configure Backend Environment

On EC2:

```bash
cd /home/ubuntu/taskflow
cp .env.example .env
nano .env
```

Set these values:

```env
ENVIRONMENT=production
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=mysql+pymysql://RDS_USER:RDS_PASSWORD@RDS_ENDPOINT:3306/RDS_DB_NAME
CORS_ORIGINS=http://EC2_PUBLIC_IP,https://your-domain.com
VITE_API_BASE_URL=/api/v1
```

Test RDS connectivity:

```bash
mysql -h RDS_ENDPOINT -P 3306 -u RDS_USER -p RDS_DB_NAME -e "select version();"
```

## 6. Run Backend

```bash
cd /home/ubuntu/taskflow/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pm2 start "gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --workers 3" --name taskflow-backend
pm2 save
pm2 startup
```

## 7. Build Frontend

```bash
cd /home/ubuntu/taskflow/frontend
npm install
VITE_API_BASE_URL=/api/v1 npm run build
sudo mkdir -p /var/www/taskflow
sudo cp -r dist/* /var/www/taskflow/
```

## 8. Configure Nginx

Create `/etc/nginx/sites-available/taskflow`:

```nginx
server {
    listen 80;
    server_name EC2_PUBLIC_IP your-domain.com;

    root /var/www/taskflow;
    index index.html;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/taskflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Verify

```bash
curl http://EC2_PUBLIC_IP/health
```

Open:

```text
http://EC2_PUBLIC_IP
```

## 10. Insert Large Data Into RDS

The backend exposes normal CRUD APIs and a bulk insert API:

```text
GET    /api/v1/tasks?limit=100&offset=0
POST   /api/v1/tasks
POST   /api/v1/tasks/bulk
PATCH  /api/v1/tasks/{task_id}
DELETE /api/v1/tasks/{task_id}
```

Use `/api/v1/tasks/bulk` for API-driven inserts and send 500 to 1000 records per request. For very large CSV or SQL imports, connect from EC2 to RDS with `mysql` and load the data directly, then use the APIs to read and manage it.

Example direct EC2-to-RDS connection:

```bash
mysql -h RDS_ENDPOINT -P 3306 -u RDS_USER -p RDS_DB_NAME
```

## Optional SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
