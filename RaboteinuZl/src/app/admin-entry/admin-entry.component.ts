import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-admin-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-entry.component.html',
  styleUrls: ['./admin-entry.component.css']
})
export class AdminEntryComponent {
  rabbi = {
    FullName: '',
    knownAs: '',
    YearOfBirth: null as number | null,
    YearOfDeath: null as number | null,
    PlaceOfBirth: '',
    PlaceOfPtira: '',
    URL: '',
    HebDob: null as number | null,
    HebDoP: null as number | null,
    City: '',
    Country: '',
    Period: '',
    KnownFor: '',
    Notes: '',
    Sources: ''
  };

  searchingWikipedia = false;
  wikipediaStatus = '';
  saving = false;
  saveStatus = '';

  constructor(private dbService: DatabaseService) {}

  async searchWikipedia() {
    if (!this.rabbi.FullName && !this.rabbi.knownAs) {
      this.wikipediaStatus = 'נא להזין שם';
      return;
    }

    this.searchingWikipedia = true;
    this.wikipediaStatus = 'מחפש...';

    const searchName = this.rabbi.FullName || this.rabbi.knownAs;

    try {
      const result = await this.dbService.searchWikipedia(searchName);
      
      if (result.found) {
        this.rabbi.URL = result.url;
        this.wikipediaStatus = `✓ נמצא: ${result.title}`;
      } else {
        this.wikipediaStatus = '✗ לא נמצא בויקיפדיה';
      }
    } catch (error) {
      console.error('Wikipedia search error:', error);
      this.wikipediaStatus = 'שגיאה בחיפוש';
    } finally {
      this.searchingWikipedia = false;
    }
  }

  async saveRabbi() {
    if (!this.rabbi.FullName && !this.rabbi.knownAs) {
      this.saveStatus = 'נא להזין לפחות שם אחד';
      return;
    }

    this.saving = true;
    this.saveStatus = 'שומר...';

    try {
      await this.dbService.createRabbi(this.rabbi);
      this.saveStatus = '✓ נשמר בהצלחה!';
      
      // Clear form after 1 second
      setTimeout(() => {
        this.clearForm();
      }, 1000);
    } catch (error) {
      console.error('Save error:', error);
      this.saveStatus = 'שגיאה בשמירה';
    } finally {
      this.saving = false;
    }
  }

  clearForm() {
    this.rabbi = {
      FullName: '',
      knownAs: '',
      YearOfBirth: null,
      YearOfDeath: null,
      PlaceOfBirth: '',
      PlaceOfPtira: '',
      URL: '',
      HebDob: null,
      HebDoP: null,
      City: '',
      Country: '',
      Period: '',
      KnownFor: '',
      Notes: '',
      Sources: ''
    };
    this.wikipediaStatus = '';
    this.saveStatus = '';
  }
}
