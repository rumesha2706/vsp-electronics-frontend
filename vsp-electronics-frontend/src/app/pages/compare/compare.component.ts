import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.css']
})
export class CompareComponent {
  compareService = inject(CompareService);
  compareItems = this.compareService.getCompareItems();

  removeFromCompare(id: string) {
    this.compareService.removeFromCompare(id);
  }

  clearCompare() {
    this.compareService.clearCompare();
  }
}
