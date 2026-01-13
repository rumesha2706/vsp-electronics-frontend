import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartItem, Product } from '../models/product.model';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/cart`;

  private cartItems = signal<CartItem[]>([]);

  cartCount = computed(() => {
    return this.cartItems().reduce((total: number, item: CartItem) => total + item.quantity, 0);
  });

  cartTotal = computed(() => {
    // Backend calculates total but we can compute locally for UI speed or use backend data
    // The backend GET returns totals, but for optimistic UI we might compute.
    // However, since we now have backend, we should sync with it.
    return this.cartItems().reduce((total: number, item: CartItem) => {
      const price = item.product?.price || 0; // Ensure product exists
      return total + (price * item.quantity);
    }, 0);
  });

  constructor() {
    // Load cart when user logs in
    effect(() => {
      if (this.authService.currentUser()) {
        this.loadCart();
      } else {
        this.cartItems.set([]);
      }
    }, { allowSignalWrites: true });
  }

  getCartItems() {
    return this.cartItems();
  }

  loadCart() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.items) {
          // Map backend items to frontend CartItem structure if needed
          // Backend returns: { product_id, quantity, name, image, price, ... }
          // Frontend CartItem expects: { product: Product, quantity: number }

          const mappedItems: CartItem[] = response.data.items.map((item: any) => ({
            product: {
              id: item.product_id,
              name: item.name,
              image: item.image,
              price: parseFloat(item.current_price || item.price), // Use current price
              category: item.category,
              description: '', // might be missing
              inStock: item.in_stock,
              brand: item.brand
            } as Product,
            quantity: item.quantity
          }));
          this.cartItems.set(mappedItems);
        }
      },
      error: (err) => console.error('Error loading cart', err)
    });
  }

  addToCart(product: Product, quantity: number = 1) {
    // Optimistic Update
    const currentItems = this.cartItems();
    const existing = currentItems.find(i => i.product.id === product.id);

    if (existing) {
      this.cartItems.set(currentItems.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i));
    } else {
      this.cartItems.set([...currentItems, { product, quantity }]);
    }

    this.http.post<any>(`${this.apiUrl}/add`, { productId: product.id, quantity }).subscribe({
      next: (res) => {
        if (res.success) {
          // Reload validation
          this.loadCart();
          this.trackCartActivity('cart');
        }
      },
      error: (err) => {
        console.error('Add to cart failed', err);
        this.loadCart(); // Revert on error
      }
    });
  }

  removeFromCart(productId: string) {
    // Optimistic
    this.cartItems.set(this.cartItems().filter(i => i.product.id !== productId));

    this.http.delete<any>(`${this.apiUrl}/remove/${productId}`).subscribe({
      next: () => this.loadCart(),
      error: (err) => {
        console.error('Remove failed', err);
        this.loadCart();
      }
    });
  }

  updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    // Optimistic
    this.cartItems.set(this.cartItems().map(i => i.product.id === productId ? { ...i, quantity } : i));

    this.http.put<any>(`${this.apiUrl}/update/${productId}`, { quantity }).subscribe({
      next: () => this.loadCart(),
      error: (err) => {
        console.error('Update failed', err);
        this.loadCart();
      }
    });
  }

  clearCart() {
    this.cartItems.set([]);
    this.http.delete(`${this.apiUrl}/clear`).subscribe();
  }

  checkout() {
    this.trackCartActivity('order');
    this.clearCart();
  }

  private trackCartActivity(type: 'cart' | 'order') {
    const user = this.authService.currentUser();
    if (user) {
      this.analyticsService.trackTransaction({
        userId: user.id || '',
        userName: user.firstName || user.name || '',
        type: type,
        items: this.cartCount(),
        amount: this.cartTotal()
      });
    }
  }
}
