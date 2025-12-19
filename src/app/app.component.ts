import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { DatabaseService, TableInfo, ApiResponse } from './database.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'תולדות חכמינו זכרונם לברכה';
  connectionStatus: string = 'Not tested';
  tables: TableInfo[] = [];
  talmideiHahamim: any[] = [];
  filteredTalmideiHahamim: any[] = [];
  selectedRabbi: any = null;
  rabbiStudents: any[] = [];
  rabbiTeachers: any[] = [];
  isLoading = false;
  error: string | null = null;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Current view
  currentView: 'rabbis' | 'talmidim' = 'rabbis';
  
  // Talmidim data
  talmidim: any[] = [];
  filteredTalmidim: any[] = [];
  
  // Filter options
  cities: string[] = [];
  countries: string[] = [];
  periods: string[] = [];
  
  // Active filters
  selectedCities: string[] = [];
  selectedCountries: string[] = [];
  selectedPeriods: string[] = [];
  searchText: string = '';
  
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

  constructor(
    private databaseService: DatabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only run in browser, not on server
    if (isPlatformBrowser(this.platformId)) {
      this.loadTalmideiHahamim();
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
    this.databaseService.getTableData('Talmidei_Hahamim').subscribe({
      next: (response) => {
        console.log('Received response:', response);
        console.log('response.data:', response.data);
        if (response.success && response.data) {
          // The data is directly in response.data, not response.data.data
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
    // Get unique cities, countries, and periods
    this.cities = [...new Set(this.talmideiHahamim.map(r => r.City).filter(v => v))].sort();
    this.countries = [...new Set(this.talmideiHahamim.map(r => r.Country).filter(v => v))].sort();
    this.periods = [...new Set(this.talmideiHahamim.map(r => r.Period).filter(v => v))].sort();
  }

  getFilteredCities(): string[] {
    // If no countries selected, show all cities
    if (this.selectedCountries.length === 0) {
      return this.cities;
    }
    
    // Filter cities based on selected countries
    const filteredCities = [...new Set(
      this.talmideiHahamim
        .filter(r => this.selectedCountries.includes(r.Country))
        .map(r => r.City)
        .filter(c => c)
    )];
    
    return filteredCities.sort();
  }

  getFilteredCountries(): string[] {
    // If no cities selected, show all countries
    if (this.selectedCities.length === 0) {
      return this.countries;
    }
    
    // Filter countries based on selected cities
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
      searchText: this.searchText
    });
    
    this.filteredTalmideiHahamim = this.talmideiHahamim.filter(rabbi => {
      const cityMatch = this.selectedCities.length === 0 || this.selectedCities.includes(rabbi.City);
      const countryMatch = this.selectedCountries.length === 0 || this.selectedCountries.includes(rabbi.Country);
      const periodMatch = this.selectedPeriods.length === 0 || this.selectedPeriods.includes(rabbi.Period);
      
      // Search in FullName or HebrewName
      const searchMatch = !this.searchText || 
        (rabbi.FullName && rabbi.FullName.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (rabbi.KnownAS && rabbi.KnownAS.includes(this.searchText));
      
      return cityMatch && countryMatch && periodMatch && searchMatch;
    });
    
    console.log('Filtered results:', this.filteredTalmideiHahamim.length, 'out of', this.talmideiHahamim.length);
  }

  onSearchChange() {
    this.applyFilters();
  }

  selectRabbi(rabbi: any) {
    this.selectedRabbi = rabbi;
    this.loadRabbiStudents(rabbi.RabbiID);
    this.loadRabbiTeachers(rabbi.RabbiID);
  }

  selectRabbiById(rabbiId: number) {
    const rabbi = this.talmideiHahamim.find(r => r.RabbiID === rabbiId);
    if (rabbi) {
      // Check if rabbi is in filtered list
      const rabbiIndex = this.filteredTalmideiHahamim.findIndex(r => r.RabbiID === rabbiId);
      if (rabbiIndex === -1) {
        // Rabbi is not in filtered list, clear filters to show all
        this.selectedCities = [];
        this.selectedCountries = [];
        this.selectedPeriods = [];
        this.searchText = '';
        this.applyFilters();
      }
      
      // Move the selected rabbi to the top of the filtered list
      this.filteredTalmideiHahamim = this.filteredTalmideiHahamim.filter(r => r.RabbiID !== rabbiId);
      this.filteredTalmideiHahamim.unshift(rabbi);
      
      // Select the rabbi
      this.selectRabbi(rabbi);
    }
  }

  loadRabbiStudents(rabbiId: number) {
    this.rabbiStudents = [];
    this.databaseService.getRabbiStudents(rabbiId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.rabbiStudents = response.data;
          console.log('Loaded students:', this.rabbiStudents);
        }
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.rabbiStudents = [];
      }
    });
  }

  loadRabbiTeachers(rabbiId: number) {
    this.rabbiTeachers = [];
    this.databaseService.getRabbiTeachers(rabbiId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.rabbiTeachers = response.data;
          console.log('Loaded teachers:', this.rabbiTeachers);
        }
      },
      error: (error) => {
        console.error('Error loading teachers:', error);
        this.rabbiTeachers = [];
      }
    });
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

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Convert to string for comparison
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
      HebrewName: '',
      knownAs: '',
      City: '',
      Country: '',
      Period: '',
      YearOfBirth: null,
      YearOfDeath: null,
      YoBHebrew: '',
      YoPHebrew: '',
      PlaceOfBirth: '',
      PlaceOfPtira: '',
      KnownFor: '',
      Notes: '',
      Sources: '',
      ImageUrl: '',
      URL: '',
      HebDob: null,
      HebDoP: null,
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
          this.loadTalmideiHahamim(); // Reload the list
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
    this.editingRabbi = { ...rabbi }; // Create a copy
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

    // Create a copy without RabbiID since it's a primary key and shouldn't be updated
    const { RabbiID, ...rabbiData } = this.editingRabbi;

    this.databaseService.updateRabbi(this.editingRabbiId!, rabbiData).subscribe({
      next: (response) => {
        if (response.success) {
          this.editingRabbiId = null;
          this.editingRabbi = {};
          this.loadTalmideiHahamim(); // Reload the list
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

  // View switching
  switchView(view: 'rabbis' | 'talmidim') {
    this.currentView = view;
    if (view === 'talmidim' && this.talmidim.length === 0) {
      this.loadTalmidim();
    }
  }

  // Load Talmidim data
  loadTalmidim() {
    this.databaseService.getTableData('Talmidim').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.talmidim = Array.isArray(response.data) ? response.data : response.data.data;
          this.filteredTalmidim = [...this.talmidim];
          console.log('Loaded talmidim:', this.talmidim);
        }
      },
      error: (error) => {
        console.error('Error loading Talmidim:', error);
        this.error = `Failed to load Talmidim: ${error.message}`;
      }
    });
  }

  // Talmidim CRUD operations
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
}
