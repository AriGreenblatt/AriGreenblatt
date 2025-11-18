import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { DatabaseService, TableInfo, ApiResponse } from './database.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
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
  isLoading = false;
  error: string | null = null;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filter options
  cities: string[] = [];
  countries: string[] = [];
  periods: string[] = [];
  
  // Active filters
  selectedCities: string[] = [];
  selectedCountries: string[] = [];
  selectedPeriods: string[] = [];
  
  // Dropdown states
  showCityDropdown: boolean = false;
  showCountryDropdown: boolean = false;
  showPeriodDropdown: boolean = false;

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

  toggleDropdown(dropdown: 'city' | 'country' | 'period') {
    if (dropdown === 'city') {
      this.showCityDropdown = !this.showCityDropdown;
    } else if (dropdown === 'country') {
      this.showCountryDropdown = !this.showCountryDropdown;
    } else if (dropdown === 'period') {
      this.showPeriodDropdown = !this.showPeriodDropdown;
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
    } else if (type === 'country') {
      this.selectedCountries = [];
    } else if (type === 'period') {
      this.selectedPeriods = [];
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
    this.filteredTalmideiHahamim = this.talmideiHahamim.filter(rabbi => {
      const cityMatch = this.selectedCities.length === 0 || this.selectedCities.includes(rabbi.City);
      const countryMatch = this.selectedCountries.length === 0 || this.selectedCountries.includes(rabbi.Country);
      const periodMatch = this.selectedPeriods.length === 0 || this.selectedPeriods.includes(rabbi.Period);
      return cityMatch && countryMatch && periodMatch;
    });
  }

  selectRabbi(rabbi: any) {
    this.selectedRabbi = rabbi;
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
}
