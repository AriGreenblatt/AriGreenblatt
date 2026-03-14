# Talmidei Hahamim Application - Code Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [Methods Reference](#methods-reference)
5. [Template & Method Mapping](#template--method-mapping)
6. [Data Flow](#data-flow)

---

## Application Overview

This is an Angular 19 application for managing a database of Talmidei Hahamim (Jewish Sages). It features:
- RTL Hebrew interface
- Master-detail view with main table and left panel
- Multi-column filtering and searching
- CRUD operations for rabbis
- Relationship tracking (teacher/student connections)
- Sforim (books) display per rabbi
- Excel export functionality

### Tech Stack
- **Frontend**: Angular 19 (standalone components)
- **Backend**: Node.js/Express (localhost:3000)
- **Database**: SQL Server (database: Hazal)


---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Angular)                       │
│                         localhost:4200                           │
├─────────────────────────────────────────────────────────────────┤
│  app.component.ts    │  database.service.ts                     │
│  (Main Logic)        │  (HTTP API calls)                        │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              │ HTTP REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                          │
│                    localhost:3000                                │
│                    backend/server.js                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ mssql driver
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SQL Server Database                           │
│                    Database: Hazal                               │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  • Talmidei_Hahamim (125 records) - Main sages table            │
│  • Talmidim - Teacher/student relationships                      │
│  • Relationships - Relationship type definitions                 │
│  • sforim (8 records) - Books authored by sages                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Structure

### File: `src/app/app.component.ts` (641 lines)

This is the main (and only) component handling all application logic.

### Properties

| Property | Type | Purpose |
|----------|------|---------|
| `title` | `string` | App title displayed in header |
| `connectionStatus` | `string` | Database connection status |
| `tables` | `TableInfo[]` | List of database tables |
| `talmideiHahamim` | `any[]` | All rabbis from database |
| `filteredTalmideiHahamim` | `any[]` | Rabbis after filtering |
| `selectedRabbi` | `any` | Currently selected rabbi |
| `isLoading` | `boolean` | Loading state indicator |
| `error` | `string \| null` | Error message display |
| `sortColumn` | `string` | Current sort column |
| `sortDirection` | `'asc' \| 'desc'` | Sort direction |
| `currentView` | `'rabbis' \| 'talmidim'` | Current view mode |
| `talmidim` | `any[]` | All talmidim relationships |
| `filteredTalmidim` | `any[]` | Filtered talmidim |
| `sforim` | `any[]` | All books data |
| `cities` | `string[]` | Unique cities for filter |
| `countries` | `string[]` | Unique countries for filter |
| `periods` | `string[]` | Unique periods for filter |
| `selectedCities` | `string[]` | Selected city filters |
| `selectedCountries` | `string[]` | Selected country filters |
| `selectedPeriods` | `string[]` | Selected period filters |
| `searchText` | `string` | Global search text |
| `columnFilters` | `{[key: string]: string}` | Per-column filter values |
| `showCityDropdown` | `boolean` | City dropdown visibility |
| `showCountryDropdown` | `boolean` | Country dropdown visibility |
| `showPeriodDropdown` | `boolean` | Period dropdown visibility |
| `isAddingNew` | `boolean` | Add new rabbi mode |
| `newRabbi` | `any` | New rabbi form data |
| `editingRabbiId` | `number \| null` | ID of rabbi being edited |
| `editingRabbi` | `any` | Edit form data |

---

## Methods Reference

### 1. Data Loading Methods

| Method | Purpose |
|--------|---------|
| `ngOnInit()` | Lifecycle hook - loads initial data on component start |
| `testConnection()` | Tests database connection and loads tables if successful |
| `loadTables()` | Fetches list of database tables |
| `loadTalmideiHahamim()` | Fetches all rabbis (limit: 1000) and populates filter options |
| `loadTalmidim()` | Fetches all teacher/student relationships |
| `loadSforim()` | Fetches all books data |

#### `loadTalmideiHahamim()` - Detailed
```typescript
loadTalmideiHahamim() {
  this.databaseService.getTableData('Talmidei_Hahamim', 1000).subscribe({
    next: (response) => {
      this.talmideiHahamim = Array.isArray(response.data) ? response.data : response.data.data;
      this.filteredTalmideiHahamim = [...this.talmideiHahamim];
      this.extractFilterOptions();
    },
    error: (error) => { ... }
  });
}
```

---

### 2. Filtering Methods

| Method | Purpose |
|--------|---------|
| `extractFilterOptions()` | Extracts unique cities/countries/periods from data for filter dropdowns |
| `getFilteredSforim()` | Returns books filtered by selected rabbi's RabbiID |
| `getFilteredCities()` | Returns cities filtered by selected countries (cross-filtering) |
| `getFilteredCountries()` | Returns countries filtered by selected cities (cross-filtering) |
| `toggleDropdown(type)` | Opens/closes filter dropdowns (city/country/period) |
| `toggleCity(city)` | Adds/removes a city from the filter selection |
| `toggleCountry(country)` | Adds/removes a country from the filter selection |
| `togglePeriod(period)` | Adds/removes a period from the filter selection |
| `clearAllFilters(type)` | Clears all selections for a filter type |
| `isSelected(type, value)` | Checks if a value is currently selected in a filter |
| `applyFilters()` | Master filter method - applies all active filters to the data |
| `onSearchChange()` | Called when search text changes - triggers applyFilters() |

#### `applyFilters()` - Detailed
```typescript
applyFilters() {
  this.filteredTalmideiHahamim = this.talmideiHahamim.filter(rabbi => {
    // Check city filter
    const cityMatch = this.selectedCities.length === 0 || 
                      this.selectedCities.includes(rabbi.City);
    
    // Check country filter
    const countryMatch = this.selectedCountries.length === 0 || 
                         this.selectedCountries.includes(rabbi.Country);
    
    // Check period filter
    const periodMatch = this.selectedPeriods.length === 0 || 
                        this.selectedPeriods.includes(rabbi.Period);
    
    // Check global search (FullName or knownAs)
    const searchMatch = !this.searchText || 
      rabbi.FullName?.toLowerCase().includes(this.searchText.toLowerCase()) ||
      rabbi.knownAs?.toLowerCase().includes(this.searchText.toLowerCase());
    
    // Check column-specific filters
    const columnMatch = Object.keys(this.columnFilters).every(col => {
      const filterValue = this.columnFilters[col];
      if (!filterValue) return true;
      
      // Numeric columns: starts-with match
      // Text columns: contains match (case-insensitive)
    });
    
    return cityMatch && countryMatch && periodMatch && searchMatch && columnMatch;
  });
}
```

---

### 3. Selection & Sorting Methods

| Method | Purpose |
|--------|---------|
| `selectRabbi(rabbi)` | Sets the selected rabbi (updates left panel) |
| `selectRabbiById(rabbiId)` | Finds rabbi by ID, clears filters if needed, moves to top, selects |
| `sortBy(column)` | Sorts table by column, toggles asc/desc on repeated clicks |

#### `selectRabbiById()` - Used for Navigation
```typescript
selectRabbiById(rabbiId: number) {
  const rabbi = this.talmideiHahamim.find(r => r.RabbiID === rabbiId);
  if (rabbi) {
    // If rabbi not visible in filtered list, clear filters
    if (this.filteredTalmideiHahamim.findIndex(r => r.RabbiID === rabbiId) === -1) {
      this.selectedCities = [];
      this.selectedCountries = [];
      this.selectedPeriods = [];
      this.searchText = '';
      this.applyFilters();
    }
    // Move to top of list and select
    this.filteredTalmideiHahamim = this.filteredTalmideiHahamim.filter(r => r.RabbiID !== rabbiId);
    this.filteredTalmideiHahamim.unshift(rabbi);
    this.selectRabbi(rabbi);
  }
}
```

---

### 4. Rabbi CRUD Methods

| Method | Purpose |
|--------|---------|
| `startAddingNew()` | Enables add mode, initializes empty newRabbi object |
| `cancelAddNew()` | Cancels add mode, clears newRabbi |
| `saveNewRabbi()` | Validates and saves new rabbi to database via API |
| `startEditing(rabbi)` | Enables edit mode for a rabbi, copies data to editingRabbi |
| `cancelEdit()` | Cancels edit mode, clears editingRabbi |
| `saveEdit()` | Validates and saves edited rabbi to database via API |
| `isEditing(rabbi)` | Returns true if this rabbi is currently being edited |

#### CRUD Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ View Mode   │────▶│ Edit Mode   │────▶│ Save        │
│             │     │             │     │             │
│ startEditing│     │ editingRabbi│     │ saveEdit()  │
│ startAddingNew    │ newRabbi    │     │ saveNewRabbi│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   ▼
       │                   │            ┌─────────────┐
       │                   │            │ API Call    │
       │                   │            │ reload data │
       │                   │            └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │ cancelEdit()│
       │            │ cancelAddNew│
       │            └─────────────┘
       │                   │
       ◀───────────────────┘
```

---

### 5. Talmidim CRUD Methods

| Method | Purpose |
|--------|---------|
| `switchView(view)` | Switches between 'rabbis' and 'talmidim' views |
| `startAddingNewTalmid()` | Enables add mode for talmid relationship |
| `cancelAddNewTalmid()` | Cancels talmid add mode |
| `saveNewTalmid()` | Saves new teacher/student relationship |
| `startEditingTalmid(talmid)` | Enables edit mode for talmid |
| `cancelEditTalmid()` | Cancels talmid edit mode |
| `saveEditTalmid()` | Saves edited talmid relationship |
| `isEditingTalmid(talmid)` | Returns true if this talmid is being edited |

---

### 6. Utility Methods

| Method | Purpose |
|--------|---------|
| `getRabbiName(rabbiId)` | Converts rabbi ID to full name for display |
| `exportToExcel()` | Exports filtered data to Excel file using XLSX library |

#### `exportToExcel()` - Detailed
```typescript
exportToExcel(): void {
  // Map filtered data to Hebrew column names
  const dataToExport = this.filteredTalmideiHahamim.map(rabbi => ({
    'ID': rabbi.RabbiID,
    'שם': rabbi.FullName,
    'ידוע בשם': rabbi.knownAs,
    // ... more fields
  }));

  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(dataToExport);
  ws['!cols'] = [ /* column widths */ ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'תלמידי חכמים');

  // Generate filename with date and save
  const filename = `תלמידי_חכמים_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}
```

---

## Template & Method Mapping

### File: `src/app/app.component.html` (386 lines)

The template is divided into 4 main sections:

### 1. Header & Search Bar (Lines 1-28)

```
┌────────────────────────────────────────┐
│         {{ title }}                     │  ← Property binding
├────────────────────────────────────────┤
│   [Search Input] → onSearchChange()    │  ← Two-way binding + event
└────────────────────────────────────────┘
```

| Template Syntax | Method/Property | Purpose |
|----------------|-----------------|---------|
| `{{ title }}` | `title` property | Displays app title |
| `{{ error }}` | `error` property | Shows error messages |
| `[(ngModel)]="searchText"` | `searchText` property | Two-way binding for search |
| `(ngModelChange)="onSearchChange()"` | `onSearchChange()` | Triggers `applyFilters()` on typing |

---

### 2. Left Panel (Lines 32-85)

```
┌─────────────────────────┐
│ פרטים נוספים (PN Panel) │  ← *ngIf="selectedRabbi"
│  {{ selectedRabbi.X }}  │
├─────────────────────────┤
│ [+ הוסף] [✏️ ערוך]      │  ← CRUD buttons
│ [💾 שמור] [✖️ בטל]      │
├─────────────────────────┤
│ [Rabbi Image]           │
├─────────────────────────┤
│ Talmidim (Ksharim)      │  ← *ngFor + filter
├─────────────────────────┤
│ Sforim Table            │  ← getFilteredSforim()
└─────────────────────────┘
```

| Template Syntax | Method | Purpose |
|----------------|--------|---------|
| `*ngIf="selectedRabbi"` | `selectedRabbi` | Only show if rabbi selected |
| `(click)="startAddingNew()"` | `startAddingNew()` | Enable add mode |
| `(click)="startEditing(selectedRabbi)"` | `startEditing()` | Enable edit mode |
| `(click)="saveEdit()"` | `saveEdit()` | Save changes to DB |
| `(click)="cancelEdit()"` | `cancelEdit()` | Cancel editing |
| `*ngIf="editingRabbiId"` | `editingRabbiId` | Show save/cancel only when editing |
| `*ngFor="let talmid of filteredTalmidim"` | `filteredTalmidim` | Loop through relationships |
| `talmid.RabbiId == selectedRabbi.RabbiID` | Filter in template | Show only current rabbi's talmidim |
| `(click)="selectRabbiById(talmid.Rabbi2Id)"` | `selectRabbiById()` | Navigate to related rabbi |
| `getFilteredSforim()` | `getFilteredSforim()` | Returns sforim for selected rabbi |

---

### 3. Dropdown Filters (Lines 100-168)

```
┌───────────┬───────────┬───────────┐
│  Period ▼ │ Country ▼ │  City ▼   │  ← Filter dropdowns
└───────────┴───────────┴───────────┘
```

| Template Syntax | Method | Purpose |
|----------------|--------|---------|
| `(click)="toggleDropdown('city')"` | `toggleDropdown()` | Open/close dropdown |
| `*ngIf="showCityDropdown"` | `showCityDropdown` | Control dropdown visibility |
| `{{ selectedCities.length }}` | `selectedCities` | Show count of selected |
| `*ngFor="let city of getFilteredCities()"` | `getFilteredCities()` | Get cities filtered by country |
| `(click)="toggleCity(city)"` | `toggleCity()` | Add/remove from selection |
| `[checked]="isSelected('city', city)"` | `isSelected()` | Check if item is selected |
| `(click)="clearAllFilters('city')"` | `clearAllFilters()` | Reset filter |

---

### 4. Main Data Table (Lines 169-323)

```
┌─────────────────────────────────────────────────────────────┐
│  Header Row: שם | ידוע בשם | עיר | מדינה | תקופה | לידה ... │ ← (click)="sortBy()"
├─────────────────────────────────────────────────────────────┤
│  Search Row: [input] [input] [input] ...                     │ ← columnFilters + applyFilters()
├─────────────────────────────────────────────────────────────┤
│  Add New Row (if isAddingNew)                                │ ← newRabbi bindings
├─────────────────────────────────────────────────────────────┤
│  Data Rows: *ngFor="let rabbi of filteredTalmideiHahamim"   │
│    - Edit mode: isEditing(rabbi)? → editingRabbi bindings   │
│    - View mode: → selectRabbi(rabbi) on click               │
└─────────────────────────────────────────────────────────────┘
```

| Template Syntax | Method | Purpose |
|----------------|--------|---------|
| `(click)="sortBy('FullName')"` | `sortBy()` | Sort table by column |
| `{{ sortDirection === 'asc' ? '▲' : '▼' }}` | `sortDirection` | Show sort indicator |
| `[(ngModel)]="columnFilters['FullName']"` | `columnFilters` | Column search input |
| `(ngModelChange)="applyFilters()"` | `applyFilters()` | Filter on every keystroke |
| `*ngFor="let rabbi of filteredTalmideiHahamim"` | `filteredTalmideiHahamim` | Display filtered data |
| `[class.bg-blue-100]="selectedRabbi?.RabbiID === rabbi.RabbiID"` | `selectedRabbi` | Highlight selected row |
| `[class.bg-yellow-50]="isEditing(rabbi)"` | `isEditing()` | Highlight editing row |
| `*ngIf="isEditing(rabbi)"` | `isEditing()` | Show input fields for edit |
| `[(ngModel)]="editingRabbi.FullName"` | `editingRabbi` | Bind edit values |
| `*ngIf="!isEditing(rabbi)"` | `isEditing()` | Show read-only cells |
| `(click)="selectRabbi(rabbi)"` | `selectRabbi()` | Select row on click |

---

## Data Flow

### Overall Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER INTERACTIONS                            │
├────────────────────────┬────────────────────┬────────────────────┤
│    Filter Actions      │   Selection        │    CRUD Actions    │
├────────────────────────┼────────────────────┼────────────────────┤
│ toggleDropdown()       │ selectRabbi()      │ startAddingNew()   │
│ toggleCity/Country/    │ selectRabbiById()  │ saveNewRabbi()     │
│   Period()             │                    │ cancelAddNew()     │
│ clearAllFilters()      │                    │ startEditing()     │
│ onSearchChange()       │                    │ saveEdit()         │
│ columnFilters input    │                    │ cancelEdit()       │
│         ↓              │         ↓          │         ↓          │
│    applyFilters()      │  selectedRabbi     │  API call →        │
│         ↓              │  updates left      │  loadTalmideiHahamim()
│ filteredTalmideiHahamim│  panel display     │  refresh table     │
│ table re-renders       │                    │                    │
└────────────────────────┴────────────────────┴────────────────────┘
```

### Filter Flow Detail

```
User types in column filter
         │
         ▼
[(ngModel)]="columnFilters['FullName']"  ──▶  columnFilters object updated
         │
         ▼
(ngModelChange)="applyFilters()"  ──▶  applyFilters() called
         │
         ▼
Filter logic runs on talmideiHahamim[]
         │
         ▼
filteredTalmideiHahamim[] updated
         │
         ▼
*ngFor re-renders table rows
```

### Selection Flow Detail

```
User clicks table row
         │
         ▼
(click)="selectRabbi(rabbi)"
         │
         ▼
selectedRabbi = rabbi
         │
         ├──▶ Left panel shows rabbi details (*ngIf="selectedRabbi")
         ├──▶ Talmidim filtered (talmid.RabbiId == selectedRabbi.RabbiID)
         ├──▶ Sforim filtered (getFilteredSforim())
         └──▶ Row highlighted ([class.bg-blue-100])
```

---

## Key Angular Patterns Used

1. **Two-way binding** `[(ngModel)]` - for search and edit inputs
2. **Event binding** `(click)`, `(ngModelChange)` - trigger methods
3. **Property binding** `[checked]`, `[class.X]`, `[src]` - dynamic attributes
4. **Structural directives** `*ngIf`, `*ngFor` - conditional/loop rendering
5. **Template expressions** `{{ }}` - display data
6. **Safe navigation** `selectedRabbi?.RabbiID` - prevent null errors

---

## Future Considerations

### Pagination (Planned)
Currently loading all records (limit: 1000). For scaling to thousands of records:
- Add page controls to UI
- Modify API to accept `page` and `pageSize` parameters
- Load data in chunks

### Component Splitting (When Needed)
Currently a single component (~641 lines). Consider splitting when it exceeds ~1000 lines:
- `TalmidimTableComponent` - for the left panel talmidim subtable
- `SforimTableComponent` - for the left panel sforim subtable
- `RabbiFormComponent` - for add/edit forms
- `FilterDropdownComponent` - reusable filter dropdowns

---

*Document generated: December 25, 2025*
