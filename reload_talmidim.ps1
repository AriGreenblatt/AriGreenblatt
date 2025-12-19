# Set UTF-8 encoding for Hebrew text
chcp 65001 > $null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Import CSV file with UTF-8 encoding
$csvPath = "c:\temp\תלמידים 2.csv"
$records = Import-Csv -Path $csvPath -Encoding utf8

Write-Host "Starting import of $($records.Count) Talmidim records..."

$successCount = 0
$errorCount = 0
$counter = 0

foreach ($record in $records) {
    $counter++
    
    # Handle NULL values
    $id = if ($record.ID -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.ID)) { "NULL" } else { $record.ID }
    $rabbiId = if ($record.RabbiID -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.RabbiID)) { "NULL" } else { $record.RabbiID }
    $teacherId = if ($record.TeacherID -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.TeacherID)) { "NULL" } else { $record.TeacherID }
    $fromYear = if ($record.FromYear -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.FromYear)) { "NULL" } else { $record.FromYear }
    $toYear = if ($record.ToYear -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.ToYear)) { "NULL" } else { $record.ToYear }
    $place = if ($record.Place -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.Place)) { "NULL" } else { "N'" + $record.Place.Replace("'", "''") + "'" }
    $notes = if ($record.Notes -eq "NULL" -or [string]::IsNullOrWhiteSpace($record.Notes)) { "NULL" } else { "N'" + $record.Notes.Replace("'", "''") + "'" }
    
    $sql = @"
SET IDENTITY_INSERT dbo.Talmidim ON;
INSERT INTO dbo.Talmidim (ID, RabbiID, TeacherID, FromYear, ToYear, Place, Notes)
VALUES ($id, $rabbiId, $teacherId, $fromYear, $toYear, $place, $notes);
SET IDENTITY_INSERT dbo.Talmidim OFF;
"@

    try {
        sqlcmd -S localhost\SQLEXPRESS -d Hazal -Q $sql -b
        if ($LASTEXITCODE -eq 0) {
            $successCount++
            if ($counter % 10 -eq 0) {
                Write-Host "Processed $counter records... ($successCount successful, $errorCount errors)"
            }
        } else {
            $errorCount++
            Write-Host "Error inserting record ID $id (Rabbi: $rabbiId, Teacher: $teacherId)" -ForegroundColor Red
        }
    }
    catch {
        $errorCount++
        Write-Host "Exception inserting record ID $id : $_" -ForegroundColor Red
    }
}

Write-Host "`nImport complete!" -ForegroundColor Green
Write-Host "Total records: $($records.Count)" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
