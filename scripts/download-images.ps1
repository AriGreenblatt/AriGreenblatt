# Script to download images for Talmidei Hahamim
# Searches Wikimedia Commons and downloads images

# Configuration
$imgFolder = "c:\project1\img"
$logFile = "c:\project1\scripts\download-log.txt"

# Ensure img folder exists
if (-not (Test-Path $imgFolder)) {
    New-Item -ItemType Directory -Path $imgFolder | Out-Null
}

# Get all rabbis from database
$query = "SELECT RabbiID, FullName, HebrewName, knownAs FROM Talmidei_Hahamim WHERE ImageUrl IS NULL ORDER BY RabbiID"
$rabbis = sqlcmd -S localhost\SQLEXPRESS -d Hazal -Q $query -h -1 -W | Where-Object { $_.Trim() -ne "" }

# Parse the results
$rabbiList = @()
foreach ($line in $rabbis) {
    if ($line -match '^\s*(\d+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+)$') {
        $rabbiList += @{
            RabbiID = $matches[1].Trim()
            FullName = $matches[2].Trim()
            HebrewName = $matches[3].Trim()
            KnownAs = $matches[4].Trim()
        }
    }
}

Write-Host "Found $($rabbiList.Count) rabbis without images"
Write-Host ""

# Load name mappings
$mappingFile = "c:\project1\scripts\name-mappings.ps1"
if (Test-Path $mappingFile) {
    $nameMap = . $mappingFile
    Write-Host "Loaded $($nameMap.Count) name mappings"
}
else {
    Write-Host "Warning: name-mappings.ps1 not found, using minimal mappings" -ForegroundColor Yellow
    $nameMap = @{
        'רש"י' = 'Rashi'
        'רש״י' = 'Rashi'
        'הרמב"ם' = 'Maimonides'
        'הרמב״ם' = 'Maimonides'
        'הרמב"ן' = 'Nachmanides'
        'הרמב״ן' = 'Nachmanides'
    }
}
Write-Host ""

function Get-WikimediaImageUrl {
    param($searchTerm)
    
    try {
        # Search Wikimedia Commons
        $searchUrl = "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=$([uri]::EscapeDataString($searchTerm))&srnamespace=6&srlimit=5&format=json"
        $searchResult = Invoke-RestMethod -Uri $searchUrl -Method Get
        
        if ($searchResult.query.search.Count -eq 0) {
            return $null
        }
        
        # Get the first result's file name
        $fileName = $searchResult.query.search[0].title -replace '^File:', ''
        
        # Get the actual image URL
        $imageInfoUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=File:$([uri]::EscapeDataString($fileName))&prop=imageinfo&iiprop=url&format=json"
        $imageInfo = Invoke-RestMethod -Uri $imageInfoUrl -Method Get
        
        $pages = $imageInfo.query.pages
        $pageId = ($pages | Get-Member -MemberType NoteProperty)[0].Name
        $imageUrl = $pages.$pageId.imageinfo[0].url
        
        return $imageUrl
    }
    catch {
        Write-Host "Error searching for '$searchTerm': $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

function Download-Image {
    param($url, $outputPath)
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UserAgent "Mozilla/5.0"
        return $true
    }
    catch {
        Write-Host "Error downloading from '$url': $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Process each rabbi
$successCount = 0
$failCount = 0

foreach ($rabbi in $rabbiList) {
    $rabbiId = $rabbi.RabbiID
    $hebrewName = $rabbi.HebrewName
    $fullName = $rabbi.FullName
    $knownAs = $rabbi.KnownAs.Trim()
    
    Write-Host "[$rabbiId] $hebrewName ($fullName)" -ForegroundColor Cyan
    
    # Try to find English name mapping
    $searchName = $null
    if ($nameMap.ContainsKey($hebrewName)) {
        $searchName = $nameMap[$hebrewName]
    }
    elseif ($nameMap.ContainsKey($knownAs)) {
        $searchName = $nameMap[$knownAs]
    }
    
    if (-not $searchName) {
        Write-Host "  No English name mapping found - skipping" -ForegroundColor Gray
        $failCount++
        continue
    }
    
    Write-Host "  Searching for: $searchName"
    
    # Try to find image
    $imageUrl = Get-WikimediaImageUrl -searchTerm $searchName
    
    if ($imageUrl) {
        Write-Host "  Found image: $imageUrl" -ForegroundColor Green
        
        # Determine file extension
        $extension = [System.IO.Path]::GetExtension($imageUrl) -replace '\?.*$', ''
        if (-not $extension) { $extension = ".jpg" }
        
        $outputFile = Join-Path $imgFolder "rabbi_$rabbiId$extension"
        
        if (Download-Image -url $imageUrl -outputPath $outputFile) {
            Write-Host "  Downloaded to: $outputFile" -ForegroundColor Green
            
            # Update database
            $dbPath = "/img/rabbi_$rabbiId$extension"
            $updateQuery = "UPDATE Talmidei_Hahamim SET ImageUrl = '$dbPath' WHERE RabbiID = $rabbiId"
            sqlcmd -S localhost\SQLEXPRESS -d Hazal -Q $updateQuery | Out-Null
            
            Write-Host "  Database updated" -ForegroundColor Green
            $successCount++
            
            # Log success
            "$rabbiId,$hebrewName,$searchName,$imageUrl,$outputFile" | Add-Content $logFile
        }
        else {
            $failCount++
        }
    }
    else {
        Write-Host "  No image found" -ForegroundColor Yellow
        $failCount++
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500  # Be nice to Wikimedia servers
}

Write-Host "===================="
Write-Host "Summary:"
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor Yellow
Write-Host "  Log file: $logFile"
