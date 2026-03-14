import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { DatabaseService, TableInfo, ApiResponse } from '../database.service';
import { TalmidHahamDetailsComponent } from '../talmid-haham-details/talmid-haham-details.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-talmidei-hahamim',
  standalone: true,
  imports: [CommonModule, FormsModule, TalmidHahamDetailsComponent],
  templateUrl: './talmidei-hahamim.component.html',
  styleUrls: ['./talmidei-hahamim.component.css']
})
export class TalmideiHahamimComponent implements OnInit {
  connectionStatus: string = 'Not tested';
  tables: TableInfo[] = [];
  talmideiHahamim: any[] = [];
  filteredTalmideiHahamim: any[] = [];
  selectedRabbi: any = null;

  isLoading = false;
  error: string | null = null;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Current view
  currentView: 'rabbis' | 'talmidim' = 'rabbis';
  
  // Talmidim data
  talmidim: any[] = [];
  filteredTalmidim: any[] = [];
  
  // Sforim data
  sforim: any[] = [];
  
  // Filter options
  cities: string[] = [];
  countries: string[] = [];
  periods: string[] = [];
  
  // Active filters
  selectedCities: string[] = [];
  selectedCountries: string[] = [];
  selectedPeriods: string[] = [];
  searchText: string = '';
  
  // Column search filters
  columnFilters: {[key: string]: string} = {
    FullName: '',
    knownAs: '',
    City: '',
    Country: '',
    Period: '',
    HebDob: '',
    YearOfBirth: '',
    HebDoP: '',
    YearOfDeath: '',
    RabbiID: ''
  };
  
  // Dropdown states
  showCityDropdown: boolean = false;
  showCountryDropdown: boolean = false;
  showPeriodDropdown: boolean = false;

  // New rabbi form
  isAddingNew: boolean = false;
  newRabbi: any = {};
  
  // Edit existing rabbi
  editingRabbiId: number | null = null;
  editingRabbi: any = {};
  
  // Talmidim management
  isAddingNewTalmid: boolean = false;
  newTalmid: any = {};
  editingTalmidId: number | null = null;
  editingTalmid: any = {};

  // Details panel
  showDetailsPanel: boolean = false;

  constructor(
    private databaseService: DatabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only run in browser, not on server
    if (isPlatformBrowser(this.platformId)) {
      this.loadTalmideiHahamim();
      this.loadTalmidim();
      this.loadSforim();
    }
  }

