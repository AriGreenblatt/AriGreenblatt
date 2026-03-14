# Project Development History - RaboteinuZl

**Project**: Rabbi Database System with AI-Assisted Data Extraction  
**Last Updated**: February 28, 2026

---

## Recent Updates (February 27-28, 2026)

### Wikipedia City Maps with Hebrew Labels (Feb 27-28, 2026)

**Objective**: Display Wikipedia city maps with red dots and Hebrew city names for rabbi birthplaces

**Implementation Journey**:
1. **Initial Approach**: Tried to extract Wikipedia's pre-labeled city maps
   - Issue: Wikipedia's labeled maps are dynamically generated, not static files
   
2. **HTML Overlay Attempts**: 
   - Created HTML overlay with CSS positioning
   - User rejected as too large/clunky
   
3. **Server-Side Image Generation** (Final Solution):
   - Installed `sharp` library for image processing
   - Installed `axios` library for better HTTP handling with redirects
   - Created `/api/city-map-with-label/:cityName` endpoint
   - Downloads base map PNG from Wikipedia
   - Uses SVG text overlay to draw Hebrew city names directly into image
   - Returns composite PNG with text baked in
   
**Technical Details**:
- Downloads locator maps (e.g., `Mainz_in_Germany.png`)
- Positions Hebrew text to the right of red dot
- Font: Miriam/David/Arial sans-serif, size 7pt, black color
- User-Agent header required to avoid 403 errors from Wikipedia
- Hardcoded positions per city: Mainz (x:97, y:107), etc.

**Files Modified**:
- `backend/package.json` - Added sharp, axios dependencies
- `backend/server.js` - Added labeled map generation endpoint (lines 854-958)
- `backend/wikipedia-extractor.js` - Hardcoded locator map URLs
- `src/app/services/database.service.ts` - Updated to use labeled endpoint
- `src/app/admin-import/` - Display logic for city maps

**Current Status**: Map with red dot displays successfully. Hebrew text overlay working but needs fine-tuning of positioning.

---

### Database Architecture Updates (Feb 28, 2026)

**Issue**: Main display page showing no data in columns (שם, ידוע בשם, עיר, מדינה, תקופה)

**Root Cause**: Database migrated to multi-language architecture but backend queries not updated

**Solution Implemented**:
1. Updated `/api/tables/:tableName/data` endpoint to JOIN with translation tables
2. Special handling for `Talmidei_Hahamim` table:
   ```sql
   SELECT 
     t.RabbiID, t.YearOfBirth, t.YearOfDeath, t.HebDob, t.HebDoP,
     t.ImageUrl, t.Assumed, t.wiki_city_map_url,
     tr.FullName, tr.KnownAs, tr.City, tr.Country, tr.Period,
     tr.PlaceOfBirth, tr.PlaceOfPtira, tr.KnownFor, tr.Notes, tr.Sources, tr.URL
   FROM Talmidei_Hahamim t
   LEFT JOIN Talmidei_Hahamim_Translations tr 
     ON t.RabbiID = tr.RabbiID AND tr.LanguageCode = 'he'
   ```

**Table Name Updates**:
- `Events` → `Events_and_facts`
- `Talmidim` → `AssociatedWith`

