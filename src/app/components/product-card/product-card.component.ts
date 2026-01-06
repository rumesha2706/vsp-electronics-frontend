import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() loginRequired = new EventEmitter<string>();
  imageLoaded = false;
  
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  authService = inject(AuthService);

  onImageLoad() {
    this.imageLoaded = true;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Use absolute asset path to ensure it resolves correctly
    img.src = '/assets/images/placeholder.jpg';
  }

  addToCart(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.authService.requireLogin()) {
      this.loginRequired.emit('Please login to add items to cart');
      return;
    }
    
    this.cartService.addToCart(this.product);
  }

  toggleWishlist(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.authService.requireLogin()) {
      this.loginRequired.emit('Please login to add items to wishlist');
      return;
    }
    
    if (this.wishlistService.isInWishlist(this.product.id)) {
      this.wishlistService.removeFromWishlist(this.product.id);
    } else {
      this.wishlistService.addToWishlist(this.product);
    }
  }

  isInWishlist(): boolean {
    return this.wishlistService.isInWishlist(this.product.id);
  }

  getDiscountPercentage(): number | null {
    if (this.product.originalPrice && this.product.originalPrice > this.product.price) {
      const discount = ((this.product.originalPrice - this.product.price) / this.product.originalPrice) * 100;
      return Math.round(discount);
    }
    return null;
  }
}
