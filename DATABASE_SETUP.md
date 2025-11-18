# RaboteinuZl Database Connection Setup

## Prerequisites
Before running the application, make sure you have:
1. **MSSQL 2019 Express** installed and running
2. **Database "talmidei-hahamim"** exists and is accessible
3. **Node.js** and **npm** installed
4. **Angular CLI** installed globally (`npm install -g @angular/cli`)

## Configuration Steps

### 1. Configure Database Connection
Edit the file `backend/.env` and update the database credentials:

```env
# Database Configuration
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=talmidei-hahamim
DB_USERNAME=your_username_here
DB_PASSWORD=your_password_here
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# API Configuration
API_PORT=3000
NODE_ENV=development
```

**Note:** If you're using Windows Authentication, leave `DB_USERNAME` and `DB_PASSWORD` empty.

### 2. Start the Backend API Server
Open PowerShell and run:
```powershell
cd h:\git\project1\RaboteinuZl\backend
npm start
```

The API will be available at: http://localhost:3000

### 3. Start the Angular Development Server
Open another PowerShell window and run:
```powershell
cd h:\git\project1\RaboteinuZl
ng serve
```

The Angular app will be available at: http://localhost:4200

## API Endpoints

Once the backend is running, you can test these endpoints:

- **Health Check:** `GET http://localhost:3000/api/health`
- **Test Connection:** `GET http://localhost:3000/api/test-connection`
- **List Tables:** `GET http://localhost:3000/api/tables`
- **Table Structure:** `GET http://localhost:3000/api/tables/{tableName}/structure`
- **Table Data:** `GET http://localhost:3000/api/tables/{tableName}/data`
- **Custom Query:** `POST http://localhost:3000/api/query`

## Features Included

✅ **Full-stack setup** - Angular frontend + Node.js backend
✅ **MSSQL connectivity** - Direct connection to your talmidei-hahamim database
✅ **Database explorer** - View tables, structures, and data
✅ **REST API** - Clean endpoints for all database operations
✅ **Error handling** - Proper error messages and status indicators
✅ **Security considerations** - Parameterized queries and input validation

## Troubleshooting

### Database Connection Issues
1. Verify MSSQL Server is running: `Services.msc` → SQL Server (SQLEXPRESS)
2. Check if TCP/IP is enabled: SQL Server Configuration Manager
3. Verify database exists: Connect with SQL Server Management Studio (SSMS)
4. Test credentials in the `.env` file

### Port Conflicts
- Backend API (port 3000): Change `API_PORT` in `.env`
- Angular dev server (port 4200): Use `ng serve --port 4201`

### Network Issues
- For Windows Authentication: Use `trusted_connection=true`
- For remote connections: Update firewall rules and server configuration

## Development

The project is set up for development with:
- **Hot reload** for both frontend and backend
- **CORS enabled** for cross-origin requests
- **Environment variables** for easy configuration
- **TypeScript** for type safety
- **Angular services** for clean API communication

Happy coding! 🚀