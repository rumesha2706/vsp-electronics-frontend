import { Component, inject, OnInit, computed, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BackendProductService } from '../../services/backend-product.service';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { CartService } from '../../services/cart.service';
import { QuoteService } from '../../services/quote.service';
import { WishlistService } from '../../services/wishlist.service';
import { CompareService } from '../../services/compare.service';
import { AuthService } from '../../services/auth.service';
import { RealTimeViewersService } from '../../services/real-time-viewers.service';
import { NavigationHistoryService } from '../../services/navigation-history.service';
import { Product } from '../../models/product.model';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { RecentlyViewedCarouselComponent } from '../../components/recently-viewed-carousel/recently-viewed-carousel.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AuthModalComponent, RecentlyViewedCarouselComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private backendProductService = inject(BackendProductService);
  private navigationHistory = inject(NavigationHistoryService);
  private recentlyViewedService = inject(RecentlyViewedService);
  private viewersService = inject(RealTimeViewersService);

  cartService = inject(CartService);
  quoteService = inject(QuoteService);
  wishlistService = inject(WishlistService);
  compareService = inject(CompareService);
  authService = inject(AuthService);

  showAuthModal: boolean = false;
  authModalMessage: string = '';
  authModalTab: 'login' | 'signup' = 'login';

  // Viewer tracking
  globalActiveUsers = signal(0);
  currentProductViewers = signal(0);

  // Computed signal to reactively check if current user is admin
  isAdmin = computed(() => this.authService.isAdmin());

  product: Product | undefined;
  loading: boolean = true;
  errorMessage: string = '';
  quantity: number = 1;
  selectedImage: string = '';
  selectedImageIndex: number = 0;
  allProductImages: string[] = [];
  activeTab: string = 'description';
  reviewRating: number = 0;
  reviewText: string = '';
  reviewName: string = '';
  reviewEmail: string = '';

  // Image Zoom & Lightbox Properties
  zoomLevel: number = 2.5;
  showLightbox: boolean = false;
  lightboxImageIndex: number = 0;
  zoomMaxLevel: number = 5;
  zoomMinLevel: number = 1.5;
  zoomStep: number = 0.5;
  // 360 View Properties
  isHovering: boolean = false;
  imageAutoScrollInterval: ReturnType<typeof setInterval> | null = null;
  lastMouseX: number = 0;
  imageScrollSpeed: number = 50; // milliseconds

  ngOnInit() {
    // Subscribe to real-time viewer stats
    this.viewersService.getViewerStats$().subscribe(stats => {
      this.globalActiveUsers.set(stats.globalActiveUsers);
      this.currentProductViewers.set(stats.productViewers);
    });

    this.route.params.subscribe(params => {
      const id = params['id'];
      this.loading = true;
      this.errorMessage = '';

      // Notify server that user is viewing this product
      const productId = parseInt(id, 10);
      if (!isNaN(productId)) {
        this.viewersService.viewProduct(productId);
      }

      this.backendProductService.getProductById(id).subscribe({
        next: (response: any) => {
          this.product = response.data;
          if (this.product) {
            this.selectedImage = this.product.image;

            // Get all product images (from metadata or main image)
            this.allProductImages = this.getProductImages();
            this.selectedImageIndex = 0;

            // Track this product as recently viewed
            const productId = parseInt(this.product.id, 10);
            if (!isNaN(productId)) {
              this.recentlyViewedService.addToRecentlyViewed(productId).subscribe(
                () => console.log('Added to recently viewed'),
                (error) => console.error('Error adding to recently viewed:', error)
              );
            }
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error fetching product:', error);
          this.errorMessage = 'Product not found';
          this.loading = false;
        }
      });
    });
  }

  ngOnDestroy() {
    // Tell server that user stopped viewing this product
    if (this.product) {
      const productId = parseInt(this.product.id, 10);
      if (!isNaN(productId)) {
        this.viewersService.stopViewingProduct(productId);
      }
    }
  }

  getCategorySlug(): string {
    if (!this.product) return '';
    return this.product.category.toLowerCase().replace(/ /g, '-');
  }

  getProductImages(): string[] {
    if (!this.product) return [];

    // First check if product has multiple images
    if (this.product.images && Array.isArray(this.product.images)) {
      return this.product.images.filter((img: string) => img && img.trim());
    }

    // For product ID 2, return actual images from the website
    if (this.product.id === '2') {
      return [
        'https://www.agarwalelectronics.com/wp-content/uploads/2024/03/2-WHEEL-ROUND-KIT-1.jpg',
        'https://www.agarwalelectronics.com/wp-content/uploads/2024/03/2-WHEEL-ROUND-KIT-2.jpg'
      ];
    }
    // For product ID 3, return multiple angle images
    if (this.product.id === '3') {
      return [
        'assets/images/products/placeholder.jpg',
        'assets/images/products/placeholder.jpg'
      ];
    }
    // For product ID 6, return actual image from website
    if (this.product.id === '6') {
      return [
        'https://www.agarwalelectronics.com/wp-content/uploads/2024/03/DIY-KIT-AIR-CAR-ROD3-1.jpg'
      ];
    }
    // For other products, return the main image
    return this.product.image ? [this.product.image] : [];
  }

  increaseQuantity() {
    this.quantity++;
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart() {
    if (this.authService.requireLogin()) {
      this.authModalMessage = 'Please login to add items to cart';
      this.authModalTab = 'login';
      this.showAuthModal = true;
      return;
    }
    if (this.product) {
      this.cartService.addToCart(this.product, this.quantity);
    }
  }

  addToQuote() {
    if (this.authService.requireLogin()) {
      this.authModalMessage = 'Please login to request a quote';
      this.authModalTab = 'login';
      this.showAuthModal = true;
      return;
    }
    if (this.product) {
      this.quoteService.addToQuote(this.product, this.quantity);
    }
  }

  toggleWishlist() {
    if (this.authService.requireLogin()) {
      this.authModalMessage = 'Please login to add items to wishlist';
      this.authModalTab = 'login';
      this.showAuthModal = true;
      return;
    }
    if (this.product) {
      if (this.wishlistService.isInWishlist(this.product.id)) {
        this.wishlistService.removeFromWishlist(this.product.id);
      } else {
        this.wishlistService.addToWishlist(this.product);
      }
    }
  }

  addToCompare() {
    if (this.authService.requireLogin()) {
      this.authModalMessage = 'Please login to compare products';
      this.authModalTab = 'login';
      this.showAuthModal = true;
      return;
    }
    if (this.product) {
      if (this.compareService.isInCompare(this.product.id)) {
        this.compareService.removeFromCompare(this.product.id);
      } else {
        this.compareService.addToCompare(this.product);
      }
    }
  }

  isInCompare(): boolean {
    return this.product ? this.compareService.isInCompare(this.product.id) : false;
  }

  closeAuthModal() {
    this.showAuthModal = false;
    this.authModalMessage = '';
  }

  isInWishlist(): boolean {
    return this.product ? this.wishlistService.isInWishlist(this.product.id) : false;
  }

  setRating(rating: number) {
    this.reviewRating = rating;
  }

  submitReview(event: Event) {
    event.preventDefault();
    if (this.reviewRating === 0) {
      alert('Please select a rating');
      return;
    }
    if (!this.reviewText.trim()) {
      alert('Please write a review');
      return;
    }
    if (!this.reviewName.trim() || !this.reviewEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    // In a real application, this would send the review to a backend
    alert('Thank you for your review! It has been submitted for approval.');
    // Reset form
    this.reviewRating = 0;
    this.reviewText = '';
    this.reviewName = '';
    this.reviewEmail = '';
  }

  getDiscountPercentage(): number | null {
    if (this.product?.originalPrice && this.product.originalPrice > this.product.price) {
      const discount = ((this.product.originalPrice - this.product.price) / this.product.originalPrice) * 100;
      return Math.round(discount);
    }
    return null;
  }

  // Flyout Zoom Properties
  showZoomWindow: boolean = false;
  zoomLensSize: number = 100; // Will be calculated 
  lensTop: number = 0;
  lensLeft: number = 0;
  lensWidth: number = 150;
  lensHeight: number = 150;
  zoomBackgroundPosition: string = '0% 0%';
  zoomBackgroundSize: string = '200%'; // Magnification factor

  // View Child references helpful for calculations (you'd need to add these to class if strict check on)
  // @ViewChild('mainImage') mainImage!: ElementRef;
  // @ViewChild('mainImageContainer') mainImageContainer!: ElementRef;


  zoomIn() {
    if (this.zoomLevel < this.zoomMaxLevel) {
      this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.zoomMaxLevel);
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.zoomMinLevel) {
      this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.zoomMinLevel);
    }
  }

  resetZoom() {
    this.zoomLevel = 2.5;
  }

  onMouseEnter() {
    this.showZoomWindow = true;
    this.stopImageAutoScroll();
  }

  onMouseLeave() {
    this.showZoomWindow = false;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.showZoomWindow) return;

    const container = event.currentTarget as HTMLElement;
    const image = container.querySelector('img.main-image') as HTMLImageElement; // Get the actual image

    if (!image) return;

    // Get dimensions
    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect(); // The actual rendered image size (could be smaller due to object-fit)

    // Config: Zoom Ratio (How much we want to magnify)
    const zoomRatio = this.zoomLevel;

    // Calculate Lens dimensions based on Zoom Window size and Ratio
    // Zoom window is defined in CSS as width: 130%, height: 100% of container
    const zoomWindowWidth = containerRect.width * 1.30;
    const zoomWindowHeight = containerRect.height * 1.0;

    this.lensWidth = zoomWindowWidth / zoomRatio;
    this.lensHeight = zoomWindowHeight / zoomRatio;

    // Calculate Mouse Position relative to image
    let x = event.clientX - containerRect.left;
    let y = event.clientY - containerRect.top;

    // Center lens on mouse
    let lensX = x - (this.lensWidth / 2);
    let lensY = y - (this.lensHeight / 2);

    // Boundary checks (Keep lens inside container)
    if (lensX > containerRect.width - this.lensWidth) lensX = containerRect.width - this.lensWidth;
    if (lensX < 0) lensX = 0;
    if (lensY > containerRect.height - this.lensHeight) lensY = containerRect.height - this.lensHeight;
    if (lensY < 0) lensY = 0;

    // Update Lens Position
    this.lensLeft = lensX;
    this.lensTop = lensY;

    // Calculate Zoom Window Background Position
    // We need to move the background image in the opposite direction magnified by ratio

    // Pixel based approach is robust:
    const finalBgX = lensX * zoomRatio;
    const finalBgY = lensY * zoomRatio;

    this.zoomBackgroundPosition = `-${finalBgX}px -${finalBgY}px`;
    this.zoomBackgroundSize = `${containerRect.width * zoomRatio}px ${containerRect.height * zoomRatio}px`;
  }

  // 360 View Methods
  selectImage(index: number) {
    this.selectedImageIndex = index;
    this.selectedImage = this.allProductImages[index];
  }

  onImageHoverEnter(event: MouseEvent) {
    this.isHovering = true;
    this.lastMouseX = event.clientX;
    this.startImageAutoScroll();
  }

  onImageHoverLeave() {
    this.isHovering = false;
    this.stopImageAutoScroll();
  }

  startImageAutoScroll() {
    if (this.imageAutoScrollInterval) {
      clearInterval(this.imageAutoScrollInterval);
    }

    this.imageAutoScrollInterval = setInterval(() => {
      if (this.isHovering && this.allProductImages.length > 1) {
        this.nextImage();
      }
    }, this.imageScrollSpeed);
  }

  stopImageAutoScroll() {
    if (this.imageAutoScrollInterval) {
      clearInterval(this.imageAutoScrollInterval);
      this.imageAutoScrollInterval = null;
    }
  }

  nextImage() {
    if (this.allProductImages.length <= 1) return;
    this.selectedImageIndex = (this.selectedImageIndex + 1) % this.allProductImages.length;
    this.selectedImage = this.allProductImages[this.selectedImageIndex];
  }

  previousImage() {
    if (this.allProductImages.length <= 1) return;
    this.selectedImageIndex = (this.selectedImageIndex - 1 + this.allProductImages.length) % this.allProductImages.length;
    this.selectedImage = this.allProductImages[this.selectedImageIndex];
  }



  /**
   * Open lightbox/modal gallery
   */
  openLightbox(imageIndex: number = 0) {
    this.showLightbox = true;
    this.lightboxImageIndex = imageIndex;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close lightbox
   */
  closeLightbox() {
    this.showLightbox = false;
    document.body.style.overflow = 'auto';
  }

  /**
   * Navigate lightbox images
   */
  lightboxNextImage() {
    if (this.lightboxImageIndex < this.allProductImages.length - 1) {
      this.lightboxImageIndex++;
    }
  }

  lightboxPrevImage() {
    if (this.lightboxImageIndex > 0) {
      this.lightboxImageIndex--;
    }
  }

  /**
   * Handle keyboard navigation in lightbox
   */
  onLightboxKeydown(event: KeyboardEvent) {
    if (!this.showLightbox) return;

    switch (event.key) {
      case 'ArrowRight':
        this.lightboxNextImage();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.lightboxPrevImage();
        event.preventDefault();
        break;
      case 'Escape':
        this.closeLightbox();
        event.preventDefault();
        break;
    }
  }

  goBack() {
    this.navigationHistory.goBack();
  }

  editProduct() {
    if (this.product?.id) {
      this.router.navigate(['/admin/products/edit'], { queryParams: { id: this.product.id } });
    }
  }
}
