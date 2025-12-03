# Enhanced script to download images for Talmidei Hahamim
# Uses proper JSON output from database

param(
    [int]$Limit = 10,  # Number of rabbis to process (use -1 for all)
    [switch]$TestMode = $false  # If true, only shows what would be done
)

# Configuration
$imgFolder = "c:\project1\img"
$logFile = "c:\project1\scripts\download-log.txt"
$serverUrl = "http://localhost:3000"

# Ensure img folder exists
if (-not (Test-Path $imgFolder)) {
    New-Item -ItemType Directory -Path $imgFolder | Out-Null
}

Write-Host "Fetching rabbis from API..." -ForegroundColor Cyan

# Get rabbis without images from the API
try {
    $response = Invoke-RestMethod -Uri "$serverUrl/api/tables/Talmidei_Hahamim/data" -Method Get
    $allRabbis = $response.data | Where-Object { -not $_.ImageUrl }
    
    if ($Limit -gt 0) {
        $rabbis = $allRabbis | Select-Object -First $Limit
    } else {
        $rabbis = $allRabbis
    }
    
    Write-Host "Found $($allRabbis.Count) rabbis without images (processing $($rabbis.Count))" -ForegroundColor Green
}
catch {
    Write-Host "Error fetching data from API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the backend server is running on $serverUrl" -ForegroundColor Yellow
    exit 1
}

# Load name mappings
$mappingFile = "c:\project1\scripts\name-mappings.ps1"
if (Test-Path $mappingFile) {
    $nameMap = . $mappingFile
    Write-Host "Loaded $($nameMap.Count) name mappings" -ForegroundColor Green
}
else {
    Write-Host "Warning: name-mappings.ps1 not found" -ForegroundColor Yellow
    $nameMap = @{}
}

Write-Host ""

function Get-WikimediaImageUrl {
    param($searchTerm)
    
    try {
        # Search Wikimedia Commons
        $searchUrl = "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=$([uri]::EscapeDataString($searchTerm))&srnamespace=6&srlimit=5&format=json"
        $searchResult = Invoke-RestMethod -Uri $searchUrl -Method Get -ErrorAction Stop
        
        if ($searchResult.query.search.Count -eq 0) {
            return $null
        }
        
        # Get the first result's file name
        $fileName = $searchResult.query.search[0].title -replace '^File:', ''
        
        # Get the actual image URL
        $imageInfoUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=File:$([uri]::EscapeDataString($fileName))&prop=imageinfo&iiprop=url&format=json"
        $imageInfo = Invoke-RestMethod -Uri $imageInfoUrl -Method Get -ErrorAction Stop
        
        $pages = $imageInfo.query.pages
        $pageId = ($pages | Get-Member -MemberType NoteProperty)[0].Name
        $imageUrl = $pages.$pageId.imageinfo[0].url
        
        return $imageUrl
    }
    catch {
        return $null
    }
}

function Download-Image {
    param($url, $outputPath)
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UserAgent "Mozilla/5.0" -ErrorAction Stop
        return $true
    }
    catch {
        Write-Host "  Error downloading: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Update-Database {
    param($rabbiId, $imagePath)
    
    try {
        $query = "UPDATE Talmidei_Hahamim SET ImageUrl = '$imagePath' WHERE RabbiID = $rabbiId"
        $result = sqlcmd -S localhost\SQLEXPRESS -d Hazal -Q $query -h -1 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            return $true
        } else {
            Write-Host "  Error updating database: $result" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "  Error updating database: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Process each rabbi
$successCount = 0
$failCount = 0
$skippedCount = 0

foreach ($rabbi in $rabbis) {
    $rabbiId = $rabbi.RabbiID
    $hebrewName = if ($rabbi.HebrewName) { $rabbi.HebrewName.Trim() } else { "" }
    $fullName = if ($rabbi.FullName) { $rabbi.FullName.Trim() } else { "" }
    $knownAs = if ($rabbi.knownAs) { $rabbi.knownAs.Trim() } else { "" }
    
    Write-Host "[$rabbiId] $hebrewName" -ForegroundColor Cyan
    Write-Host "  Full name: $fullName" -ForegroundColor Gray
    
    # Try to find English name mapping
    $searchName = $null
    
    # Try HebrewName first
    if ($hebrewName -and $nameMap.ContainsKey($hebrewName)) {
        $searchName = $nameMap[$hebrewName]
    }
    # Then try knownAs
    elseif ($knownAs -and $nameMap.ContainsKey($knownAs)) {
        $searchName = $nameMap[$knownAs]
    }
    # Then try FullName
    elseif ($fullName -and $nameMap.ContainsKey($fullName)) {
        $searchName = $nameMap[$fullName]
    }
    
    if (-not $searchName) {
        Write-Host "  ⚠ No English name mapping - add to name-mappings.ps1" -ForegroundColor Yellow
        Write-Host "    Suggested: '$hebrewName' = 'English Name Here'" -ForegroundColor Gray
        $skippedCount++
        Write-Host ""
        continue
    }
    
    Write-Host "  Searching for: $searchName" -ForegroundColor White
    
    if ($TestMode) {
        Write-Host "  [TEST MODE] Would search Wikimedia for this rabbi" -ForegroundColor Magenta
        Write-Host ""
        continue
    }
    
    # Try to find image
    $imageUrl = Get-WikimediaImageUrl -searchTerm $searchName
    
    if ($imageUrl) {
        # Check if it's actually an image file (not PDF or other document)
        $extension = [System.IO.Path]::GetExtension($imageUrl) -replace '\?.*$', ''
        if ($extension -match '\.(pdf|doc|docx|txt|xml)$') {
            Write-Host "  ✗ Found document instead of image: $extension" -ForegroundColor Yellow
            $failCount++
            Write-Host ""
            continue
        }
        
        Write-Host "  ✓ Found: $imageUrl" -ForegroundColor Green
        
        # Always save as .jpg
        $extension = ".jpg"
        
        # Create a clean filename from Hebrew name
        $cleanName = $hebrewName -replace '[״"׳]', '' -replace '\s+', '_' -replace '[^\w\u0590-\u05FF_]', ''
        if (-not $cleanName) {
            $cleanName = "rabbi_$rabbiId"
        }
        
        $outputFile = Join-Path $imgFolder "$cleanName$extension"
        
        if (Download-Image -url $imageUrl -outputPath $outputFile) {
            Write-Host "  ✓ Downloaded: $outputFile" -ForegroundColor Green
            
            # Update database with relative path using clean filename
            $fileName = Split-Path $outputFile -Leaf
            $dbPath = "/img/$fileName"
            if (Update-Database -rabbiId $rabbiId -imagePath $dbPath) {
                Write-Host "  ✓ Database updated" -ForegroundColor Green
                $successCount++
                
                # Log success
                "$rabbiId,$hebrewName,$searchName,$imageUrl,$outputFile" | Add-Content $logFile
            }
            else {
                $failCount++
            }
        }
        else {
            $failCount++
        }
    }
    else {
        Write-Host "  ✗ No image found on Wikimedia" -ForegroundColor Yellow
        $failCount++
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500  # Be nice to Wikimedia servers
}

Write-Host "===================="
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Success: $successCount" -ForegroundColor Green
Write-Host "  ✗ Failed: $failCount" -ForegroundColor Yellow
Write-Host "  ⚠ Skipped (no mapping): $skippedCount" -ForegroundColor Gray
Write-Host "  Log file: $logFile"
Write-Host ""
Write-Host "To add mappings for skipped rabbis, edit: $mappingFile" -ForegroundColor Cyan
