# RaboteinuZl - System Rules & Documentation

**Version 2.0 - Restructured March 2026**

---

## Table of Contents

1. [Quick Reference - Critical Rules](#1-quick-reference---critical-rules)
2. [Data Flow & Priority Rules](#2-data-flow--priority-rules)
3. [Auto-Population Rules](#3-auto-population-rules)
4. [Database Operations](#4-database-operations)
5. [Wikipedia Extraction](#5-wikipedia-extraction)
6. [External Sources Integration](#6-external-sources-integration)
7. [Search & Error Handling](#7-search--error-handling)
8. [UI/UX Display Rules](#8-uiux-display-rules)
9. [Technical Implementation](#9-technical-implementation)
10. [Commands & Troubleshooting](#10-commands--troubleshooting)

---

## 1. Quick Reference - Critical Rules

### Top 10 Must-Know Rules

1. **Database First**: Always check database before external sources
2. **No Duplicates**: Search finds existing rabbi → UPDATE mode, not found → INSERT mode
3. **Period Auto-Calc**: `המאה ה-[century]` from birth OR death year
4. **Hebrew Years**: Auto-calculate (Gregorian + 3760) and convert to letters
5. **City Fallback**: PlaceOfBirth/PlaceOfPtira default to City if not found
6. **Field Sources**: Track 'database' vs 'wikipedia' for each field
7. **Update Only New**: When updating, only save Wikipedia-sourced or manually-edited fields
8. **Multi-Table Split**: Main table (years/numbers) + Translations table (text fields)
9. **Fuzzy Search**: Remove prefixes (ר, רבי, הרב, רב) for better Wikipedia matching
10. **Display RabbiID**: Blue info box shows when updating existing record

---

## 2. Data Flow & Priority Rules

### 2.1 Extraction Workflow

```
User Input (Name/URL)
    ↓
1. SEARCH DATABASE
   - Query: HebFullName, FullName, KnownAs
   - Priority: Exact match > LIKE match
    ↓
2. IF FOUND → Load DB Data (mark 'database')
   IF NOT FOUND → Prepare for INSERT
    ↓
3. EXTRACT FROM WIKIPEDIA
   - Parse HTML, extract structured data
   - Mark all Wikipedia fields as 'wikipedia'
    ↓
4. MERGE DATA
   - DB values take priority
   - Wikipedia fills empty fields only
    ↓
5. DISPLAY TO USER
   - Green/standard = database
   - Yellow = Wikipedia
   - Blue info box if existing record
    ↓
6. USER REVIEWS & SAVES
    ↓
7. SAVE TO DATABASE
   - UPDATE if databaseRecord=true
   - INSERT if databaseRecord=false
```

### 2.2 Data Source Priority

**Priority Order (Highest to Lowest):**

1. **Database** (existing records) - Always displayed, never overwritten
2. **Wikipedia Infobox** - Structured data, high confidence (80-90%)
3. **Wikipedia Text** - Parsed from article body (70-80%)
4. **Calculated** - Auto-generated from existing data (60-70%)
5. **Estimated** - Inferred (e.g., birth = death - 70) (30-40%)

### 2.3 Field Source Tracking

**fieldSources Object:**
```javascript
{
  FullName: 'database',        // From existing DB record
  PlaceOfBirth: 'wikipedia',   // New from Wikipedia
  Period: 'calculated',        // Auto-calculated
  YearOfBirth: 'database'      // Already in DB
}
```

**Usage:**
- UI color coding
- Determine which fields to update
- User transparency about data origin

---

## 3. Auto-Population Rules

### 3.1 Period (תקופה)

**Rule**: Auto-calculate from YearOfBirth OR YearOfDeath

**Format**: `המאה ה-[century]`

**Calculation**:
```javascript
const yearToUse = rabbi.YearOfBirth || rabbi.YearOfDeath;
const century = Math.ceil(yearToUse / 100);
rabbi.Period = `המאה ה-${century}`;
```

**Examples:**
- 1310 → המאה ה-14
- 1380 → המאה ה-14
- 599 → המאה ה-6

**Priority:**
1. Wikipedia infobox תקופה field (confidence 80%)
2. Calculated from years (confidence 60%)

**Location**: `backend/wikipedia-extractor.js` lines ~560-570

---

### 3.2 Hebrew Years - Numeric

**Rule**: Convert Gregorian to Hebrew year

**Calculation**: `Gregorian Year + 3760`

**Fields:**
- **HebDob**: Birth year in Hebrew calendar
- **HebDoP**: Death year in Hebrew calendar

**Examples:**
- 1310 CE → 5070
- 1380 CE → 5140
- 2026 CE → 5786

**Priority:**
1. Wikipedia Hebrew year (confidence 90%)
2. Auto-calculated (confidence 70%)

**Function**: `gregorianToHebrewYear(gregorianYear)`

**Location**: `backend/wikipedia-extractor.js` lines ~10-15

---

### 3.3 Hebrew Years - Letters (Gematria)

**Rule**: Convert numeric Hebrew year to Hebrew letters

**Format**: Abbreviated with ה' prefix (for years 5000+)

**Examples:**
- 5070 → ה'ע
- 5140 → ה'קמ
- 5750 → ה'תש"ן

**Special Rules:**
- Use abbreviated format (thousands: ה')
- Avoid יה and יו → use טו/טז for 15/16
- Add gershayim (") before last letter (multi-letter numbers)

**Hebrew Numeral Mapping:**
```javascript
1: א, 2: ב, 3: ג, 4: ד, 5: ה, 6: ו, 7: ז, 8: ח, 9: ט
10: י, 20: כ, 30: ל, 40: מ, 50: נ, 60: ס, 70: ע, 80: פ, 90: צ
100: ק, 200: ר, 300: ש, 400: ת
```

**Function**: `hebrewYearToLetters(hebrewYear)`

**Location**: `backend/wikipedia-extractor.js` lines ~17-60

---

### 3.4 City Auto-Population

**Priority Order:**

1. **Wikipedia infobox** `עיר/יישוב/מקום מגורים` field
   - Confidence: 90%
   - Extract from table row or link title

2. **Name patterns** - Extract from full name
   - `"די [city]"` → city = [city]
   - `"מ[city]"` → city = [city]
   - `"מן [city]"` → city = [city]
   - Example: "רבי ישעיה די טראני" → City = "טראני"
   - Confidence: 70%

3. **PlaceOfBirth/PlaceOfPtira** - Extract first part before comma
   - Example: "נושטאט, אוסטריה" → City = "נושטאט"
   - Confidence: 50%

**Location**: `backend/wikipedia-extractor.js` lines ~420-440

---

### 3.5 Country Auto-Population

**Priority Order:**

1. **Wikipedia infobox** `מדינה/ארץ` field
   - Confidence: 90%

2. **Text patterns** - "ראשוני [country]"
   - Example: "מראשוני איטליה" → Country = "איטליה"
   - Confidence: 80%

3. **Birth/Death field** - Part after comma
   - Example: "נושטאט, אוסטריה" → Country = "אוסטריה"
   - Confidence: 50%

4. **Pattern matching** - Known countries list
   - List: אוסטריה, גרמניה, פולין, איטליה, ספרד, צרפת, אנגליה, רוסיה, אוקראינה, הולנד, בלגיה, שווייץ, ארצות הברית, ישראל, ארץ ישראל, מרוקו, תורכיה
   - Confidence: 50-75%

**Location**: `backend/wikipedia-extractor.js` lines ~370-410

---

### 3.6 PlaceOfBirth Fallback

**Rule**: If PlaceOfBirth not found in Wikipedia, use City value

**Logic**:
```javascript
if (!rabbi.PlaceOfBirth && rabbi.City) {
  rabbi.PlaceOfBirth = rabbi.City;
  confidence.fields.PlaceOfBirth = 40;
}
```

**Rationale**: If we know the city where rabbi lived, assume born there unless specified otherwise

**Location**: `backend/wikipedia-extractor.js` lines ~616-620

---

### 3.7 PlaceOfPtira Fallback

**Rule**: If PlaceOfPtira (place of death) not found in Wikipedia, use City value

**Logic**:
```javascript
if (!rabbi.PlaceOfPtira && rabbi.City) {
  rabbi.PlaceOfPtira = rabbi.City;
  confidence.fields.PlaceOfPtira = 40;
}
```

**Rationale**: If we know the city where rabbi lived, assume died there unless specified otherwise

**Location**: `backend/wikipedia-extractor.js` lines ~622-626

---

### 3.8 URL Auto-Set

**Rule**: Always set to Wikipedia source URL

**Format**: `https://he.wikipedia.org/wiki/[encoded_title]`

**Example**: 
- Input title: "רבי ישעיה די טראני"
- URL: `https://he.wikipedia.org/wiki/%D7%A8%D7%91%D7%99_%D7%99%D7%A9%D7%A2%D7%99%D7%94_%D7%93%D7%99_%D7%98%D7%A8%D7%90%D7%A0%D7%99`

**Location**: `backend/server.js` line ~582

---

## 4. Database Operations

### 4.1 Existing Rabbi Search

**When**: Before every Wikipedia extraction

**Search Query**:
```sql
SELECT TOP 1 t.*, tr.FullName, tr.KnownAs, tr.City, tr.Country, tr.Period,
       tr.PlaceOfBirth, tr.PlaceOfPtira, tr.KnownFor, tr.Notes, tr.Sources, tr.URL
FROM Talmidei_Hahamim t
LEFT JOIN Talmidei_Hahamim_Translations tr ON t.RabbiID = tr.RabbiID AND tr.LanguageCode = 'he'
WHERE t.HebFullName = @hebrewName 
   OR t.HebFullName LIKE '%' + @hebrewName + '%'
   OR tr.FullName = @hebrewName 
   OR tr.FullName LIKE '%' + @hebrewName + '%'
   OR tr.KnownAs = @hebrewName
   OR tr.KnownAs LIKE '%' + @hebrewName + '%'
ORDER BY 
    CASE 
        WHEN t.HebFullName = @hebrewName THEN 1
        WHEN tr.FullName = @hebrewName THEN 2
        WHEN tr.KnownAs = @hebrewName THEN 3
        ELSE 4
    END
```

**Priority Matching:**
1. HebFullName exact match
2. FullName exact match
3. KnownAs exact match
4. LIKE matches (partial)

**Location**: `backend/server.js` lines ~467-491

---

### 4.2 Data Source Priority (When Rabbi Exists)

**Process:**

1. **Load Database Data** (Priority 1)
   - Retrieve from Talmidei_Hahamim + Translations
   - Mark all fields with `fieldSources: 'database'`
   - Include related: Sforim, Events, AssociatedWith

2. **Extract Wikipedia Data** (Priority 2)
   - Parse Wikipedia HTML
   - Mark all fields with `fieldSources: 'wikipedia'`

3. **Merge**:
   ```javascript
   // Start with Wikipedia data
   let mergedData = { ...wikipediaRabbi };
   
   // Overlay database values (they take priority)
   if (dbData) {
     for (const key in dbData) {
       if (dbData[key] !== null && dbData[key] !== '') {
         mergedData[key] = dbData[key];
         fieldSources[key] = 'database';
       }
     }
     
     // Then add Wikipedia values for empty fields
     for (const key in wikipediaRabbi) {
       if (fieldSources[key] !== 'database' && wikipediaRabbi[key]) {
         mergedData[key] = wikipediaRabbi[key];
         fieldSources[key] = 'wikipedia';
       }
     }
   }
   ```

4. **Set Flag**: `databaseRecord: true`

**Result**: Merged data with database values taking priority

**Location**: `backend/server.js` lines ~540-580

---

### 4.3 Save Behavior - UPDATE vs INSERT

**Decision Logic**:
```javascript
const isDatabaseRecord = extractedData?.databaseRecord || false;

if (isDatabaseRecord) {
  // UPDATE MODE
  rabbiId = extractedData.rabbi.RabbiID;
  // Update only Wikipedia or manually-edited fields
} else {
  // INSERT MODE
  // Create new record with all fields
}
```

**UPDATE MODE** (`databaseRecord === true`):

**Fields Updated:**
- Fields from Wikipedia: `fieldSources[key] === 'wikipedia'`
- Fields manually edited: `currentValue !== originalDbValue`

**Fields Preserved:**
- All database-sourced fields

**Code**:
```javascript
const updateFields = {};
const originalDbData = extractedData.rabbi;

for (const key in rabbi) {
  const currentValue = rabbi[key];
  const originalValue = originalDbData[key];
  const isFromWikipedia = fieldSources[key] === 'wikipedia' || fieldSources[key] === 'calculated';
  const isModifiedByUser = currentValue !== originalValue && originalValue !== undefined;
  
  if ((isFromWikipedia || isModifiedByUser) && currentValue !== null && currentValue !== '') {
    updateFields[key] = currentValue;
  }
}

databaseService.updateRabbi(rabbiId, updateFields);
```

**INSERT MODE** (`databaseRecord === false`):

**Fields Inserted:** All fields regardless of source

**Code**:
```javascript
databaseService.createRabbi(rabbi);
```

**Location**: `src/app/admin-import/admin-import.component.ts` lines ~370-430

---

### 4.4 Multi-Table Update

**Table Schema Split:**

**Main Table (Talmidei_Hahamim):**
- RabbiID (PK)
- YearOfBirth
- YearOfDeath
- HebDob
- HebDoP
- Assumed
- ImageUrl
- wiki_city_map_url
- HebFullName
- HebPlaceOfBirth
- HebPlaceOfPtira
- id

**Translations Table (Talmidei_Hahamim_Translations):**
- RabbiID (FK)
- LanguageCode ('he', 'en', etc.)
- FullName
- KnownAs
- City
- Country
- Period
- PlaceOfBirth
- PlaceOfPtira
- KnownFor
- Notes
- Sources
- URL

**Update Logic**:
```javascript
updateRabbi(rabbiId, fields) {
  const mainTableFields = ['YearOfBirth', 'YearOfDeath', 'HebDob', 'HebDoP', 
                           'Assumed', 'ImageUrl', 'wiki_city_map_url'];
  const translationFields = ['FullName', 'KnownAs', 'City', 'Country', 'Period',
                             'PlaceOfBirth', 'PlaceOfPtira', 'KnownFor', 
                             'Notes', 'Sources', 'URL'];
  
  // Split fields into two groups
  const mainSetClauses = [];
  const transSetClauses = [];
  
  Object.keys(fields).forEach((key) => {
    if (mainTableFields.includes(key)) {
      mainSetClauses.push(`[${key}] = ...`);
    } else if (translationFields.includes(key)) {
      transSetClauses.push(`[${key}] = ...`);
    }
  });
  
  // Generate two UPDATE statements
  let sql = '';
  if (mainSetClauses.length > 0) {
    sql += `UPDATE [Talmidei_Hahamim] SET ${mainSetClauses.join(', ')} WHERE [RabbiID] = ${rabbiId};`;
  }
  if (transSetClauses.length > 0) {
    sql += `UPDATE [Talmidei_Hahamim_Translations] SET ${transSetClauses.join(', ')} WHERE [RabbiID] = ${rabbiId} AND [LanguageCode] = 'he';`;
  }
  
  return executeQuery(sql);
}
```

**Location**: `src/app/services/database.service.ts` lines ~115-165

---

### 4.5 Events Update Logic

**Rule**: Compare with original data, UPDATE if changed (don't duplicate)

**Process:**

1. **On Extraction**: Store `originalEvents[]`
   ```javascript
   this.originalEvents = JSON.parse(JSON.stringify(extractedData.events));
   ```

2. **On Save**: For each event, check if it exists
   ```javascript
   for (const event of editableEvents) {
     const originalEvent = originalEvents.find(
       e => e.HebEventDescription === event.HebEventDescription
     );
     
     if (originalEvent && originalEvent.EventID) {
       // Event exists - check if changed
       if (originalEvent.HebEventDescription !== event.HebEventDescription) {
         // UPDATE existing event
         await databaseService.updateEvent(originalEvent.EventID, {
           HebEventDescription: event.HebEventDescription,
           ...otherFields
         });
       }
     } else {
       // New event - INSERT
       await databaseService.createEvent(event);
     }
   }
   ```

**Location**: `src/app/admin-import/admin-import.component.ts` lines ~450-500

---

### 4.6 Relationships Update Logic

**Rule**: Compare with original data, UPDATE if changed (don't duplicate)

**Relationship Codes:**
- 30 = רבו של (teacher)
- 31 = תלמידו של (student)
- 1-45 = Various relationship types

**Process:**

1. **On Extraction**: Store `originalRelationships[]`

2. **On Save**: For each relationship, check if it exists
   ```javascript
   for (const rel of editableRelationships) {
     const originalRel = originalRelationships.find(
       r => r.Rabbi2Id === rel.Rabbi2Id && r.RelationshipCode === rel.relationshipCode
     );
     
     if (originalRel && originalRel.AssociationID) {
       // Relationship exists - check if changed
       if (hasChanged(originalRel, rel)) {
         // UPDATE existing
         await databaseService.updateAssociation(originalRel.AssociationID, rel);
       }
     } else {
       // New relationship - INSERT
       await databaseService.createAssociation(rel);
     }
   }
   ```

**Location**: `src/app/admin-import/admin-import.component.ts` lines ~515-600

---

## 5. Wikipedia Extraction

### 5.1 Full Name Extraction

**Source**: First `<b>` (bold) tag in first paragraph

**Pattern**:
```javascript
const firstPara = paragraphs[0].replace(/<sup[^>]*>.*?<\/sup>/gi, '');
const boldMatch = firstPara.match(/<b>([^<]+)<\/b>/);
if (boldMatch) {
  rabbi.FullName = boldMatch[1].trim();
  confidence.fields.FullName = 90;
}
```

**Fallback**: Article title with underscores replaced by spaces

**Examples:**
- `<p>...<b>רבי ישעיה בן אליה די טראני</b>...` → "רבי ישעיה בן אליה די טראני"
- No bold → Use "רבי_ישעיה_די_טראני" → "רבי ישעיה די טראני"

**Confidence:**
- 90% if found in bold
- 50% if from title (fallback)

**Location**: `backend/wikipedia-extractor.js` lines ~130-145

---

### 5.2 Known As (Acronym) Extraction

**Source**: Second bold in first paragraph or parenthetical

**Pattern**:
```javascript
const bolds = firstPara.match(/<b>([^<]+)<\/b>/g);
if (bolds && bolds.length > 1) {
  const secondBold = bolds[1].replace(/<\/?b>/g, '').trim();
  rabbi.knownAs = secondBold;
  confidence.fields.knownAs = 85;
}
```

**Examples:**
- First bold: "רבי יוסף קארו"
- Second bold: "מרן" or "הבית יוסף"
- Result: knownAs = "מרן"

**Confidence:**
- 85% if second bold found
- 60% if from title

**Location**: `backend/wikipedia-extractor.js` lines ~158-173

---

### 5.3 Birth Year Extraction

**Priority Patterns:**

1. **Infobox לידה/תאריך לידה field**
   ```javascript
   html.match(/<th[^>]*>\s*(?:תאריך )?לידה\s*<\/th>\s*<td[^>]*>(.*?)<\/td>/is)
   ```
   - Extract Gregorian year (1-2100 range, not Hebrew 4000+)
   - Check for approximation indicators: בקירוב, סביב, כ-, ~, circa
   - Confidence: 85% (60% if approximate)

2. **Text pattern** - "נולד ב-[year]"
   ```javascript
   html.match(/נולד.*?<a[^>]*>(\d{4})<\/a>/)
   ```
   - Confidence: 85%

3. **Plain text** - "נולד ב-1210"
   ```javascript
   html.match(/נולד\s+ב-?(\d{4})/)
   ```
   - Confidence: 75%

4. **Estimation** - If death year found but no birth year
   ```javascript
   if (rabbi.YearOfDeath && !rabbi.YearOfBirth) {
     rabbi.YearOfBirth = rabbi.YearOfDeath - 70; // Assume 70-year lifespan
     confidence.fields.YearOfBirth = 35; // Low confidence
     datesAreApprox = true;
   }
   ```

**Assumed Flag**: Set if estimated or marked approximate

**Location**: `backend/wikipedia-extractor.js` lines ~273-312

---

### 5.4 Death Year Extraction

**Priority Patterns:**

1. **Infobox פטירה/תאריך פטירה field**
   - Extract Gregorian year (1-2100 range)
   - Check for approximation indicators
   - Confidence: 85% (60% if approximate)

2. **Text pattern** - "נפטר ב-[year]"
   - Confidence: 85%

3. **Plain text** - "נפטר ב-1280"
   - Confidence: 75%

**Assumed Flag**: Set `rabbi.Approx = 1` if dates are approximate

**Location**: `backend/wikipedia-extractor.js` lines ~230-270

---

### 5.5 Hebrew Date Extraction

**Source**: Birth/death infobox fields

**Pattern**: Hebrew letters with gershayim
```javascript
// Match: ד' or ה' followed by 2-4 Hebrew letters with gershayim
const hebLetterMatch = tdContent.match(/([דה]['׳][א-ת]{1,4}["״][א-ת])/);
```

**Examples:**
- ד'תש"ן → 4750
- ה'תשפ"ד → 5784

**Fields:**
- **HebCharDob/HebCharDoP**: String format (e.g., "ה'תש"ן")
- **HebDob/HebDoP**: Numeric format (e.g., 5750)

**Conversion**: `convertHebrewYearToNumeric(hebrewLetters)`

**Fallback**: If not found, auto-calculate (see Section 3.2-3.3)

**Location**: `backend/wikipedia-extractor.js` lines ~320-360

---

### 5.6 Place of Birth Extraction

**Priority Patterns:**

1. **Infobox מקום לידה field**
   ```javascript
   html.match(/מקום לידה[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is)
   ```
   - Extract link title or text content
   - Confidence: 90% (link) or 85% (text)

2. **Text pattern** - "נולד ב[place]" with link
   ```javascript
   html.match(/נולד\s+ב<a[^>]+title="([^"]+)"/)
   ```
   - Filter out dates/years
   - Confidence: 85%

3. **Plain text** - "נולד ב[place]"
   - Confidence: 70%

**Post-processing**: Add Hebrew equivalent if exists
```javascript
if (rabbi.PlaceOfBirth) {
  rabbi.PlaceOfBirth = getPlaceNameWithEquivalent(rabbi.PlaceOfBirth);
}
// Example: "מגנצא" → "מגנצא (מיינץ)"
```

**Fallback**: Use City if not found (see Section 3.6)

**Location**: `backend/wikipedia-extractor.js` lines ~460-510

---

### 5.7 Place of Death (Ptira) Extraction

**Priority Patterns:**

1. **Infobox מקום פטירה field**
   - Confidence: 90% (link) or 85% (text)

2. **פטירה field links** - Extract city from death field
   - Skip: years, Hebrew dates, generic terms (נסיכות, האימפריה, etc.)
   - Confidence: 85%

3. **Text pattern** - "נקבר ב[place]"
   - Confidence: 80%

4. **Text pattern** - "נפטר ב[place]"
   - Confidence: 70%

**Fallback**: Use City if not found (see Section 3.7)

**Location**: `backend/wikipedia-extractor.js` lines ~510-550

---

### 5.8 Image & Map Extraction

**Rabbi Image**:
```javascript
const rabbiImageUrl = extractImageUrl(html);
// Search infobox for <img> tags
if (rabbiImageUrl) {
  rabbi.ImageUrl = rabbiImageUrl;
  confidence.fields.ImageUrl = 90;
}
```

**City Map**:
- Fetch separate Wikipedia page for city
- Extract location map from infobox
- Patterns: "location map", map SVG/PNG images
- Store full URL in `wiki_city_map_url`

**Format Handling**:
- Relative URLs → Convert to absolute
- `//upload.wikimedia.org/...` → `https://upload.wikimedia.org/...`
- `/wiki/File:...` → `https://he.wikipedia.org/wiki/File:...`

**Location**: `backend/wikipedia-extractor.js` lines ~585-605

---

### 5.9 Books (Sforim) Extraction

**Source**: Sections titled "ספרים", "חיבורים", "כתבים", "יצירות"

**Pattern**:
```javascript
const sectionsRegex = /(?:ספרים|חיבורים|כתבים|יצירות)[^\<]*<\/h2>(.*?)(?:<h2|<\/div>)/is;
const sectionMatch = html.match(sectionsRegex);

// Extract list items
const listItems = section.match(/<li[^>]*>(.*?)<\/li>/gi);
```

**Each book extracts:**
- **Title**: Clean text (remove HTML tags)
- **YearPublished**: Extract from `(1234)` pattern
- **Confidence**: 75%

**Example**:
```html
<li>בית יוסף על הטור (1522)</li>
```
→ `{ Title: "בית יוסף על הטור", YearPublished: 1522 }`

**Location**: `backend/wikipedia-extractor.js` lines ~650-700

---

### 5.10 Relationships (Teachers/Students) Extraction

**Source**: Infobox fields "רבותיו" (teachers), "תלמידיו" (students)

**Pattern**:
```javascript
// Teachers
const teachersMatch = html.match(/(?:רבותיו|מוריו)[^\<]*<\/th>(.*?)<\/tr>/is);

// Students
const studentsMatch = html.match(/תלמידיו[^\<]*<\/th>(.*?)<\/tr>/is);
```

**Each relationship extracts:**
- **Name**: Hebrew name from links or text
- **Type**: 'teacher' or 'student'
- **RelationshipCode**: 30 (teacher) or 31 (student)
- **Confidence**: 70%

**Example**:
```html
<th>רבותיו</th>
<td>
  <a href="/wiki/רש%22י">רש"י</a>,
  <a href="/wiki/רבינו_תם">רבינו תם</a>
</td>
```
→ Two relationships: רש"י (code 30), רבינו תם (code 30)

**Location**: `backend/wikipedia-extractor.js` lines ~710-760

---

### 5.11 Events & Facts Extraction

**Source**: Life events sections or timeline

**Pattern**: Extract notable life events from article text

**Each event extracts:**
- **HebEventDescription**: Hebrew description
- **Year**: Event year if mentioned
- **Confidence**: 50-70%

**Location**: `backend/wikipedia-extractor.js` (events extraction function)

---

## 6. External Sources Integration

### 6.1 Jewish Encyclopedia

**Status**: Advanced integration (see original rules.md lines 204-495)

**Key Features:**
- OCR text extraction
- Rabbi name matching
- Cross-referencing
- Biographical data

**Priority**: Lower than Wikipedia (historical data)

---

### 6.2 HebrewBooks.org Integration

**Status**: Available (see original rules.md lines 943-1435)

**Key Features:**
- 100,000+ Hebrew books
- PDF downloads
- Sefer metadata
- Author linking

**API**: Web scraping with rate limiting

**Cost**: FREE

**Priority**: Medium (book references)

---

### 6.3 Otzar HaChochma

**Status**: Requires subscription (see original rules.md lines 1436-2067)

**Key Features:**
- 100,000+ books
- Local database access
- Advanced search
- Full OCR text

**Cost**: $360/year

**Priority**: Highest IF subscribed (instant access)

**Recommendation**: Start with HebrewBooks (free), upgrade to Otzar for speed

---

### 6.4 Cross-Source Comparison

**Status**: Deduplication rules (see original rules.md lines 496-942)

**Process:**
1. Extract from all sources
2. Compare facts by content (not ID)
3. Merge duplicates
4. Keep highest confidence version
5. Track sources for each fact

---

## 7. Search & Error Handling

### 7.1 Fuzzy Wikipedia Search

**Rule**: Remove common Hebrew prefixes and try variations

**Prefixes Removed**: ר, רבי, הרב, רב

**Process**:
```javascript
const variations = [
  searchTerm,                          // Original: "רבי משה"
  searchTerm.replace(/^ר[בי]?\s+/, ''), // Remove prefix: "משה"
  searchTerm.replace(/^הרב\s+/, ''),   // Remove "הרב": "משה"
  searchTerm.replace(/^רב\s+/, '')     // Remove "רב": "משה"
];

// Try each variation with Wikipedia OpenSearch API
for (const variant of variations) {
  const results = await searchWikipedia(variant);
  if (results.length > 0) return results;
}
```

**Example**:
- User searches: "רבי שלום מנוישטאט"
- Variations tried:
  1. "רבי שלום מנוישטאט"
  2. "שלום מנוישטאט"
- Finds: "שלום מנושטאדט" (different spelling)

**Location**: `backend/server.js` `/api/search-wikipedia` and `/api/extract-wikipedia`

---

### 7.2 Missing Rabbis Tracking

**Rule**: Track rabbis mentioned in relationships but not in database

**Process**:
```javascript
// When extracting relationships
for (const rel of extractedRelationships) {
  const rabbiName = rel.name;
  
  // Search database
  const found = await searchRabbi(rabbiName);
  
  if (!found) {
    // Track missing rabbi
    missingRabbis.push(rabbiName);
  } else {
    // Link to existing rabbi
    rel.Rabbi2Id = found.RabbiID;
  }
}
```

**Display**: Yellow warning box with list

**Behavior**: 
- Continue processing (don't crash)
- Save successful relationships
- Skip relationships to missing rabbis

**User Action**: Can add missing rabbis via import page

**Location**: `src/app/admin-import/admin-import.component.ts` lines ~36-50

---

### 7.3 Graceful Error Handling

**Rules**:

1. **Wikipedia Search Fails**: Show "❌ Wikipedia page not found" message
2. **Database Connection Fails**: Continue with Wikipedia data only
3. **Missing Relationship Rabbi**: Track in missingRabbis[], don't crash
4. **Invalid Date**: Use estimation or leave empty
5. **Image Not Found**: Continue without image

**Pattern**:
```javascript
try {
  const result = await riskyOperation();
  // Use result
} catch (error) {
  console.error('Operation failed:', error);
  // Track error
  // Continue with fallback or skip
}
```

**No Fatal Errors**: Always allow user to save partial data

---

### 7.4 Relationship Types - Full List

**Rule**: Show all 45 relationship types in dropdown (not just 4)

**Implementation**:
```html
<select [(ngModel)]="rel.relationshipCode">
  <option *ngFor="let type of relationshipTypes" [value]="type.code">
    {{ type.name }}
  </option>
</select>
```

**Relationship Codes (Sample)**:
- 1-10: Family relationships
- 11-20: Academic relationships
- 21-29: Community relationships
- 30: רבו של (teacher of)
- 31: תלמידו של (student of)
- 32-45: Other relationships

**Source**: Backend relationship types mapping

**Location**: `src/app/admin-import/admin-import.component.html` line ~375

---

## 8. UI/UX Display Rules

### 8.1 RabbiID Display

**Rule**: Show blue info box when existing record detected

**Condition**:
```html
<div class="message info" 
     *ngIf="extractedData?.databaseRecord && extractedData?.rabbi?.RabbiID">
```

**Content**:
- **Hebrew**: "📝 רשומה קיימת במאגר"
- **RabbiID**: Display numeric ID
- **Assurance**: "שמירה תעדכן את הרשומה הקיימת (לא תיצור כפילות)"

**Styling**:
```css
.message.info {
  background: #e3f2fd;      /* Light blue */
  color: #0d47a1;           /* Dark blue text */
  border: 1px solid #2196f3; /* Blue border */
  text-align: right;
  direction: rtl;
  padding: 12px 16px;
}
```

**Purpose**: Give user confidence that save will UPDATE, not create duplicate

**Location**: `src/app/admin-import/admin-import.component.html` lines ~58-64

---

### 8.2 Field Color Coding

**Rule**: Visual indication of data source

**Colors**:
- **Standard/White**: Database fields (existing data, won't be overwritten)
- **Yellow/Highlighted**: Wikipedia fields (new data from extraction)
- **Green** (legacy): Database priority indicator

**Implementation**: CSS classes based on fieldSources
```html
<input [ngClass]="{'field-database': fieldSources['FullName'] === 'database',
                   'field-wikipedia': fieldSources['FullName'] === 'wikipedia'}"
       [(ngModel)]="rabbi.FullName">
```

**Purpose**: User transparency about data origin

---

### 8.3 Missing Rabbis Warning

**Rule**: Display yellow warning box for rabbis not in database

**Condition**:
```html
<div class="message warning" *ngIf="missingRabbis.length > 0">
```

**Content**:
- **Title**: "⚠️ תלמידי חכמים חסרים במאגר"
- **Message**: "הרבנים הבאים אינם במאגר ויש להוסיפם:"
- **List**: Bullet list of missing rabbi names
- **Hint**: "נא להזין את הרבנים החסרים דרך עמוד הייבוא"

**Styling**:
```css
.message.warning {
  background: #fff3cd;      /* Light yellow */
  color: #856404;           /* Dark yellow text */
  border: 1px solid #ffc107; /* Yellow border */
}
```

**Location**: `src/app/admin-import/admin-import.component.html` lines ~68-77

---

### 8.4 Success/Error Messages

**Success Messages**:
- "✅ Rabbi saved successfully! ID: [X]"
- "✅ Rabbi updated with [X] new fields"
- "✅ [X] books added"

**Error Messages**:
- "❌ Failed to save rabbi"
- "❌ Wikipedia page not found"
- "❌ Cannot find existing rabbi ID for update"

**Display**:
```html
<div class="message success" *ngIf="successMessage">
  ✅ {{ successMessage }}
</div>
<div class="message error" *ngIf="errorMessage">
  ❌ {{ errorMessage }}
</div>
```

---

## 9. Technical Implementation

### 9.1 File Locations Reference

**Backend:**
- `backend/server.js` - Express API endpoints, extraction coordination
- `backend/database.js` - Database operations (create/update/query)
- `backend/wikipedia-extractor.js` - Wikipedia HTML parsing & data extraction

**Frontend:**
- `src/app/admin-import/admin-import.component.ts` - Import page logic
- `src/app/admin-import/admin-import.component.html` - Import page template
- `src/app/admin-import/admin-import.component.css` - Import page styles
- `src/app/services/database.service.ts` - API service for database operations

**Configuration:**
- `rules.md` - Legacy rules documentation (this file replaces)
- `rules-v2.md` - This restructured documentation

---

### 9.2 Database Schema

**Main Table - Talmidei_Hahamim:**
```sql
CREATE TABLE Talmidei_Hahamim (
  RabbiID INT PRIMARY KEY IDENTITY(1,1),
  HebFullName NVARCHAR(255),
  HebPlaceOfBirth NVARCHAR(255),
  HebPlaceOfPtira NVARCHAR(255),
  YearOfBirth INT,
  YearOfDeath INT,
  HebDob INT,           -- Hebrew year numeric
  HebDoP INT,           -- Hebrew year numeric
  Assumed TINYINT,      -- 0=exact, 1=approximate/estimated
  ImageUrl NVARCHAR(500),
  wiki_city_map_url NVARCHAR(500),
  id INT
);
```

**Translations Table - Talmidei_Hahamim_Translations:**
```sql
CREATE TABLE Talmidei_Hahamim_Translations (
  RabbiID INT,
  LanguageCode NVARCHAR(10),
  FullName NVARCHAR(255),
  KnownAs NVARCHAR(255),
  City NVARCHAR(255),
  Country NVARCHAR(255),
  Period NVARCHAR(100),
  PlaceOfBirth NVARCHAR(255),
  PlaceOfPtira NVARCHAR(255),
  KnownFor NVARCHAR(MAX),
  Notes NVARCHAR(MAX),
  Sources NVARCHAR(MAX),
  URL NVARCHAR(500),
  PRIMARY KEY (RabbiID, LanguageCode),
  FOREIGN KEY (RabbiID) REFERENCES Talmidei_Hahamim(RabbiID)
);
```

**Related Tables:**
- **Sforim** - Books (RabbiID FK)
- **Events_and_facts** - Life events (RabbiID FK)
- **AssociatedWith** - Relationships (RabbiID, Rabbi2Id FKs)

---

### 9.3 API Endpoints

**Wikipedia Extraction:**
```
POST /api/extract-wikipedia
Body: { url?: string, name?: string }
Response: { success: boolean, data: { rabbi, fieldSources, books, relationships, events, databaseRecord, confidence, source } }
```

**Wikipedia Search:**
```
POST /api/search-wikipedia
Body: { name: string }
Response: { success: boolean, results: [{ title, url }] }
```

**Rabbi CRUD:**
```
GET  /api/rabbis              - List all rabbis
POST /api/rabbis              - Create new rabbi
PUT  /api/rabbis/:id          - Update rabbi (not used, use updateRabbi service method)
```

**Books:**
```
POST /api/books               - Create book
```

**Events:**
```
POST /api/events              - Create event
```

**Relationships:**
```
POST /api/associations        - Create relationship
```

**City Maps:**
```
GET /api/city-map/:cityName   - Get Wikipedia city map
```

---

### 9.4 Hebrew Year Conversion Functions

**Gregorian to Hebrew Numeric:**
```javascript
function gregorianToHebrewYear(gregorianYear) {
  if (!gregorianYear) return null;
  return gregorianYear + 3760;
}
```

**Hebrew Numeric to Letters:**
```javascript
function hebrewYearToLetters(hebrewYear) {
  if (!hebrewYear || hebrewYear < 5000) return '';
  
  const hebrewNumerals = {
    1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
    10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ',
    100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת'
  };
  
  const thousands = Math.floor(hebrewYear / 1000);
  const remainder = hebrewYear % 1000;
  
  let result = hebrewNumerals[thousands] + "'";
  
  const hundreds = Math.floor(remainder / 100) * 100;
  const tens = Math.floor((remainder % 100) / 10) * 10;
  const ones = remainder % 10;
  
  if (hundreds > 0) result += hebrewNumerals[hundreds];
  
  // Special cases for 15 and 16 (avoid God's name)
  if (tens === 10 && ones === 5) {
    result += 'טו';
  } else if (tens === 10 && ones === 6) {
    result += 'טז';
  } else {
    if (tens > 0) result += hebrewNumerals[tens];
    if (ones > 0) result += hebrewNumerals[ones];
  }
  
  // Add gershayim before last letter
  if (result.length > 2) {
    result = result.slice(0, -1) + '"' + result.slice(-1);
  }
  
  return result;
}
```

---

## 10. Commands & Troubleshooting

### 10.1 Application Commands

**Restart Application (ra):**

**Workflow when user types "ra":**
1. **Consult Rules (cr)** - Review rules.md documentation
2. **Verify Code Compliance** - Check each implemented rule:
   - Auto-population rules (Period, Hebrew years, City, Country, etc.)
   - Database search and update logic
   - Field source tracking
   - Multi-table updates
   - UI display rules (RabbiID info box, color coding)
   - Error handling (fuzzy search, missing rabbis)
3. **Confirm Compliance** - Verify all rules are properly implemented
4. **Restart Application** - Only after verification:
   ```powershell
   .\scripts\ra.ps1
   ```

**Shortcut**: `ra` = Verify + Restart

**View Backend Logs:**
```powershell
Receive-Job -Name BackendServer -Keep | Select-Object -Last 30
```

**View Frontend Logs:**
```powershell
Receive-Job -Name FrontendServer -Keep | Select-Object -Last 30
```

**Stop All:**
```powershell
Get-Job | Stop-Job; Get-Job | Remove-Job
```

**Consult Rules:**
- **Abbreviation**: `cr`
- **Meaning**: Consult the rules.md file
- **Usage**: When you type "cr", it means check/reference the rules documentation for guidance on implementation, data flow, or troubleshooting

---

### 10.2 Database Connectivity

**Test Connection:**
- Navigate to admin page
- Check "Database: Hazal" indicator
- Verify connection status

**Connection String** (backend/database.js):
```javascript
{
  server: 'localhost\\SQLEXPRESS',
  database: 'Hazal',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
}
```

**Common Issues:**
1. SQL Server not running → Start SQL Server service
2. Database not found → Verify database name "Hazal"
3. Connection timeout → Check firewall, SQL Server settings

---

### 10.3 Common Troubleshooting

**Issue: Duplicate Records Created**
- **Check**: Is blue "רשומה קיימת במאגר" box showing?
- **If NO**: Database search not finding rabbi → Check HebFullName field
- **If YES but still duplicates**: Check browser console for `isDatabaseRecord` and `RabbiID`
- **Solution**: Verify search query includes HebFullName, FullName, KnownAs

**Issue: Fields Not Auto-Populating**
- **Check**: Backend logs for extraction process
- **Verify**: Wikipedia page has data (view source)
- **Test**: Extract manually, check console output
- **Solution**: Enhance extraction patterns in wikipedia-extractor.js

**Issue: Hebrew Years Not Calculating**
- **Check**: YearOfBirth or YearOfDeath present?
- **Verify**: hebrewYearToLetters function exists
- **Solution**: Backend restart after code changes

**Issue: Compilation Errors**
- **Check**: Frontend logs for TypeScript errors
- **Common**: Stray `\n` characters, missing semicolons
- **Solution**: Fix syntax errors, Angular auto-rebuilds

---

### 10.4 Debug Logging

**Backend Logging Format:**
```
[Extract] Searching database for: "[name]"
[Extract] Found existing rabbi in database: RabbiID=X, FullName=...
[Extract] No existing rabbi found in database for: "[name]"
[Extract] Sending response: databaseRecord=true/false, RabbiID=X
```

**Frontend Logging Format:**
```
[Frontend] Extraction result: { ... }
[Frontend] databaseRecord: true/false
[Frontend] RabbiID: X
Starting save process...
isDatabaseRecord: true/false
INSERT MODE: Creating new rabbi
```

**Enable More Logging:**
```javascript
console.log('Debug info:', variable);
```

---

## Appendix: Confidence Levels

### Confidence Scale

- **90-100%**: Explicit structured data (infobox fields)
- **80-89%**: Linked data in article text
- **70-79%**: Unlinked text in article body
- **60-69%**: Calculated from reliable sources
- **50-59%**: Inferred from patterns
- **40-49%**: Fallback/default values
- **30-39%**: Estimated (e.g., birth = death - 70)
- **Below 30%**: Highly uncertain

### Usage

Confidence levels determine:
1. Which data source to prioritize
2. Whether to show data to user
3. Whether to set Assumed flag
4. UI indicators for data quality

---

## Document History

- **Version 1.0**: Original rules.md (2990 lines, various dates)
- **Version 2.0**: Restructured March 8, 2026
  - Consolidated sections
  - Removed duplication
  - Added quick reference
  - Standardized formatting
  - Cross-referenced sections
  - Added table of contents

---

**End of Rules Documentation v2.0**
