import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubcategoryService, Subcategory } from '../../services/subcategory.service';

@Component({
  selector: 'app-subcategory-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subcategory-nav.component.html',
  styleUrls: ['./subcategory-nav.component.css']
})
export class SubcategoryNavComponent implements OnInit {
  @Input() categoryName: string = '';
  @Input() activeSubcategorySlug: string = '';

  private subcategoryService = inject(SubcategoryService);

  subcategories: Subcategory[] = [];
  loading = false;

  ngOnInit() {
    if (this.categoryName) {
      this.loadSubcategories();
    }
  }

  ngOnChanges() {
    if (this.categoryName) {
      this.loadSubcategories();
    }
  }

  loadSubcategories() {
    this.loading = true;
    this.subcategoryService.getSubcategoriesByCategory(this.categoryName)
      .subscribe({
        next: (subcategories) => {
          this.subcategories = subcategories;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading subcategories:', error);
          this.loading = false;
        }
      });
  }

  getCategorySlug(): string {
    return this.categoryName.toLowerCase().replace(/\s+/g, '-');
  }
}
