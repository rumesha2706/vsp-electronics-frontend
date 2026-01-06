import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-subcategory-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subcategory-card.component.html',
  styleUrls: ['./subcategory-card.component.css']
})
export class SubcategoryCardComponent {
  @Input() categorySlug: string = '';
  @Input() subcategoryName: string = '';
  @Input() subcategorySlug: string = '';
  @Input() productCount: number = 0;
  @Input() imageUrl: string = '/assets/images/products/rpi-accessories/placeholder.jpg';

  getRouterLink(): string {
    return `/category/${this.categorySlug}/${this.subcategorySlug}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/images/placeholder.jpg';
  }
}
