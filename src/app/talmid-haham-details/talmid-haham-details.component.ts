import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-talmid-haham-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './talmid-haham-details.component.html',
  styleUrl: './talmid-haham-details.component.css'
})
export class TalmidHahamDetailsComponent {
  @Input() rabbi: any = null;
  @Input() talmidim: any[] = [];
  @Input() allRabbis: any[] = [];
  @Input() sforim: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() selectRabbi = new EventEmitter<number>();

  // Active tab
  activeTab: 'sforim' | 'photos' | 'relationships' | 'stories' | 'research' = 'sforim';

  // Tab labels in Hebrew (RTL order - rightmost first)
  tabs = [
    { id: 'sforim' as const, label: 'ספרים', icon: '📚' },
    { id: 'photos' as const, label: 'תמונות', icon: '🖼️' },
    { id: 'relationships' as const, label: 'קשרים', icon: '🔗' },
    { id: 'stories' as const, label: 'סיפורים', icon: '📖' },
    { id: 'research' as const, label: 'מחקר', icon: '🔬' }
  ];

  setActiveTab(tabId: 'sforim' | 'photos' | 'relationships' | 'stories' | 'research') {
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
}