**Files Modified**:
- `backend/server.js` - Lines 669-724 (table data endpoint)
- `backend/server.js` - Lines 339-349, 429-439 (table name references)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Development Phases](#development-phases)
4. [Key Features Implemented](#key-features-implemented)
5. [Code Structure](#code-structure)
6. [Issues Resolved](#issues-resolved)
7. [Current State](#current-state)
8. [Future Work](#future-work)

---

## Project Overview

### Goal
Build an AI-assisted database system for tracking Jewish rabbis (Talmidei Chachamim) throughout history, with automated data extraction from Wikipedia and other sources.

### Core Requirements
- Multi-language support (Hebrew, English, Yiddish, Russian)
- Wikipedia article extraction and parsing
- Duplicate detection before saving
- Comprehensive admin interface for data entry
- Track rabbis, their books, life events, and relationships
- Integration with multiple data sources (Wikipedia, Jewish Encyclopedia, HebrewBooks.org, etc.)

### Primary Data Sources
1. Wikipedia (Hebrew, English, Yiddish, Russian) - **Implemented**
2. Jewish Encyclopedia - **Planned**
3. HebrewBooks.org - **Planned**
4. Otzar HaChochma - **Planned** (subscription required)
5. Additional scholarly sources - **35+ sources documented**

---

## Technical Architecture

### Stack
- **Frontend**: Angular 18+ running on port 4200
- **Backend**: Node.js/Express on port 3000
- **Database**: SQL Server (via mssql package, Windows Auth)
- **Development**: PowerShell automation scripts
- **Image Processing**: Sharp library for server-side image manipulation

### Dependencies
**Backend** (backend/package.json):
- express - Web server
- cors - Cross-origin resource sharing
- body-parser - Request parsing
- mssql - SQL Server connectivity
- https/http - Wikipedia API requests
- sharp - Image processing for map labels
- axios - HTTP client with redirect handling

**Frontend** (package.json):
- @angular/core 18.x
- RxJS for async operations
- HttpClient for API calls

### Project Structure
```
RaboteinuZl/
├── backend/
│   ├── server.js                 # Main API server (1070+ lines)
│   ├── database.js               # SQL Server connection
│   ├── wikipedia-extractor.js   # Wikipedia data extraction (960+ lines)
│   └── [migration scripts]       # Database setup/migration
├── src/app/
│   ├── admin-import/             # Main admin interface
│   │   ├── admin-import.component.ts    # Form logic (800+ lines)
│   │   ├── admin-import.component.html  # UI template (1300+ lines)
│   │   └── admin-import.component.css   # Styling (900+ lines)
│   ├── services/
│   │   └── database.service.ts   # API communication (237 lines)
│   ├── talmidei-hahamim/         # Main display page
│   └── [other components]
├── scripts/
│   └── ra.ps1                    # Automated startup script
└── PDF/                          # Downloaded resources
```

### Server Management
**ra.ps1 Script**: Automated startup that:
1. Kills all existing node/ng/PowerShell jobs
2. Starts backend server in PowerShell background job (port 3000)
3. Starts Angular dev server in PowerShell background job (port 4200)
4. Provides clean restart capability
5. Shows log access commands

---

## Development Phases

### Phase 1: Wikipedia Extraction (Sessions 1-10)
**Objective**: Extract rabbi data from Wikipedia articles

**Implementation**:
- Created `wikipedia-extractor.js` with comprehensive parsing
- Multi-language support (Hebrew, English, Yiddish, Russian)
- Extracts: names, birth/death dates, cities, affiliations, books, life events
- Smart pattern matching for Hebrew dates, city names, organizations
- Book extraction with author/year/publisher parsing

**Key Achievement**: Successfully extracted data for 136+ rabbis from Wikipedia

### Phase 2: Admin Interface Development (Sessions 11-25)
**Objective**: Build comprehensive data entry form

**Features Implemented**:
- 50+ input fields covering all rabbi attributes
- Separate sections for: Basic Info, Life Details, Books, Events, Relationships
- RTL (right-to-left) support for Hebrew
- Auto-population from Wikipedia extraction
- Manual override capability for all fields

### Phase 3: Duplicate Detection (Sessions 26-35)
**Objective**: Prevent duplicate entries

**Implementation**:
- Real-time Hebrew name lookup
- Fuzzy matching for similar names
- Side-by-side comparison interface
- Shows existing books, events, relationships
- Manual merge decision workflow

### Phase 4: Database Migration (Sessions 36-45)
**Objective**: Implement multi-language architecture

**Migration Steps**:
1. Created translation tables (Talmidei_Hahamim_Translations, AssociatedWith_Translations)
2. Migrated data from core tables to language-specific translations
3. Maintained core tables for non-translatable data (IDs, dates, URLs)
4. Updated queries to JOIN with translation tables

**New Structure**:
- Core tables: IDs, dates, binary data
- Translation tables: All text fields per language
- Language code field: 'he', 'en', 'yi', 'ru'

### Phase 5: Wikipedia City Maps (Sessions 70-75)
**Objective**: Display city maps with Hebrew labels

**Challenges & Solutions**:
- Challenge: Wikipedia's labeled maps not accessible as static files
- Solution: Server-side image generation with Sharp library
- Challenge: HTTP 403 errors from Wikipedia
- Solution: User-Agent header in requests
- Challenge: Hebrew text readability
- Solution: Miriam/David font, 7pt size, positioned to right of red dot

---

## Key Features Implemented

### 1. Wikipedia Data Extraction ✅
**Features**:
- Multi-language article parsing (Hebrew, English, Yiddish, Russian)
- Automatic infobox extraction
- Birth/death date parsing (Hebrew and Gregorian)
- City/country extraction with historical name mapping
- Book/publication extraction from article text
- Image URL extraction
- Wikipedia page URL capture

**Technical Highlights**:
- Pattern matching for Hebrew dates (ה'תקכ"ב format)
- Historical city name translation (מגנצא → מיינץ → Mainz)
- Handles multiple name formats (full names, acronyms, alternate spellings)

### 2. City Maps with Hebrew Labels ✅ (NEW)
**Features**:
- Downloads Wikipedia locator maps
- Server-side image processing
- Hebrew text overlay at precise coordinates
- Returns composite PNG with baked-in labels

**Technical Implementation**:
```javascript
// Backend endpoint
app.get('/api/city-map-with-label/:cityName', async (req, res) => {
  // Download base map from Wikipedia
  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': '...' }
  });
  
  // Process with Sharp
  const pngBuffer = await sharp(imageBuffer).png().toBuffer();
  
  // Create SVG text overlay
  const svgText = `
    <svg width="${width}" height="${height}">
      <text x="${x}" y="${y}" 
            font-family="Miriam, David, Arial" 
            font-size="7" fill="#000000">
        ${hebrewCityName}
      </text>
    </svg>
  `;
  
  // Composite and return
  const outputBuffer = await sharp(pngBuffer)
    .composite([{ input: Buffer.from(svgText) }])
    .png()
    .toBuffer();
  res.send(outputBuffer);
});
```

### 3. Admin Import Interface ✅
**Form Sections**:
- Basic Information (names, dates, places)
- Life Events (milestones, appointments)
- Books Authored
- Relationships (teachers, students)
- Images (rabbi photo, city map)
- URLs (Wikipedia links per language)

**Smart Features**:
- Auto-population from Wikipedia extraction
- Hebrew date validation
- City dropdown with autocomplete
- Duplicate detection before save
- Compare with existing entries

### 4. Duplicate Detection ✅
**Detection Logic**:
```typescript
// Frontend triggers
onWikipediaExtract() {
  // Extract data
  const extracted = await extractWikipedia(url);
  
  // Check for duplicates
  const duplicate = await checkDuplicate(extracted.hebrewName);
  
  if (duplicate.exists) {
    // Show comparison view
    showDuplicateComparison(extracted, duplicate.data);
  }
}
```

**Comparison View**:
- Side-by-side display
- Shows all fields from both sources
- Lists existing books, events, relationships
- User chooses: merge, skip, or create new

### 5. Multi-Language Database ✅
**Architecture**:
```sql
-- Core Table
CREATE TABLE Talmidei_Hahamim (
  RabbiID INT PRIMARY KEY IDENTITY,
  YearOfBirth INT,
  YearOfDeath INT,
  HebDob INT,
  HebDoP INT,
  ImageUrl NVARCHAR(500),
  wiki_city_map_url NVARCHAR(500),
  Assumed TINYINT
);

-- Translation Table
CREATE TABLE Talmidei_Hahamim_Translations (
  RabbiID INT,
  LanguageCode VARCHAR(5),
  FullName NVARCHAR(200),
  KnownAs NVARCHAR(200),
  City NVARCHAR(100),
  Country NVARCHAR(100),
  Period NVARCHAR(100),
  PlaceOfBirth NVARCHAR(100),
  PlaceOfPtira NVARCHAR(100),
  KnownFor NVARCHAR(MAX),
  Notes NVARCHAR(MAX),
  Sources NVARCHAR(MAX),
  URL NVARCHAR(500),
  PRIMARY KEY (RabbiID, LanguageCode),
  FOREIGN KEY (RabbiID) REFERENCES Talmidei_Hahamim(RabbiID)
);
```

---

## Code Structure

### Backend (Node.js/Express)

#### server.js - Main API Server
**Key Endpoints**:
```javascript
// Health check
GET /api/health

// Wikipedia extraction
POST /api/extract-wikipedia
GET /api/search-wikipedia/:name

// City maps
GET /api/city-map/:cityName
GET /api/city-map-with-label/:cityName  // NEW

// Database operations
GET /api/tables
GET /api/tables/:tableName/data
POST /api/query
POST /api/rabbis
POST /api/check-duplicate
GET /api/rabbi/:rabbiId

// Content management
GET /api/odot/:title
```

#### wikipedia-extractor.js - Data Extraction Engine
**Main Functions**:
```javascript
// Extract from Wikipedia URL or name
async function extractRabbiData(urlOrName)

// Parse infobox
function parseInfobox(html)

// Extract dates
function extractBirthDeath(html, infobox)

// Extract books
function extractBooks(html, hebrewName)

// Extract events
function extractEvents(html, hebrewName)

// Fetch city map
async function fetchCityMap(cityName)  // NEW

// City name translation
const PLACE_NAME_EQUIVALENTS = {
  'מגנצא': 'מיינץ',
  'וורמייזא': 'וורמס',
  // ...
};
```

### Frontend (Angular)

#### admin-import.component.ts - Main Form Logic
**Key Methods**:
```typescript
// Wikipedia extraction
async onWikipediaExtract()

// Duplicate detection
async checkForDuplicate()

// Form submission
async saveRabbi()

// City map fetching
async fetchCityMap()  // NEW
setCityLabelPosition()  // NEW

// Field management
populateForm(data)
clearForm()
```

#### database.service.ts - API Communication
**Key Methods**:
```typescript
// Table data with multi-language JOIN
getTableData(tableName, limit, offset)

// Rabbi operations
updateRabbi(rabbiId, fields)
checkDuplicate(name)

// Wikipedia operations
extractWikipedia(url, name)
getWikipediaContent(title)

// City maps
getCityMap(cityName)  // Returns labeled image URL
```

---

## Issues Resolved

### Recent Issues (Feb 27-28, 2026)

1. **Wikipedia 403 Errors** ✅
   - Problem: Wikipedia blocking image downloads
   - Solution: Added User-Agent header to axios requests
   
2. **Sharp Image Format Errors** ✅
   - Problem: "Input buffer contains unsupported image format"
   - Solution: Switched from http.get to axios with arraybuffer response type
   
3. **Hebrew Text Unreadable** ✅
   - Problem: Text too small in initial implementation
   - Solution: Adjusted to 7pt Miriam/David font, positioned to right of dot
   
4. **Empty Main Display Page** ✅
   - Problem: No data showing in columns after database migration
   - Solution: Updated endpoint to JOIN with translation tables
   
5. **Syntax Error in server.js** ✅
   - Problem: Missing catch block after try statement
   - Solution: Removed duplicate code from merge conflict

### Historical Issues

6. **Database Connection Failures** ✅
   - Problem: Windows Authentication not working
   - Solution: Corrected connection string format in database.js

7. **Hebrew Encoding Issues** ✅
   - Problem: Gibberish characters in console logs
   - Solution: UTF-8 encoding in HTTP responses (cosmetic only, data was correct)

8. **Duplicate Entries** ✅
   - Problem: Same rabbis being added multiple times
   - Solution: Implemented real-time duplicate detection before save

9. **Wikipedia Extraction Failures** ✅
   - Problem: Missing data from some articles
   - Solution: Enhanced pattern matching, fallback strategies

10. **Frontend-Backend Data Mismatch** ✅
    - Problem: Field names not matching between frontend and database
    - Solution: Aligned all field names across stack

---

## Current State (Feb 28, 2026)

### Working Features ✅
1. Wikipedia data extraction (all languages)
2. Admin import form with 50+ fields
3. Duplicate detection and comparison
4. Multi-language database architecture
5. City maps with Hebrew labels (90% complete)
6. Image display (rabbi photos)
7. Book/event/relationship tracking
8. Real-time form validation
9. PowerShell automation for server startup

### In Progress 🔄
1. Fine-tuning city map label positions
2. Adding more cities to hardcoded map URLs
3. Testing duplicate merge workflow

### Known Issues ⚠️
1. Hebrew console logs show gibberish (cosmetic only)
2. City map labels need position adjustment for some cities
3. Talmidim table references need update (Events → Events_and_facts)

### Next Priorities 📋
1. Test and refine duplicate merge functionality
2. Complete city map positioning for all major cities
3. Implement Jewish Encyclopedia extraction
4. Add HebrewBooks.org integration
5. Create public-facing search interface

---

## Future Work

### Short Term (1-2 weeks)
- [ ] Complete duplicate merge testing
- [ ] Add 20+ more city map URLs with positions
- [ ] Implement relationship visualization
- [ ] Add bulk import capability
- [ ] Create backup/restore scripts

### Medium Term (1-2 months)
- [ ] Jewish Encyclopedia data extraction
- [ ] HebrewBooks.org API integration
- [ ] Public search interface
- [ ] Advanced filtering (by period, location, relationships)
- [ ] Export functionality (PDF, Excel)
- [ ] Timeline visualization

### Long Term (3-6 months)
- [ ] Machine learning for duplicate detection
- [ ] Automatic relationship inference
- [ ] Citation management system
- [ ] Crowdsourced contributions
- [ ] Mobile app
- [ ] API for third-party integrations

---

## Development Statistics

### Code Metrics (as of Feb 28, 2026)
- **Total Files Modified**: 20+
- **Lines of Code Written**: ~4,500+
- **Components Created**: 6
- **API Endpoints**: 12+
- **Database Tables**: 9+

### Data Metrics
- **Rabbis Extracted**: 136+
- **Wikipedia Articles Processed**: 136+
- **Languages Supported**: 4 (Hebrew, English, Yiddish, Russian)
- **Data Sources Documented**: 35+
- **City Maps Implemented**: 1 (Mainz, with template for others)

### Development Sessions
- **Total Sessions**: ~80+
- **Major Features**: 6
- **Bug Fixes**: 15+
- **UI Iterations**: 10+

---

## Technical Decisions & Lessons Learned

### Why Sharp for Image Processing?
- Native Node.js library with good performance
- Supports PNG/JPEG/WebP formats
- SVG text overlay capability
- Buffer-based processing (no temp files)

### Why Multi-Language Translation Tables?
- Cleaner separation of concerns
- Easier to add new languages
- Supports language-specific content (different Wikipedia articles per language)
- More efficient than storing all languages in one table

### Why Server-Side Map Generation?
- Cannot extract Wikipedia's dynamically generated labeled maps
- HTML overlays rejected by user as too clunky
- Server-side allows permanent embedding of text in image
- Better control over positioning and styling

### Why PowerShell for Automation?
- Native to Windows environment
- Better background job management than batch scripts
- Allows real-time log viewing with Receive-Job
- Clean process termination

---

## Contact & Maintenance

### Key Files to Monitor
1. `server.js` - Backend API logic (1070 lines)
2. `admin-import.component.html` - Main UI template (1300+ lines)
3. `admin-import.component.ts` - Form logic and duplicate detection (800+ lines)
4. `wikipedia-extractor.js` - Data extraction engine (960+ lines)
5. `ra.ps1` - Server startup automation
6. `database.js` - SQL Server connection config

### Backup Recommendations
- **Database**: Regular SQL Server backups (daily recommended)
- **Code**: Git repository with regular commits
- **PDFs**: Separate backup of PDF/ directory
- **Configuration**: Backup database.js and .env files
- **Images**: Backup uploaded rabbi photos and city maps

### Development Environment Setup
1. Install Node.js 18+
2. Install Angular CLI 18+
3. Install SQL Server Express (or connect to existing instance)
4. Run `npm install` in root and backend directories
5. Configure database.js with SQL Server connection
6. Run `.\scripts\ra.ps1` to start servers

---

**End of Conversation History**  
*Last Updated: February 28, 2026*  
*Project Status: Active Development*  
*Current Focus: Admin import page features, city map label refinement*
