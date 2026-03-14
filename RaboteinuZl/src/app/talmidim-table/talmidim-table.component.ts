import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-talmidim-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './talmidim-table.component.html',
  styleUrls: ['./talmidim-table.component.css']
})
export class TalmidimTableComponent {
  @Input() talmidim: any[] = [];
  @Input() selectedRabbiId: number | null = null;
  @Input() allRabbis: any[] = [];
  @Input() relationshipNameByCode: Record<number, string> = {};
  @Output() selectRabbi = new EventEmitter<number>();

  get visibleTalmidim(): any[] {
    if (this.selectedRabbiId == null) return [];
    // selectedRabbiId is the ID field (not RabbiID). RabbiID in AssociatedWith matches ID in Talmidei_Hahamim.
    console.log('Filtering talmidim for rabbi ID:', this.selectedRabbiId, 'Total talmidim:', this.talmidim?.length);
    const filtered = (this.talmidim || []).filter(t => t?.RabbiID == this.selectedRabbiId || t?.RabbiId == this.selectedRabbiId);
    console.log('Filtered talmidim count:', filtered.length);
    return filtered;
  }

  getRabbi2Id(talmid: any): number | null {
    const rabbi2Id = talmid?.Rabbi2Id;
    const parsed = typeof rabbi2Id === 'number' ? rabbi2Id : Number(rabbi2Id);
    return Number.isFinite(parsed) ? parsed : null;
  }

  getRabbi2Label(talmid: any): string {
    const rabbi2Id = this.getRabbi2Id(talmid);
    if (rabbi2Id == null) return '';
    const rabbi = (this.allRabbis || []).find(r => r?.ID === rabbi2Id);
    if (!rabbi) return `Rabbi #${rabbi2Id}`;
    return rabbi.FullName || rabbi.knownAs || `Rabbi #${rabbi2Id}`;
  }

  getRelationshipLabel(talmid: any): string {
    const code = talmid?.RelationshipCode;
    const parsed = typeof code === 'number' ? code : Number(code);
    if (!Number.isFinite(parsed)) return '';
    const label = this.relationshipNameByCode?.[parsed] || String(parsed);
    console.log('Relationship code:', parsed, 'Label:', label, 'Mapping:', this.relationshipNameByCode);
    return label;
  }

  onSelectRabbi(rabbiId: number | null | undefined) {
    if (rabbiId == null) return;
    this.selectRabbi.emit(rabbiId);
  }
}
