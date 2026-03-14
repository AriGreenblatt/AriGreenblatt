import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-talmid-haham-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './talmid-haham-details.component.html',
  styleUrls: ['./talmid-haham-details.component.css']
})
export class TalmidHahamDetailsComponent implements OnInit, OnChanges {
  @Input() rabbi: any = null;
  @Input() talmidim: any[] = [];
  @Input() allRabbis: any[] = [];
  @Input() sforim: any[] = [];
  @Input() associations: any[] = [];
  @Input() relationships: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() selectRabbi = new EventEmitter<number>();

  wikiContent: string = '';
  wikiLoading: boolean = false;
  wikiError: string = '';

  // Active tab
  activeTab: 'about' | 'sforim' | 'photos' | 'relationships' | 'stories' | 'research' = 'about';

  // Tab labels in Hebrew (RTL order - rightmost first)
  tabs = [
    { id: 'about' as const, label: 'אודות', icon: '👤' },
    { id: 'sforim' as const, label: 'ספרים', icon: '📚' },
    { id: 'photos' as const, label: 'תמונות', icon: '🖼️' },
    { id: 'relationships' as const, label: 'קשרים', icon: '🔗' },
    { id: 'stories' as const, label: 'סיפורים', icon: '📖' },
    { id: 'research' as const, label: 'מחקר', icon: '🔬' }
  ];

  constructor(private dbService: DatabaseService) {}

  ngOnInit() {
    this.loadWikipediaContent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rabbi'] && !changes['rabbi'].firstChange) {
      this.loadWikipediaContent();
    }
  }

  loadWikipediaContent() {
    if (!this.rabbi) return;
    
    console.log('Loading wiki for rabbi:', this.rabbi);
    
    this.wikiLoading = true;
    this.wikiError = '';
    this.wikiContent = '';

    // Determine the title to use
    let title = '';
    
    if (this.rabbi.url) {
      console.log('url found:', this.rabbi.url);
      // Extract title from Wikipedia URL
      const match = this.rabbi.url.match(/\/wiki\/(.+?)(?:#|$)/);
      if (match) {
        title = decodeURIComponent(match[1]);
        console.log('Extracted title from URL:', title);
      }
    }
    
    // Fall back to knownAs if no URL or couldn't extract title
    if (!title && this.rabbi.knownAs) {
      title = this.rabbi.knownAs;
      console.log('Using knownAs:', title);
    }
    
    if (!title) {
      this.wikiLoading = false;
      this.wikiError = 'אין מידע זמין';
      console.log('No title found');
      return;
    }

    console.log('Calling odot API with title:', title);
    
    // Use the new odot endpoint
    this.dbService.getOdotContent(title).subscribe({
      next: (response) => {
        console.log('Odot response:', response);
        this.wikiLoading = false;
        if (response.success && response.data) {
          this.wikiContent = response.data.content;
        } else {
          this.wikiError = 'לא נמצא ערך בוויקיפדיה';
        }
      },
      error: (error) => {
        this.wikiLoading = false;
        this.wikiError = 'שגיאה בטעינת תוכן מוויקיפדיה';
        console.error('Wikipedia error:', error);
      }
    });
  }

  setActiveTab(tabId: 'about' | 'sforim' | 'photos' | 'relationships' | 'stories' | 'research') {
    this.activeTab = tabId;
  }

  closeDetails() {
    this.close.emit();
  }

  onSelectRabbi(rabbiId: number) {
    this.selectRabbi.emit(rabbiId);
  }

  // Get relationships for this rabbi
  getRelationships(): any[] {
    if (!this.rabbi || !this.talmidim) return [];
    return this.talmidim.filter(t => t.RabbiId === this.rabbi.RabbiID);
  }

  // Get rabbi name by ID
  getRabbiName(rabbiId: number): string {
    const rabbi = this.allRabbis.find(r => r.RabbiID === rabbiId);
    return rabbi ? (rabbi.FullName || rabbi.knownAs) : `ID: ${rabbiId}`;
  }

  // Placeholder data - these will be replaced with real data from API later
  getPhotos(): any[] {
    // TODO: Load from API
    if (!this.rabbi) return [];
    if (this.rabbi.ImageUrl) {
      return [{ url: this.rabbi.ImageUrl, caption: this.rabbi.FullName }];
    }
    return [];
  }

  getStories(): any[] {
    // TODO: Load from API
    return [];
  }

  getResearch(): any[] {
    // TODO: Load from API
    return [];
  }

  getSforim(): any[] {
    if (!this.rabbi || !this.sforim) return [];
    return this.sforim.filter(s => s.RabbiID === this.rabbi.RabbiID);
  }

  getAssociations(): any[] {
    if (!this.rabbi || !this.associations) return [];
    return this.associations.filter(a => a.RabbiId === this.rabbi.RabbiID);
  }

  getRelationshipName(relationshipCode: number): string {
    const rel = this.relationships.find(r => r.Code === relationshipCode);
    return rel ? rel.HebName : '';
  }
}
