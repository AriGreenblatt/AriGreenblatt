# Development Rules

This document contains rules and shortcuts for development workflow. Copilot should refer to this document and follow these rules.

---

## Rule 1: `ra` (Run Again)

**Trigger:** User types `ra`

**Action:** Kill all background and foreground processes, then restart both servers:

1. Stop all Node processes
2. Start the backend server: `cd C:\project1\backend; node server.js` (background)
3. Start the Angular frontend: `cd C:\project1; npx ng serve` (background)

**Commands to execute:**
```powershell
# Kill existing processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend (background)
cd C:\project1\backend; Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js"

# Start frontend (background)
cd C:\project1; npx ng serve
```

---

*Add more rules below as needed*
