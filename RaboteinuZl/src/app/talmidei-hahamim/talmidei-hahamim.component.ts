import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { DatabaseService, TableInfo, ApiResponse, RelationshipInfo } from '../services/database.service';
import { TalmidHahamDetailsComponent } from '../talmid-haham-details/talmid-haham-details.component';
import { TalmidimTableComponent } from '../talmidim-table/talmidim-table.component';

@Component({
  selector: 'app-talmidei-hahamim',
  standalone: true,
  imports: [CommonModule, FormsModule, TalmidHahamDetailsComponent, TalmidimTableComponent],
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
  
  currentView: 'rabbis' | 'talmidim' = 'rabbis';
  talmidim: any[] = [];
  filteredTalmidim: any[] = [];
  sforim: any[] = [];
  filteredSforim: any[] = [];
  associations: any[] = [];

  relationships: RelationshipInfo[] = [];
  relationshipNameByCode: Record<number, string> = {};
  
  cities: string[] = [];
  countries: string[] = [];
  periods: string[] = [];
  
  selectedCities: string[] = [];
  selectedCountries: string[] = [];
  selectedPeriods: string[] = [];
  searchText: string = '';
  
  columnFilters: {[key: string]: string} = {
    FullName: '', knownAs: '', City: '', Country: '', Period: '',
    HebDob: '', YearOfBirth: '', HebDoP: '', YearOfDeath: '', ID: ''
  };
  
  showCityDropdown: boolean = false;
  showCountryDropdown: boolean = false;
  showPeriodDropdown: boolean = false;

  isAddingNew: boolean = false;
  newRabbi: any = {};
  editingRabbiId: number | null = null;
  editingRabbi: any = {};
  
  isAddingNewTalmid: boolean = false;
  newTalmid: any = {};
  editingTalmidId: number | null = null;
  editingTalmid: any = {};

  showDetailsPanel: boolean = false;

  constructor(
    private databaseService: DatabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadTalmideiHahamim();
      this.loadTalmidim();
      this.loadSforim();
      this.loadAssociations();
      this.loadRelationships();
    }
  }

  loadRelationships() {
    this.databaseService.getRelationships(1000).subscribe({
      next: (response: ApiResponse<{ data: RelationshipInfo[]; count: number }>) => {
        if (response.success && response.data) {
          const payload: any = response.data as any;
          this.relationships = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.data) ? payload.data : []);
          console.log('Loaded relationships:', this.relationships.length);
          this.relationshipNameByCode = this.relationships.reduce((acc, rel) => {
            if (rel && typeof rel.RelationshipCode === 'number') {
              const name = rel.HebRelationshipName || rel.RelationshipName || '';
              acc[rel.RelationshipCode] = name;
            }
            return acc;
          }, {} as Record<number, string>);
          console.log('Relationship name mapping:', this.relationshipNameByCode);
        }
      },
      error: (error: any) => { console.error('Error loading Relationships:', error); }
    });
  }

  loadTalmideiHahamim() {
    this.databaseService.getTableData('Talmidei_Hahamim', 1000).subscribe({
      next: (response: ApiResponse<{ data: any[]; count: number }>) => {
        if (response.success && response.data) {
          this.talmideiHahamim = Array.isArray(response.data) ? response.data : response.data.data;
          this.filteredTalmideiHahamim = [...this.talmideiHahamim];
          this.extractFilterOptions();
        }
      },
      error: (error: any) => { this.error = `Failed to load: ${error.message}`; }
    });
  }

  extractFilterOptions() {
    this.cities = [...new Set(this.talmideiHahamim.map(r => r.City).filter(v => v))].sort();
    this.countries = [...new Set(this.talmideiHahamim.map(r => r.Country).filter(v => v))].sort();
    this.periods = [...new Set(this.talmideiHahamim.map(r => r.Period).filter(v => v))].sort();
  }

  loadTalmidim() {
    this.databaseService.getTalmidim().subscribe({
      next: (response: ApiResponse<{ data: any[]; count: number }>) => {
        if (response.success && response.data) {
          const payload: any = response.data as any;
          this.talmidim = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.data) ? payload.data : []);
          this.filteredTalmidim = [...this.talmidim];
        }
      },
      error: (error: any) => { console.error('Error loading Talmidim:', error); }
    });
  }

  loadSforim() {
    this.databaseService.getSforim().subscribe({
      next: (response: ApiResponse<{ data: any[]; count: number }>) => {
        if (response.success && response.data) {
          const payload: any = response.data as any;
          this.sforim = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.data) ? payload.data : []);
          this.refreshFilteredSforim();
        }
      },
      error: (error: any) => { console.error('Error loading Sforim:', error); }
    });
  }

  loadAssociations() {
    this.databaseService.getTableData('AssociatedWith', 5000).subscribe({
      next: (response: ApiResponse<{ data: any[]; count: number }>) => {
        if (response.success && response.data) {
          this.associations = Array.isArray(response.data) ? response.data : response.data.data;
        }
      },
      error: (error: any) => { console.error('Error loading Associations:', error); }
    });
  }

  private refreshFilteredSforim() {
    if (!this.selectedRabbi) {
      this.filteredSforim = [];
      return;
    }
    console.log('Filtering Sforim for rabbi ID:', this.selectedRabbi.ID, 'Total sforim:', this.sforim.length);
    this.filteredSforim = this.sforim.filter(s => s.RabbiID == this.selectedRabbi.ID);
    console.log('Filtered sforim count:', this.filteredSforim.length);
  }

  getFilteredCities(): string[] {
    if (this.selectedCountries.length === 0) return this.cities;
    return [...new Set(this.talmideiHahamim.filter(r => this.selectedCountries.includes(r.Country)).map(r => r.City).filter(c => c))].sort();
  }

  getFilteredCountries(): string[] {
    if (this.selectedCities.length === 0) return this.countries;
    return [...new Set(this.talmideiHahamim.filter(r => this.selectedCities.includes(r.City)).map(r => r.Country).filter(c => c))].sort();
  }

  toggleDropdown(dropdown: 'city' | 'country' | 'period') {
    if (dropdown === 'city') { this.showCityDropdown = !this.showCityDropdown; }
    else if (dropdown === 'country') { this.showCountryDropdown = !this.showCountryDropdown; }
    else if (dropdown === 'period') { this.showPeriodDropdown = !this.showPeriodDropdown; }
    this.applyFilters();
  }

  toggleCity(city: string) {
    const index = this.selectedCities.indexOf(city);
    if (index > -1) this.selectedCities.splice(index, 1);
    else this.selectedCities.push(city);
    this.applyFilters();
  }

  toggleCountry(country: string) {
    const index = this.selectedCountries.indexOf(country);
    if (index > -1) this.selectedCountries.splice(index, 1);
    else this.selectedCountries.push(country);
    this.applyFilters();
  }

  togglePeriod(period: string) {
    const index = this.selectedPeriods.indexOf(period);
    if (index > -1) this.selectedPeriods.splice(index, 1);
    else this.selectedPeriods.push(period);
    this.applyFilters();
  }

  clearAllFilters(type: 'city' | 'country' | 'period') {
    if (type === 'city') { this.selectedCities = []; this.showCityDropdown = false; }
    else if (type === 'country') { this.selectedCountries = []; this.showCountryDropdown = false; }
    else if (type === 'period') { this.selectedPeriods = []; this.showPeriodDropdown = false; }
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
      const searchMatch = !this.searchText || 
        (rabbi.FullName && rabbi.FullName.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (rabbi.knownAs && rabbi.knownAs.toLowerCase().includes(this.searchText.toLowerCase()));
      const columnMatch = Object.keys(this.columnFilters).every(col => {
        const filterValue = this.columnFilters[col];
        if (!filterValue) return true;
        const rabbiValue = rabbi[col];
        if (rabbiValue === null || rabbiValue === undefined) return false;
        if (['YearOfBirth', 'YearOfDeath', 'HebDob', 'HebDoP', 'ID'].includes(col)) {
          return String(rabbiValue).startsWith(filterValue);
        }
        return String(rabbiValue).toLowerCase().includes(filterValue.toLowerCase());
      });
      return cityMatch && countryMatch && periodMatch && searchMatch && columnMatch;
    });
  }

  onSearchChange() { this.applyFilters(); }

  selectRabbi(rabbi: any) {
    this.selectedRabbi = rabbi;
    this.refreshFilteredSforim();
  }

  selectRabbiById(rabbiId: number) {
    const rabbi = this.talmideiHahamim.find(r => r.ID === rabbiId);
    if (rabbi) {
      if (this.filteredTalmideiHahamim.findIndex(r => r.ID === rabbiId) === -1) {
        this.selectedCities = []; this.selectedCountries = []; this.selectedPeriods = [];
        this.searchText = ''; this.applyFilters();
      }
      this.filteredTalmideiHahamim = this.filteredTalmideiHahamim.filter(r => r.ID !== rabbiId);
      this.filteredTalmideiHahamim.unshift(rabbi);
      this.selectRabbi(rabbi);
    }
  }

  sortBy(column: string) {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    this.filteredTalmideiHahamim.sort((a, b) => {
      let aValue = a[column] == null ? '' : String(a[column]).toLowerCase();
      let bValue = b[column] == null ? '' : String(b[column]).toLowerCase();
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  startAddingNew() { this.isAddingNew = true; this.newRabbi = { FullName: '' }; }
  cancelEdit() { this.editingRabbiId = null; this.editingRabbi = {}; this.isAddingNew = false; }
  
  startEditing(rabbi: any) { this.editingRabbiId = rabbi.RabbiID; this.editingRabbi = { ...rabbi }; }
  isEditing(rabbi: any): boolean { return this.editingRabbiId === rabbi.RabbiID; }

  async saveEdit() {
    if (!this.editingRabbi.FullName) { alert('אנא מלא לפחות שם מלא'); return; }
    const { RabbiID, ...rabbiData } = this.editingRabbi;
    try {
      const response = await this.databaseService.updateRabbi(this.editingRabbiId!, rabbiData);
      if (response.success) { 
        this.editingRabbiId = null; 
        this.loadTalmideiHahamim(); 
      }
    } catch (error: any) {
      alert('שגיאה: ' + error.message);
    }
  }

  openDetailsPanel() { if (this.selectedRabbi) this.showDetailsPanel = true; }
  closeDetailsPanel() { this.showDetailsPanel = false; }
  onDetailsSelectRabbi(rabbiId: number) { this.selectRabbiById(rabbiId); }
}