  testConnection() {
    this.isLoading = true;
    this.error = null;
    
    this.databaseService.testConnection().subscribe({
      next: (response: ApiResponse) => {
        if (response.success) {
          this.connectionStatus = 'Connected successfully';
          this.loadTables();
          this.loadTalmideiHahamim();
        } else {
          this.connectionStatus = 'Connection failed';
          this.error = response.message || 'Unknown error';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.connectionStatus = 'Connection failed';
        this.error = `API Error: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadTables() {
    this.databaseService.getTables().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tables = response.data.tables;
        }
      },
      error: (error) => {
        this.error = `Failed to load tables: ${error.message}`;
      }
    });
  }

  loadTalmideiHahamim() {
    console.log('Loading Talmidei Hahamim data...');
    this.databaseService.getTableData('Talmidei_Hahamim', 1000).subscribe({
      next: (response) => {
        console.log('Received response:', response);
        console.log('response.data:', response.data);
        if (response.success && response.data) {
          this.talmideiHahamim = Array.isArray(response.data) ? response.data : response.data.data;
          this.filteredTalmideiHahamim = [...this.talmideiHahamim];
          console.log('Loaded rabbis:', this.talmideiHahamim);
          
          // Extract unique values for filters
          this.extractFilterOptions();
        }
      },
      error: (error) => {
        console.error('Error loading Talmidei Hahamim:', error);
        this.error = `Failed to load Talmidei Hahamim: ${error.message}`;
      }
    });
  }

  extractFilterOptions() {
    this.cities = [...new Set(this.talmideiHahamim.map(r => r.City).filter(v => v))].sort();
    this.countries = [...new Set(this.talmideiHahamim.map(r => r.Country).filter(v => v))].sort();
    this.periods = [...new Set(this.talmideiHahamim.map(r => r.Period).filter(v => v))].sort();
  }

  loadTalmidim() {
    console.log('Loading Talmidim relationships...');
    this.databaseService.getTalmidim().subscribe({
      next: (response) => {
        console.log('Received talmidim response:', response);
        if (response.success && response.data) {
          this.talmidim = Array.isArray(response.data) ? response.data : [];
          this.filteredTalmidim = [...this.talmidim];
          console.log('Loaded talmidim:', this.talmidim.length, 'records');
        } else {
          console.log('No talmidim data in response');
        }
      },
      error: (error) => {
        console.error('Error loading Talmidim:', error);
      }
    });
  }

  loadSforim() {
    console.log('Loading Sforim...');
    this.databaseService.getSforim().subscribe({
      next: (response) => {
        console.log('Received sforim response:', response);
        if (response.success && response.data) {
          this.sforim = Array.isArray(response.data) ? response.data : [];
          console.log('Loaded sforim:', this.sforim.length, 'records');
        } else {
          console.log('No sforim data in response');
        }
      },
      error: (error) => {
        console.error('Error loading Sforim:', error);
      }
    });
  }

  getFilteredSforim(): any[] {
    if (!this.selectedRabbi) return [];
    return this.sforim.filter(s => s.RabbiID == this.selectedRabbi.RabbiID);
  }

  getFilteredCities(): string[] {
    if (this.selectedCountries.length === 0) {
      return this.cities;
    }
    
    const filteredCities = [...new Set(
      this.talmideiHahamim
        .filter(r => this.selectedCountries.includes(r.Country))
        .map(r => r.City)
        .filter(c => c)
    )];
    
    return filteredCities.sort();
  }

  getFilteredCountries(): string[] {
    if (this.selectedCities.length === 0) {
      return this.countries;
    }
    
    const filteredCountries = [...new Set(
      this.talmideiHahamim
        .filter(r => this.selectedCities.includes(r.City))
        .map(r => r.Country)
        .filter(c => c)
    )];
    
    return filteredCountries.sort();
  }

  toggleDropdown(dropdown: 'city' | 'country' | 'period') {
    if (dropdown === 'city') {
      this.showCityDropdown = !this.showCityDropdown;
      if (!this.showCityDropdown) {
        this.applyFilters();
      }
    } else if (dropdown === 'country') {
      this.showCountryDropdown = !this.showCountryDropdown;
      if (!this.showCountryDropdown) {
        this.applyFilters();
      }
    } else if (dropdown === 'period') {
      this.showPeriodDropdown = !this.showPeriodDropdown;
      if (!this.showPeriodDropdown) {
        this.applyFilters();
      }
    }
  }

  toggleCity(city: string) {
    const index = this.selectedCities.indexOf(city);
    if (index > -1) {
      this.selectedCities.splice(index, 1);
    } else {
      this.selectedCities.push(city);
    }
    this.applyFilters();
  }

  toggleCountry(country: string) {
    const index = this.selectedCountries.indexOf(country);
    if (index > -1) {
      this.selectedCountries.splice(index, 1);
    } else {
      this.selectedCountries.push(country);
    }
    this.applyFilters();
  }

  togglePeriod(period: string) {
    const index = this.selectedPeriods.indexOf(period);
    if (index > -1) {
      this.selectedPeriods.splice(index, 1);
    } else {
      this.selectedPeriods.push(period);
    }
    this.applyFilters();
  }

  clearAllFilters(type: 'city' | 'country' | 'period') {
    if (type === 'city') {
      this.selectedCities = [];
      this.showCityDropdown = false;
    } else if (type === 'country') {
      this.selectedCountries = [];
      this.showCountryDropdown = false;
    } else if (type === 'period') {
      this.selectedPeriods = [];
      this.showPeriodDropdown = false;
    }
    this.applyFilters();
  }

  isSelected(type: 'city' | 'country' | 'period', value: string): boolean {
    if (type === 'city') return this.selectedCities.includes(value);
    if (type === 'country') return this.selectedCountries.includes(value);
    if (type === 'period') return this.selectedPeriods.includes(value);
    return false;
  }

  applyFilters() {
    console.log('Applying filters:', {
      cities: this.selectedCities,
      countries: this.selectedCountries,
      periods: this.selectedPeriods,
      searchText: this.searchText,
      columnFilters: this.columnFilters
    });
    
    this.filteredTalmideiHahamim = this.talmideiHahamim.filter(rabbi => {
      const cityMatch = this.selectedCities.length === 0 || this.selectedCities.includes(rabbi.City);
      const countryMatch = this.selectedCountries.length === 0 || this.selectedCountries.includes(rabbi.Country);
      const periodMatch = this.selectedPeriods.length === 0 || this.selectedPeriods.includes(rabbi.Period);
      
      const searchMatch = !this.searchText || 
        (rabbi.FullName && rabbi.FullName.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (rabbi.knownAs && rabbi.knownAs.toLowerCase().includes(this.searchText.toLowerCase()));
      
      const columnMatch = Object.keys(this.columnFilters).every(col => {
        const filterValue = this.columnFilters[col];
        if (!filterValue) return true;
        
        const rabbiValue = rabbi[col];
        if (rabbiValue === null || rabbiValue === undefined) return false;
        
        if (['YearOfBirth', 'YearOfDeath', 'HebDob', 'HebDoP', 'RabbiID'].includes(col)) {
          return String(rabbiValue).startsWith(filterValue);
        }
        
        return String(rabbiValue).toLowerCase().includes(filterValue.toLowerCase());
      });
      
      return cityMatch && countryMatch && periodMatch && searchMatch && columnMatch;
    });
    
    console.log('Filtered results:', this.filteredTalmideiHahamim.length, 'out of', this.talmideiHahamim.length);
  }

  onSearchChange() {
    this.applyFilters();
  }

  selectRabbi(rabbi: any) {
    this.selectedRabbi = rabbi;
  }

  selectRabbiById(rabbiId: number) {
    const rabbi = this.talmideiHahamim.find(r => r.RabbiID === rabbiId);
    if (rabbi) {
      const rabbiIndex = this.filteredTalmideiHahamim.findIndex(r => r.RabbiID === rabbiId);
      if (rabbiIndex === -1) {
        this.selectedCities = [];
        this.selectedCountries = [];
        this.selectedPeriods = [];
        this.searchText = '';
        this.applyFilters();
      }
      
      this.filteredTalmideiHahamim = this.filteredTalmideiHahamim.filter(r => r.RabbiID !== rabbiId);
      this.filteredTalmideiHahamim.unshift(rabbi);
      
      this.selectRabbi(rabbi);
    }
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredTalmideiHahamim.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  startAddingNew() {
    this.isAddingNew = true;
    this.newRabbi = {
      FullName: '',
      knownAs: '',
      City: '',
      Country: '',
      Period: '',
      YearOfBirth: null,
      YearOfDeath: null,
      PlaceOfBirth: '',
      PlaceOfPtira: '',
      KnownFor: '',
      Notes: '',
      Sources: '',
      ImageUrl: '',
      URL: '',
      HebDob: null,
      HebDoP: null,
      Approx: false,
      HebCharDob: '',
      HebCharDoP: ''
    };
  }

  cancelAddNew() {
    this.isAddingNew = false;
    this.newRabbi = {};
  }

  saveNewRabbi() {
    if (!this.newRabbi.FullName) {
      alert('אנא מלא לפחות שם מלא');
      return;
    }

    this.databaseService.createRabbi(this.newRabbi).subscribe({
      next: (response) => {
        if (response.success) {
          this.isAddingNew = false;
          this.newRabbi = {};
          this.loadTalmideiHahamim();
        } else {
          alert('שגיאה בהוספה: ' + response.message);
        }
      },
      error: (error) => {
        alert('שגיאה בהוספה: ' + error.message);
      }
    });
  }

  startEditing(rabbi: any) {
    this.editingRabbiId = rabbi.RabbiID;
    this.editingRabbi = { ...rabbi };
  }

  cancelEdit() {
    this.editingRabbiId = null;
    this.editingRabbi = {};
  }

  saveEdit() {
    if (!this.editingRabbi.FullName) {
      alert('אנא מלא לפחות שם מלא');
      return;
    }

    const { RabbiID, ...rabbiData } = this.editingRabbi;

    this.databaseService.updateRabbi(this.editingRabbiId!, rabbiData).subscribe({
      next: (response) => {
        if (response.success) {
          this.editingRabbiId = null;
          this.editingRabbi = {};
          this.loadTalmideiHahamim();
        } else {
          alert('שגיאה בעדכון: ' + response.message);
        }
      },
      error: (error) => {
        alert('שגיאה בעדכון: ' + error.message);
      }
    });
  }

  isEditing(rabbi: any): boolean {
    return this.editingRabbiId === rabbi.RabbiID;
  }

  switchView(view: 'rabbis' | 'talmidim') {
    this.currentView = view;
    if (view === 'talmidim' && this.talmidim.length === 0) {
      this.loadTalmidim();
    }
  }

  startAddingNewTalmid() {
    this.isAddingNewTalmid = true;
    this.newTalmid = {
      RabbiID: null,
      TeacherID: null,
      FromYear: null,
      ToYear: null,
      Place: '',
      Notes: ''
    };
  }

  cancelAddNewTalmid() {
    this.isAddingNewTalmid = false;
    this.newTalmid = {};
  }

  saveNewTalmid() {
    if (!this.newTalmid.RabbiID || !this.newTalmid.TeacherID) {
      alert('אנא בחר תלמיד ומורה');
      return;
    }

    this.databaseService.createTalmid(this.newTalmid).subscribe({
      next: (response) => {
        if (response.success) {
          alert('קשר תלמיד-מורה נוסף בהצלחה!');
          this.isAddingNewTalmid = false;
          this.newTalmid = {};
          this.loadTalmidim();
        } else {
          alert('שגיאה בהוספה: ' + response.message);
        }
      },
      error: (error) => {
        alert('שגיאה בהוספה: ' + error.message);
      }
    });
  }

  startEditingTalmid(talmid: any) {
    this.editingTalmidId = talmid.ID;
    this.editingTalmid = { ...talmid };
  }

  cancelEditTalmid() {
    this.editingTalmidId = null;
    this.editingTalmid = {};
  }

  saveEditTalmid() {
    if (!this.editingTalmid.RabbiID || !this.editingTalmid.TeacherID) {
      alert('אנא בחר תלמיד ומורה');
      return;
    }

    this.databaseService.updateTalmid(this.editingTalmidId!, this.editingTalmid).subscribe({
      next: (response) => {
        if (response.success) {
          alert('קשר תלמיד-מורה עודכן בהצלחה!');
          this.editingTalmidId = null;
          this.editingTalmid = {};
          this.loadTalmidim();
        } else {
          alert('שגיאה בעדכון: ' + response.message);
        }
      },
      error: (error) => {
        alert('שגיאה בעדכון: ' + error.message);
      }
    });
  }

  isEditingTalmid(talmid: any): boolean {
    return this.editingTalmidId === talmid.ID;
  }

  getRabbiName(rabbiId: number): string {
    const rabbi = this.talmideiHahamim.find(r => r.RabbiID === rabbiId);
    return rabbi ? rabbi.FullName : `ID: ${rabbiId}`;
  }

  exportToExcel(): void {
    const dataToExport = this.filteredTalmideiHahamim.map(rabbi => ({
      'ID': rabbi.RabbiID,
      'שם': rabbi.FullName,
      'ידוע בשם': rabbi.knownAs,
      'עיר': rabbi.City,
      'מדינה': rabbi.Country,
      'תקופה': rabbi.Period,
      'פטירה': rabbi.YearOfDeath,
      'פטירה עברי': rabbi.HebDoP,
      'לידה': rabbi.YearOfBirth,
      'לידה עברי': rabbi.HebDob,
      'תקופה משוערת': rabbi.Approx == 1 ? '*' : ''
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    
    ws['!cols'] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 }
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'תלמידי חכמים');

    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const filename = `תלמידי_חכמים_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }

  openDetailsPanel() {
    if (this.selectedRabbi) {
      this.showDetailsPanel = true;
    }
  }

  closeDetailsPanel() {
    this.showDetailsPanel = false;
  }

  onDetailsSelectRabbi(rabbiId: number) {
    this.selectRabbiById(rabbiId);
  }
}
