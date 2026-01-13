import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BackendProductService } from '../../services/backend-product.service';
import { Category } from '../../models/product.model';

@Component({
  selector: 'app-all-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './all-categories.component.html',
  styleUrls: ['./all-categories.component.css']
})
export class AllCategoriesComponent implements OnInit {
  private backendService = inject(BackendProductService);
  categories: Category[] = [];

  loading = true;

  ngOnInit() {
    this.loading = true;
    this.backendService.getCategoriesWithDetails().subscribe({
      next: (data: Category[]) => {
        // Filter to show specific categories requested by user
        const desiredSlugs = ['bms', 'shield-accessories', 'wheels', 'wireless-modules'];
        this.categories = data.filter(cat => desiredSlugs.includes(cat.slug));

        // If meant to be strictly these 4, we can sort them to match the list order too
        this.categories.sort((a, b) => desiredSlugs.indexOf(a.slug) - desiredSlugs.indexOf(b.slug));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.loading = false;
      }
    });
  }
}
