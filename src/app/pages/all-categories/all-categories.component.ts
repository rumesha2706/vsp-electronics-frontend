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
      next: (data) => {
        // Limit to 4 categories as requested by user
        this.categories = data.slice(0, 4);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.loading = false;
      }
    });
  }
}
