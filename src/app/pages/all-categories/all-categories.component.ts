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
        // The API returns all categories. We might want to filter specific ones 
        // if the intention was to show only "Featured" ones, 
        // but for "All Categories" page we likely want all of them.
        // The original code filtered by IDs ['15', '16', '17', '18'].
        // If the user wants ALL categories, we should show all.
        // Assuming user wants to see what's in DB.
        this.categories = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.loading = false;
      }
    });
  }
}
