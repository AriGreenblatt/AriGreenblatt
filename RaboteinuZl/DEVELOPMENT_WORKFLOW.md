# Development Workflow & Error Handling Rules

## Pre-Change Checklist (ALWAYS RUN BEFORE MAKING CODE CHANGES)

### 1. Check Backend Server Status
```powershell
Get-Job | Where-Object { $_.Name -eq "BackendServer" }
```
- **If not running**: Start backend server
- **Command**: 
```powershell
Start-Job -Name "BackendServer" -ScriptBlock { Set-Location 'c:\project1\RaboteinuZl\backend'; node server.js } | Out-Null; Start-Sleep -Seconds 3; Receive-Job -Name "BackendServer"
```

### 2. Check Frontend Server Status
```powershell
Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.Path -like "*ng*" }
```
- **If not running**: Start frontend server
- **Command**:
```powershell
cd C:\project1\RaboteinuZl; npm start
```

### 3. Verify Both Servers Are Healthy
- Backend: http://localhost:3000/api/health
- Frontend: http://localhost:4200

---

## Post-Change Error Handling Protocol

### When TypeScript Compilation Errors Occur:

#### Step 1: Identify the Error
```powershell
# Check terminal output for compilation errors
```

#### Step 2: Fix the Error
Common error types:
- **TS2339 (Property does not exist)**: Add missing method/property to service/component
- **TS7006 (Implicit any type)**: Add type annotations
- **TS2345 (Argument type mismatch)**: Fix type compatibility
- **Import errors**: Add missing imports

#### Step 3: Restart Frontend (After Fix)
```powershell
# Kill existing Angular process
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Where-Object { $_.Path -like "*ng*" } | Stop-Process -Force

# Restart frontend
cd C:\project1\RaboteinuZl; npm start
```

### When Backend Errors Occur:

#### Step 1: Check Backend Logs
```powershell
Receive-Job -Name BackendServer -Keep | Select-Object -Last 30
```

#### Step 2: Fix the Error
Common error types:
- **Database connection errors**: Check SQL Server status
- **RequestError (e.g., 515 NULL constraint)**: Add missing fields with defaults
- **Syntax errors**: Fix SQL queries or JavaScript code

#### Step 3: Restart Backend (After Fix)
```powershell
# Stop existing backend job
Get-Job | Where-Object { $_.Name -eq "BackendServer" } | Stop-Job -PassThru | Remove-Job

# Restart backend
Start-Job -Name "BackendServer" -ScriptBlock { Set-Location 'c:\project1\RaboteinuZl\backend'; node server.js } | Out-Null; Start-Sleep -Seconds 3; Receive-Job -Name "BackendServer"
```

---

## Complete Server Restart Protocol (Use When Multiple Changes Made)

### Full Restart Sequence:
```powershell
# 1. Kill all processes
Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*ng*" } | Stop-Process -Force
Get-Job | Stop-Job
Get-Job | Remove-Job

# 2. Start backend first
Start-Job -Name "BackendServer" -ScriptBlock { Set-Location 'c:\project1\RaboteinuZl\backend'; node server.js } | Out-Null
Start-Sleep -Seconds 3

# 3. Verify backend started
Receive-Job -Name "BackendServer" -Keep

# 4. Start frontend
cd C:\project1\RaboteinuZl
npm start
```

---

## File Change Impact Assessment

### Changes Requiring Backend Restart:
- ✅ `backend/server.js` modifications
- ✅ `backend/database.js` modifications
- ✅ New API endpoints added
- ✅ Database query changes

### Changes Requiring Frontend Restart:
- ✅ Service modifications (`src/app/services/*.ts`)
- ✅ Component TypeScript changes (`*.component.ts`)
- ✅ Module/import changes
- ⚠️ HTML/CSS changes (auto hot-reload, but verify)

### Changes NOT Requiring Restart:
- ⚪ Pure HTML template changes (hot-reload works)
- ⚪ Pure CSS changes (hot-reload works)
- ⚪ Documentation/markdown files

---

## Browser Cache Issues

### When UI doesn't reflect changes:
1. **Hard Refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Clear Cache**: Open DevTools → Network tab → Check "Disable cache"
3. **Full Restart**: Close browser completely and reopen

---

## Quick Diagnostic Commands

### Check What's Running:
```powershell
# List all jobs
Get-Job

# List node processes
Get-Process | Where-Object { $_.ProcessName -like "*node*" }

# Check port usage
netstat -ano | findstr :3000    # Backend
netstat -ano | findstr :4200    # Frontend
```

### View Recent Errors:
```powershell
# Backend errors
Receive-Job -Name BackendServer -Keep | Select-Object -Last 30

# Frontend errors are shown in terminal where npm start was run
```

---

## Error Prevention Checklist

Before making changes:
- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] No compilation errors in terminal
- [ ] Browser is showing current version (check DevTools console)

After making changes:
- [ ] Check terminal for compilation errors
- [ ] If errors exist, fix them before proceeding
- [ ] Restart affected server(s)
- [ ] Hard refresh browser
- [ ] Verify changes are visible/working

---

## Common Error Patterns & Solutions

### Error: "Property X does not exist on type Y"
**Solution**: Add the missing property/method to the class/interface
**Action**: 
1. Fix the code
2. Restart frontend
3. Wait for compilation to complete
4. Hard refresh browser

### Error: "Port already in use"
**Solution**: Kill existing process on that port
```powershell
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force
```

### Error: "Cannot insert NULL into column"
**Solution**: Add default value (empty string '' for NOT NULL text fields)
**Action**:
1. Fix database.js to include `|| ''` for required fields
2. Restart backend
3. Retry operation

### Error: HTTP failure response (0 undefined)
**Solution**: Backend server is not running
**Action**: Start backend server using commands above

---

## MANDATORY WORKFLOW RULE

**EVERY CODE CHANGE MUST FOLLOW THIS SEQUENCE:**

1. ✅ Check servers are running
2. ✅ Make the code change
3. ✅ Check terminal for errors
4. ✅ If errors: Fix → Restart → Verify
5. ✅ If no errors: Hard refresh browser → Test
6. ✅ Verify change is working as expected

**NO EXCEPTIONS TO THIS RULE**
