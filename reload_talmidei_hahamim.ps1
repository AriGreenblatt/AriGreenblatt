# PowerShell script to reload Talmidei_Hahamim table from CSV
# This will DELETE all existing data and reload fresh data

$csvPath = "c:\project1\תלמידי חכמים3.csv"
$serverInstance = "localhost\SQLEXPRESS"
$database = "Hazal"

# Set console to UTF-8 for proper display of Hebrew
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Starting data reload process..." -ForegroundColor Cyan

# Import the CSV file with UTF8 encoding to handle Hebrew text
Write-Host "Reading CSV file..." -ForegroundColor Yellow
$data = Import-Csv -Path $csvPath -Encoding utf8 | Where-Object { $_.RabbiID -ne $null -and $_.RabbiID -ne "" }

Write-Host "Found $($data.Count) records in CSV file" -ForegroundColor Green

# Display first record to verify Hebrew text
if ($data.Count -gt 0) {
    Write-Host "`nSample record (first entry):" -ForegroundColor Cyan
    Write-Host "  RabbiID: $($data[0].RabbiID)" -ForegroundColor Gray
    Write-Host "  FullName: $($data[0].FullName)" -ForegroundColor Gray
    Write-Host "  City: $($data[0].City)" -ForegroundColor Gray
    Write-Host ""
}

# Create SQL connection
$connectionString = "Server=$serverInstance;Database=$database;Integrated Security=True;TrustServerCertificate=True;"
$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = $connectionString

try {
    $connection.Open()
    Write-Host "Connected to database" -ForegroundColor Green
    
    # First, delete all existing data from dependent tables
    Write-Host "Deleting existing data from dependent tables..." -ForegroundColor Yellow
    
    $deleteQueries = @(
        "DELETE FROM dbo.Events",
        "DELETE FROM dbo.Talmidim",
        "DELETE FROM dbo.Talmidei_Hahamim"
    )
    
    foreach ($query in $deleteQueries) {
        $command = $connection.CreateCommand()
        $command.CommandText = $query
        $rowsAffected = $command.ExecuteNonQuery()
        Write-Host "Executed: $query - Rows affected: $rowsAffected" -ForegroundColor Gray
    }
    
    # Reset identity seed
    Write-Host "Resetting identity seed..." -ForegroundColor Yellow
    $command = $connection.CreateCommand()
    $command.CommandText = "DBCC CHECKIDENT ('dbo.Talmidei_Hahamim', RESEED, 0)"
    $command.ExecuteNonQuery() | Out-Null
    
    # Insert new data
    Write-Host "Inserting new data..." -ForegroundColor Yellow
    $insertedCount = 0
    $errorCount = 0
    
    foreach ($row in $data) {
        try {
            # Handle NULL values and empty strings
            $rabbiID = if ($row.RabbiID) { $row.RabbiID } else { "NULL" }
            $fullName = if ($row.FullName) { $row.FullName.Replace("'", "''") } else { "" }
            $city = if ($row.City) { $row.City.Replace("'", "''") } else { "" }
            $country = if ($row.Country) { $row.Country.Replace("'", "''") } else { "" }
            $period = if ($row.Period) { $row.Period.Replace("'", "''") } else { "" }
            $yearOfBirth = if ($row.YearOfBirth -and $row.YearOfBirth -ne "0") { $row.YearOfBirth } else { "NULL" }
            $yearOfDeath = if ($row.YearOfDeath -and $row.YearOfDeath -ne "0") { $row.YearOfDeath } else { "NULL" }
            $knownFor = if ($row.KnownFor) { $row.KnownFor.Replace("'", "''") } else { "" }
            $notes = if ($row.Notes) { $row.Notes.Replace("'", "''") } else { "" }
            $sources = if ($row.Sources) { $row.Sources.Replace("'", "''") } else { "" }
            $placeOfBirth = if ($row.PlaceOfBirth) { $row.PlaceOfBirth.Replace("'", "''") } else { "" }
            $placeOfPtira = if ($row.PlaceOfPtira) { $row.PlaceOfPtira.Replace("'", "''") } else { "" }
            $knownAs = if ($row.knownAs) { $row.knownAs.Replace("'", "''") } else { "" }
            $imageUrl = if ($row.ImageUrl -and $row.ImageUrl -ne "NULL") { "'$($row.ImageUrl)'" } else { "NULL" }
            $yoBHebrew = if ($row.YoBHebrew) { $row.YoBHebrew.Replace("'", "''") } else { "" }
            $yoPHebrew = if ($row.YoPHebrew) { $row.YoPHebrew.Replace("'", "''") } else { "" }
            
            $insertQuery = @"
SET IDENTITY_INSERT dbo.Talmidei_Hahamim ON;
INSERT INTO dbo.Talmidei_Hahamim 
    (RabbiID, FullName, City, Country, Period, YearOfBirth, YearOfDeath, 
     KnownFor, Notes, Sources, PlaceOfBirth, PlaceOfPtira, knownAs, ImageUrl, YoBHebrew, YoPHebrew)
VALUES 
    ($rabbiID, N'$fullName', N'$city', N'$country', N'$period', $yearOfBirth, $yearOfDeath,
     N'$knownFor', N'$notes', N'$sources', N'$placeOfBirth', N'$placeOfPtira', N'$knownAs', $imageUrl, N'$yoBHebrew', N'$yoPHebrew');
SET IDENTITY_INSERT dbo.Talmidei_Hahamim OFF;
"@
            
            $command = $connection.CreateCommand()
            $command.CommandText = $insertQuery
            $command.ExecuteNonQuery() | Out-Null
            $insertedCount++
            
            if ($insertedCount % 50 -eq 0) {
                Write-Host "Inserted $insertedCount records..." -ForegroundColor Gray
            }
        }
        catch {
            $errorCount++
            Write-Host "Error inserting RabbiID $($row.RabbiID): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`nData reload completed!" -ForegroundColor Green
    Write-Host "Successfully inserted: $insertedCount records" -ForegroundColor Green
    Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    $connection.Close()
    Write-Host "Database connection closed" -ForegroundColor Cyan
}
