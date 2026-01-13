import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-recently-viewed-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recently-viewed-carousel.component.html',
  styleUrls: ['./recently-viewed-carousel.component.css']
})
export class RecentlyViewedCarouselComponent implements OnInit {
  @Input() limit: number = 6;
  @Input() variant: 'carousel' | 'grid' = 'carousel';

  private recentlyViewedService = inject(RecentlyViewedService);

  recentlyViewedProducts: Product[] = [];
  loading = false;
  error = '';
  scrollPosition = 0;

  ngOnInit() {
    this.loadRecentlyViewed();
  }

  loadRecentlyViewed() {
    this.loading = true;
    this.error = '';
    
    this.recentlyViewedService.getRecentlyViewed(this.limit).subscribe({
      next: (response) => {
        this.recentlyViewedProducts = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading recently viewed:', error);
        this.error = '';
        this.loading = false;
      }
    });
  }

  getRatingArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  clearHistory() {
    if (confirm('Clear recently viewed history?')) {
      this.recentlyViewedService.clearRecentlyViewed().subscribe({
        next: () => {
          this.recentlyViewedProducts = [];
        },
        error: (error) => {
          console.error('Error clearing history:', error);
        }
      });
    }
  }

  scrollCarousel(direction: 'left' | 'right') {
    const carousel = document.querySelector('.carousel-items');
    if (carousel) {
      const scrollAmount = 320;
      if (direction === 'left') {
        carousel.scrollLeft -= scrollAmount;
      } else {
        carousel.scrollLeft += scrollAmount;
      }
    }
  }
}
