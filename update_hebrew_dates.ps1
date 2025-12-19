# Update Hebrew Date Fields Script
# Converts Gregorian years to Hebrew years for all records in Talmidei_Hahamim table

$server = "localhost\SQLEXPRESS"
$database = "Hazal"

Write-Host "Updating Hebrew dates in Talmidei_Hahamim table..." -ForegroundColor Cyan

# Function to convert Gregorian year to Hebrew year
function Convert-GregorianToHebrewYear {
    param([int]$gregorianYear)
    
    if ($gregorianYear -eq $null -or $gregorianYear -eq 0) {
        return $null
    }
    
    # Hebrew year = Gregorian year + 3760
    # Note: This is approximate - actual conversion depends on the specific date
    # For dates before Rosh Hashanah (usually Sept/Oct), we use +3760
    # For dates after Rosh Hashanah, we use +3761
    # Since we don't have the exact date, we'll use +3760 as default
    return $gregorianYear + 3760
}

# SQL query to get all records with Gregorian dates
$query = @"
SELECT RabbiID, YearOfBirth, YearOfDeath, HebDob, HebDoP
FROM dbo.Talmidei_Hahamim
WHERE YearOfBirth IS NOT NULL OR YearOfDeath IS NOT NULL
ORDER BY RabbiID
"@

try {
    # Get all records
    $records = Invoke-Sqlcmd -ServerInstance $server -Database $database -Query $query -TrustServerCertificate -ErrorAction Stop
    
    Write-Host "Found $($records.Count) records to process" -ForegroundColor Yellow
    
    $updated = 0
    $skipped = 0
    $errors = 0
    
    foreach ($record in $records) {
        $rabbiId = $record.RabbiID
        $yob = $record.YearOfBirth
        $yod = $record.YearOfDeath
        $currentHebDob = $record.HebDob
        $currentHebDoP = $record.HebDoP
        
        # Calculate Hebrew years
        $hebDob = if ($yob) { Convert-GregorianToHebrewYear $yob } else { $null }
        $hebDoP = if ($yod) { Convert-GregorianToHebrewYear $yod } else { $null }
        
        # Check if update is needed (only update if currently NULL or different)
        $needsUpdate = $false
        
        if ($hebDob -and ($currentHebDob -eq [DBNull]::Value -or $currentHebDob -eq $null)) {
            $needsUpdate = $true
        }
        if ($hebDoP -and ($currentHebDoP -eq [DBNull]::Value -or $currentHebDoP -eq $null)) {
            $needsUpdate = $true
        }
        
        if ($needsUpdate) {
            # Build update query
            $updateQuery = "UPDATE dbo.Talmidei_Hahamim SET "
            $updates = @()
            
            if ($hebDob -and ($currentHebDob -eq [DBNull]::Value -or $currentHebDob -eq $null)) {
                $updates += "HebDob = $hebDob"
            }
            if ($hebDoP -and ($currentHebDoP -eq [DBNull]::Value -or $currentHebDoP -eq $null)) {
                $updates += "HebDoP = $hebDoP"
            }
            
            if ($updates.Count -gt 0) {
                $updateQuery += ($updates -join ", ")
                $updateQuery += " WHERE RabbiID = $rabbiId;"
                
                try {
                    Invoke-Sqlcmd -ServerInstance $server -Database $database -Query $updateQuery -TrustServerCertificate -ErrorAction Stop
                    Write-Host "✓ Updated RabbiID $rabbiId - YOB: $yob->$hebDob, YOD: $yod->$hebDoP" -ForegroundColor Green
                    $updated++
                }
                catch {
                    Write-Host "✗ Error updating RabbiID $rabbiId : $_" -ForegroundColor Red
                    $errors++
                }
            }
        }
        else {
            Write-Host "- Skipped RabbiID $rabbiId (already has Hebrew dates)" -ForegroundColor Gray
            $skipped++
        }
    }
    
    Write-Host "`nSummary:" -ForegroundColor Cyan
    Write-Host "  Total records processed: $($records.Count)" -ForegroundColor White
    Write-Host "  Updated: $updated" -ForegroundColor Green
    Write-Host "  Skipped: $skipped" -ForegroundColor Yellow
    Write-Host "  Errors: $errors" -ForegroundColor Red
    
    if ($errors -eq 0) {
        Write-Host "`n✓ Hebrew dates updated successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
