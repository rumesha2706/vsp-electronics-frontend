import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-recently-viewed',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recently-viewed.component.html',
  styleUrls: ['./recently-viewed.component.css']
})
export class RecentlyViewedComponent implements OnInit {
  private recentlyViewedService = inject(RecentlyViewedService);

  recentlyViewedProducts: Product[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.loadRecentlyViewed();
  }

  loadRecentlyViewed() {
    this.loading = true;
    this.recentlyViewedService.getRecentlyViewed(10).subscribe({
      next: (response) => {
        this.recentlyViewedProducts = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading recently viewed products:', error);
        this.error = 'Failed to load recently viewed products';
        this.loading = false;
      }
    });
  }

  clearHistory() {
    if (confirm('Are you sure you want to clear your recently viewed history?')) {
      this.recentlyViewedService.clearRecentlyViewed().subscribe({
        next: () => {
          this.recentlyViewedProducts = [];
          this.loadRecentlyViewed();
        },
        error: (error) => {
          console.error('Error clearing recently viewed:', error);
        }
      });
    }
  }
}
