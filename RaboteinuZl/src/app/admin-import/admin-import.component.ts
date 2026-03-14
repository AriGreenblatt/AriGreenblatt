import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';

interface ExtractionResult {
  rabbi: any;
  books: any[];
  relationships: any[];
  events: any[];
  confidence: {
    overall: number;
    rabbi: { [key: string]: number };
    booksCount: number;
    relationshipsCount: number;
    eventsCount: number;
  };
  source: {
    title: string;
    url: string;
    pageId: number;
  };
  databaseRecord?: boolean;
  databaseBooks?: any[];
}

@Component({
  selector: 'app-admin-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-import.component.html',
  styleUrl: './admin-import.component.css'
})
export class AdminImportComponent implements OnInit {
  // Input
  wikipediaUrl = '';
  rabbiName = '';
  
  // State
  isExtracting = false;
  isSaving = false;
  extractionComplete = false;
  errorMessage = '';
  successMessage = '';
  searchingWikipedia = false;
  wikipediaSearchStatus = '';
  wikipediaSearchResults: any[] = [];
  showComparison = false;
  
  // Extracted data
  extractedData: ExtractionResult | null = null;
  
  // Editable lists (can delete items)
  editableBooks: any[] = [];
  editableRelationships: any[] = [];
  editableEvents: any[] = [];
  
  // Duplicate checking
  duplicateCheck: any = null;
  missingRabbis: string[] = [];
  
  // Relationship types
  relationshipTypes = [
    { code: 'RT', name: 'רבי-תלמיד / Teacher-Student' },
    { code: 'CT', name: 'חברותא / Study Partner' },
    { code: 'CR', name: 'חבר / Colleague' },
    { code: 'AB', name: 'אח / Brother' },
    { code: 'FA', name: 'אב / Father' },
    { code: 'SO', name: 'בן / Son' },
    { code: 'HW', name: 'בעל / Husband' },
    { code: 'WI', name: 'אשה / Wife' }
  ];
  
  // Editable rabbi data
  rabbi = {
    RabbiID: null as number | null,
    FullName: '',
    knownAs: '',
    YearOfBirth: null as number | null,
    YearOfDeath: null as number | null,
    PlaceOfBirth: '',
    PlaceOfPtira: '',
    City: '',
    Country: '',
    Period: '',
    KnownFor: '',
    Notes: '',
    Sources: '',
    URL: '',
    HebDob: null as number | null,
    HebDoP: null as number | null,
    HebCharDob: '',
    HebCharDoP: '',
    Approx: 0,
    Assumed: 0,
    ImageUrl: '',
    wiki_city_map_url: ''
  };
  
  constructor(private databaseService: DatabaseService) {}
  
  ngOnInit() {
    // Initialize 7 empty relationship rows
    for (let i = 0; i < 7; i++) {
      this.editableRelationships.push({
        hebrewName: '',
        Rabbi2Id: null,
        relationshipCode: null,
        fromYear: null,
        toYear: null,
        place: '',
        notes: '',
        FamilyCode: 0,
        IsApprox: 0
      });
    }
  }
  
  getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'confidence-high';
    if (confidence >= 50) return 'confidence-medium';
    return 'confidence-low';
  }
  
  getConfidenceLabel(confidence: number): string {
    if (confidence >= 80) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
  }
  
  getFieldClass(fieldName: string): string {
    if (this.extractedData?.databaseRecord) {
      const source = this.getFieldSource(fieldName);
      if (source === 'database') return 'field-from-database';
      if (source === 'wikipedia') return 'field-from-wikipedia';
    }
    return '';
  }
  
  getFieldSource(fieldName: string): string {
    if (!this.extractedData?.databaseRecord) return 'wikipedia';
    const dbValue = (this.extractedData as any).databaseValues?.[fieldName];
    const currentValue = (this.rabbi as any)[fieldName];
    if (dbValue === currentValue) return 'database';
    return 'wikipedia';
  }
  
  async searchWikipedia() {
    if (!this.rabbiName) {
      this.errorMessage = 'Please enter a rabbi name to search';
      return;
    }
    
    this.searchingWikipedia = true;
    this.wikipediaSearchStatus = 'Searching Wikipedia...';
    this.wikipediaSearchResults = [];
    this.errorMessage = '';
    
    try {
      const result = await this.databaseService.searchWikipedia(this.rabbiName);
      
      if (result.success && result.results && result.results.length > 0) {
        this.wikipediaSearchResults = result.results;
        this.wikipediaSearchStatus = `Found ${result.results.length} results`;
      } else {
        this.wikipediaSearchStatus = 'No results found';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to search Wikipedia';
      this.wikipediaSearchStatus = '';
    } finally {
      this.searchingWikipedia = false;
    }
  }
  
  selectWikipediaResult(result: any) {
    this.wikipediaUrl = result.url;
    this.rabbiName = result.title;
    this.wikipediaSearchResults = [];
    this.wikipediaSearchStatus = `Selected: ${result.title}`;
  }
  
  async extractWikipedia() {
    if (!this.wikipediaUrl && !this.rabbiName) {
      this.errorMessage = 'Please provide either a Wikipedia URL or rabbi name';
      return;
    }
    
    this.isExtracting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.extractionComplete = false;
    this.duplicateCheck = null;
    this.missingRabbis = [];
    
    try {
      const result = await this.databaseService.extractWikipedia(
        this.wikipediaUrl || undefined,
        this.rabbiName || undefined
      );
      
      if (result.success) {
        this.extractedData = result.data;
        
        // Populate editable fields with extracted data
        this.rabbi = { ...this.rabbi, ...result.data.rabbi };
        
        // Populate editable lists - combine database books with extracted books
        const dbBooks = result.data.databaseBooks || [];
        const extractedBooks = result.data.books || [];
        
        this.editableBooks = [...dbBooks];
        
        for (const book of extractedBooks) {
          const isDuplicate = dbBooks.some((dbBook: any) => 
            dbBook.HebTitle && book.HebTitle && 
            dbBook.HebTitle.trim() === book.HebTitle.trim()
          );
          if (!isDuplicate) {
            this.editableBooks.push(book);
          }
        }
        
        this.editableRelationships = [...result.data.relationships];
        this.editableEvents = [...result.data.events];
        
        if (!this.rabbi.Notes) {
          this.rabbi.Notes = '';
        }
        if (!this.rabbi.Notes.includes(result.data.source.url)) {
          this.rabbi.Notes += `\n\nמקור: ${result.data.source.url}`;
        }
        this.rabbi.Sources = result.data.source.url;
        
        this.extractionComplete = true;
        this.successMessage = `Successfully extracted data from ${result.data.source.title}`;
        
        if (this.rabbi.FullName) {
          await this.checkForDuplicate();
        }
        
        this.checkMissingRabbis();
      } else {
        this.errorMessage = result.message || 'Extraction failed';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to extract Wikipedia data';
    } finally {
      this.isExtracting = false;
    }
  }
  
  async checkForDuplicate() {
    if (!this.rabbi.FullName) return;
    
    try {
      const result = await this.databaseService.checkDuplicate(this.rabbi.FullName);
      if (result.success && result.exists) {
        this.duplicateCheck = result;
        this.showComparison = true;
      } else {
        this.duplicateCheck = null;
        this.showComparison = false;
      }
    } catch (error: any) {
      console.error('Failed to check for duplicate:', error);
    }
  }
  
  checkMissingRabbis() {
    this.missingRabbis = [];
  }
  
  compareField(fieldName: string, value: any): string {
    if (!this.duplicateCheck?.exists || !this.showComparison) return '';
    
    const dbValue = this.duplicateCheck.rabbi[fieldName];
    
    if (dbValue === value || (!dbValue && !value)) {
      return 'field-match';
    } else if (dbValue && value) {
      return 'field-different';
    } else if (!dbValue && value) {
      return 'field-new';
    }
    
    return '';
  }
  
  hasNewData(): boolean {
    if (!this.duplicateCheck?.exists) return false;
    
    const dbRabbi = this.duplicateCheck.rabbi;
    
    for (const key in this.rabbi) {
      if (key === 'RabbiID') continue;
      const newValue = (this.rabbi as any)[key];
      const oldValue = dbRabbi[key];
      
      if (newValue && !oldValue) return true;
      if (newValue && oldValue && newValue !== oldValue) return true;
    }
    
    return false;
  }
  
  async updateExisting() {
    if (!this.duplicateCheck?.exists || !this.rabbi.FullName) {
      this.errorMessage = 'No existing record to update';
      return;
    }
    
    const rabbiId = this.duplicateCheck.rabbi.RabbiID;
    
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    try {
      const updates: any = {};
      for (const key in this.rabbi) {
        if (key === 'RabbiID') continue;
        const newValue = (this.rabbi as any)[key];
        const oldValue = this.duplicateCheck.rabbi[key];
        
        if (newValue !== null && newValue !== undefined && newValue !== '' && newValue !== oldValue) {
          updates[key] = newValue;
        }
      }
      
      const result = await this.databaseService.updateRabbi(rabbiId, updates);
      
      if (result.success) {
        this.successMessage = `Rabbi updated successfully! ID: ${rabbiId}`;
        this.showComparison = false;
        
        await this.saveRelatedData(rabbiId);
        
        setTimeout(() => {
          this.clearForm();
        }, 2000);
      } else {
        this.errorMessage = result.message || 'Failed to update rabbi';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to update rabbi';
    } finally {
      this.isSaving = false;
    }
  }
  
  async approveAndSave() {
    if (!this.rabbi.FullName) {
      this.errorMessage = 'Full name is required';
      return;
    }
    
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    try {
      let rabbiId: number;
      
      if (this.extractedData?.databaseRecord && this.extractedData?.rabbi?.RabbiID) {
        rabbiId = this.extractedData.rabbi.RabbiID;
        console.log('Updating existing rabbi with ID:', rabbiId);
        
        const updates: any = {};
        for (const key in this.rabbi) {
          if (key === 'RabbiID') continue;
          const newValue = (this.rabbi as any)[key];
          const oldValue = (this.extractedData.rabbi as any)[key];
          
          if (newValue !== null && newValue !== undefined && newValue !== '' && newValue !== oldValue) {
            updates[key] = newValue;
          }
        }
        
        const result = await this.databaseService.updateRabbi(rabbiId, updates);
        
        if (!result.success) {
          this.errorMessage = result.message || 'Failed to update rabbi';
          this.isSaving = false;
          return;
        }
        
        this.successMessage = `Rabbi updated successfully! ID: ${rabbiId}`;
      } else {
        const result = await this.databaseService.createRabbi(this.rabbi);
        
        if (result.success) {
          rabbiId = result.rabbiId;
          this.successMessage = `Rabbi saved successfully! ID: ${rabbiId}`;
        } else {
          this.errorMessage = result.message || 'Failed to save rabbi';
          this.isSaving = false;
          return;
        }
      }
      
      await this.saveRelatedData(rabbiId);
      
      setTimeout(() => {
        this.clearForm();
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to save to database';
    } finally {
      this.isSaving = false;
    }
  }
  
  async saveRelatedData(rabbiId: number) {
    const newBooks = this.editableBooks.filter(book => !book.SeferID);
    if (newBooks.length > 0) {
      for (const book of newBooks) {
        book.RabbiID = rabbiId;
        try {
          await this.databaseService.createBook(book);
        } catch (error) {
          console.error('Failed to save book:', error);
        }
      }
    }
    
    if (this.editableRelationships.length > 0) {
      for (const rel of this.editableRelationships) {
        // Skip empty rows
        if (!rel.hebrewName && !rel.Rabbi2Id) continue;
        
        // Map to AssociatedWith table structure
        const association = {
          RabbiId: rabbiId,
          Rabbi2Id: rel.Rabbi2Id || null,
          RelationshipCode: rel.relationshipCode || 1,
          FamilyCode: rel.FamilyCode || 0,
          FromYear: rel.fromYear || null,
          ToYear: rel.toYear || null,
          HebPlace: rel.place || '',
          HebNotes: rel.notes || '',
          IsApprox: rel.IsApprox || 0
        };
        
        try {
          await this.databaseService.createRelationship(association);
        } catch (error) {
          console.error('Failed to save relationship:', error);
        }
      }
    }
    
    if (this.editableEvents.length > 0) {
      for (const event of this.editableEvents) {
        event.RabbiID = rabbiId;
        try {
          await this.databaseService.createEvent(event);
        } catch (error) {
          console.error('Failed to save event:', error);
        }
      }
    }
  }
  
  reject() {
    if (confirm('Are you sure you want to reject this extraction and start over?')) {
      this.clearForm();
    }
  }
  
  addBook() {
    this.editableBooks.push({
      HebTitle: '',
      Author: '',
      YearPublished: null,
      Type: '',
      Notes: ''
    });
  }
  
  addRelationship() {
    this.editableRelationships.push({
      hebrewName: '',
      Rabbi2Id: null,
      relationshipCode: null,
      fromYear: null,
      toYear: null,
      place: '',
      notes: '',
      FamilyCode: 0,
      IsApprox: 0
    });
  }
  
  addEvent() {
    this.editableEvents.push({
      EventYear: null,
      EventHebYear: null,
      EventCharDate: '',
      EventType: '',
      EventDescription: '',
      EventLocation: ''
    });
  }
  
  deleteBook(index: number) {
    this.editableBooks.splice(index, 1);
  }
  
  deleteRelationship(index: number) {
    this.editableRelationships.splice(index, 1);
  }
  
  deleteEvent(index: number) {
    this.editableEvents.splice(index, 1);
  }
  
  async fetchCityMap() {
    if (!this.rabbi.City) {
      this.errorMessage = 'Please enter a city name first';
      return;
    }
    
    try {
      const result = await this.databaseService.getCityMap(this.rabbi.City);
      if (result.success && result.imageUrl) {
        this.rabbi.wiki_city_map_url = result.imageUrl;
        this.successMessage = `City map loaded for ${this.rabbi.City}`;
      } else {
        this.errorMessage = result.message || 'No city map found';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to fetch city map';
    }
  }
  
  setCityLabelPosition() {
    // Placeholder for map label positioning
  }
  
  onPeriodChange() {
    if (this.rabbi.YearOfBirth && this.rabbi.YearOfDeath) {
      this.rabbi.Period = `${this.rabbi.YearOfBirth}-${this.rabbi.YearOfDeath}`;
    }
  }
  
  clearForm() {
    this.wikipediaUrl = '';
    this.rabbiName = '';
    this.extractedData = null;
    this.extractionComplete = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.duplicateCheck = null;
    this.showComparison = false;
    this.wikipediaSearchStatus = '';
    this.wikipediaSearchResults = [];
    this.missingRabbis = [];
    this.editableBooks = [];
    this.editableRelationships = [];
    this.editableEvents = [];
    
    this.rabbi = {
      RabbiID: null,
      FullName: '',
      knownAs: '',
      YearOfBirth: null,
      YearOfDeath: null,
      PlaceOfBirth: '',
      PlaceOfPtira: '',
      City: '',
      Country: '',
      Period: '',
      KnownFor: '',
      Notes: '',
      Sources: '',
      URL: '',
      HebDob: null,
      HebDoP: null,
      HebCharDob: '',
      HebCharDoP: '',
      Approx: 0,
      Assumed: 0,
      ImageUrl: '',
      wiki_city_map_url: ''
    };
  }
}
