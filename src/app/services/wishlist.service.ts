import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/wishlist`;
  private wishlistItems = signal<Product[]>([]);

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        this.loadWishlist();
      } else {
        this.wishlistItems.set([]);
      }
    }, { allowSignalWrites: true });
  }

  getWishlistItems() {
    return this.wishlistItems();
  }

  loadWishlist() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data.items)) {
          // Backend returns items joined with products. 
          // Mapping might be needed if structure differs slightly, but usually it's product fields + wishlists.id
          // Let's assume response matches Product somewhat or map it.
          // Based on wishlist-model.js: p.name, p.image, etc.
          const items = res.data.items.map((item: any) => ({
            id: item.product_id, // We track by product ID mostly
            name: item.name,
            image: item.image,
            price: parseFloat(item.price),
            category: item.category,
            brand: item.brand,
            inStock: item.in_stock,
            description: item.description
          } as Product));
          this.wishlistItems.set(items);
        }
      },
      error: (err) => console.error('Error loading wishlist', err)
    });
  }

  addToWishlist(product: Product) {
    // Optimistic
    const items = this.wishlistItems();
    if (!items.find((p: Product) => p.id === product.id)) {
      this.wishlistItems.set([...items, product]);

      this.http.post<any>(`${this.apiUrl}/add`, { productId: product.id }).subscribe({
        next: (res) => {
          if (!res.success) this.loadWishlist(); // Revert/Reload if failed or duplicate
        },
        error: (err) => {
          console.error('Add to wishlist failed', err);
          this.loadWishlist();
        }
      });
    }
  }

  removeFromWishlist(productId: string) {
    // Optimistic
    this.wishlistItems.set(this.wishlistItems().filter((p: Product) => p.id !== productId));

    this.http.delete<any>(`${this.apiUrl}/${productId}`).subscribe({
      error: (err) => {
        console.error('Remove wishlist failed', err);
        this.loadWishlist();
      }
    });
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistItems().some((p: Product) => p.id === productId);
  }

  getWishlistCount() {
    return this.wishlistItems().length;
  }
}
