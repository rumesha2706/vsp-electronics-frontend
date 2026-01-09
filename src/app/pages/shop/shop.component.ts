import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BackendProductService } from '../../services/backend-product.service';
import { BrandsService, Brand } from '../../services/brands.service';
import { ProductService } from '../../services/product.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="shop-container">
      <!-- Categories Section -->
      <div class="categories-section" *ngIf="categories.length > 0">
        <h2 class="section-title">Categories</h2>
        <div class="categories-grid">
          <div 
            class="category-card" 
            *ngFor="let category of categories; trackBy: trackByCategory"
            (click)="navigateToCategory(category)"
            role="button"
            tabindex="0"
            (keydown.enter)="navigateToCategory(category)">
            <div class="category-image-wrapper">
              <img 
                [src]="category.image" 
                [alt]="category.name"
                class="category-image"
                (error)="onImageError($event)" />
            </div>
            <div class="category-info">
              <h3 class="category-name">{{ category.name }}</h3>
              <p class="category-count">{{ getProductCountForCategory(category.name) }} products</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Shop Header -->
      <div class="shop-header">
        <div class="header-content">
          <h1>{{ searchQuery ? 'Search Results: "' + searchQuery + '"' : (selectedBrand ? 'Brand: ' + formatBrandName(selectedBrand) : 'Shop Products') }}</h1>
          <p class="header-subtitle">{{ filteredProducts.length }} products available</p>
          
          <!-- Back/Clear Filters Button -->
          <button *ngIf="selectedBrand || searchQuery" 
            (click)="clearFilters()" 
            class="btn-clear-filters">
            <i class="fas fa-times-circle"></i> Clear Filters & Show All
          </button>
        </div>

        <div class="shop-filters">
          <div class="filter-group">
            <label for="brand-select">Filter by Brand:</label>
            <select 
              id="brand-select"
              [(ngModel)]="selectedBrand" 
              (change)="onBrandChange()"
              class="brand-select">
              <option value="">All Brands</option>
              <option *ngFor="let brand of allBrands$ | async as brands; let last = last" 
                [value]="brand.slug">
                {{ brand.name }}
              </option>
            </select>
          </div>

          <div class="sort-group">
            <label for="sort-select">Sort by:</label>
            <select 
              id="sort-select"
              [(ngModel)]="sortBy" 
              (change)="onSortChange()"
              class="sort-select">
              <option value="name">Name (A-Z)</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="price-high">Price (High to Low)</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div class="view-count">
            Showing <strong>{{ filteredProducts.length }}</strong> results
          </div>
        </div>
      </div>

      <div class="shop-content">
        <div class="products-grid" [class.loading]="isLoading">
          <div class="product-card" 
            *ngFor="let product of filteredProducts; trackBy: trackByProductId"
            (click)="navigateToProduct(product)"
            role="button"
            tabindex="0"
            (keydown.enter)="navigateToProduct(product)">
            <div class="product-image-wrapper">
              <img 
                [src]="product.image" 
                [alt]="product.name"
                class="product-image"
                (error)="onImageError($event)" />
              <div class="product-badges">
                <span class="badge-new" *ngIf="product.isNew">New</span>
                <span class="badge-hot" *ngIf="product.isHot">Hot</span>
              </div>
            </div>
            
            <div class="product-info">
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-category">{{ product.category }}</p>
              
              <div class="product-rating" *ngIf="product.rating">
                <span class="stars">★ {{ product.rating.toFixed(1) }}</span>
              </div>

              <p class="product-description">{{ product.description | slice:0:80 }}...</p>

            <div class="product-footer">
                <div class="price-section">
                  <span class="price">₹{{ product.price }}</span>
                  <span class="original-price" *ngIf="product.originalPrice">
                    ₹{{ product.originalPrice }}
                  </span>
                </div>
                <div class="button-group">
                  <button 
                    class="btn-add-cart"
                    [class.out-of-stock]="!product.inStock"
                    [disabled]="!product.inStock"
                    (click)="addToCart($event, product)">
                    {{ product.inStock ? 'Add to Cart' : 'Out of Stock' }}
                  </button>
                  <button 
                    *ngIf="isAdmin"
                    class="btn-edit"
                    (click)="editProduct($event, product)"
                    title="Edit Product">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="no-products" *ngIf="filteredProducts.length === 0 && !isLoading">
          <div class="empty-state">
            <p class="empty-title">No products found</p>
            <p class="empty-message">Try adjusting your filters or search criteria</p>
          </div>
        </div>

        <div class="loading-spinner" *ngIf="isLoading">
          <div class="spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: #f9f9f9;
    }

    .shop-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Categories Section */
    .categories-section {
      background: white;
      padding: 30px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .section-title {
      font-size: 24px;
      margin: 0 0 20px 0;
      color: #333;
      font-weight: 600;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }

    .category-card {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      text-align: center;
      user-select: none;
    }

    .category-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      border-color: #2196F3;
    }

    .category-card:focus {
      outline: 2px solid #2196F3;
      outline-offset: 2px;
    }

    .category-image-wrapper {
      position: relative;
      width: 100%;
      height: 150px;
      background: #f5f5f5;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .category-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .category-card:hover .category-image {
      transform: scale(1.05);
    }

    .category-info {
      padding: 15px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .category-name {
      font-size: 14px;
      margin: 0 0 5px 0;
      color: #333;
      font-weight: 500;
      line-height: 1.3;
    }

    .category-count {
      font-size: 12px;
      color: #999;
      margin: 0;
    }

    /* Shop Header and Filters */
    .shop-header {
      background: white;
      padding: 30px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .header-content {
      margin-bottom: 20px;
    }

    .shop-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #333;
      font-weight: 600;
    }

    .header-subtitle {
      font-size: 14px;
      color: #999;
      margin: 0;
    }

    .btn-clear-filters {
      margin-top: 10px;
      padding: 8px 16px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.3s;
    }

    .btn-clear-filters:hover {
      background-color: #d32f2f;
    }

    .shop-filters {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .filter-group, .sort-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-group label, .sort-group label {
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }

    .brand-select, .sort-select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background: white;
      color: #333;
      transition: border-color 0.3s;
    }

    .brand-select:hover, .sort-select:hover {
      border-color: #999;
    }

    .brand-select:focus, .sort-select:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .view-count {
      margin-left: auto;
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .view-count strong {
      color: #2196F3;
    }

    .shop-content {
      position: relative;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .products-grid.loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .product-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      height: 100%;
      cursor: pointer;
      user-select: none;
    }

    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      border-color: #2196F3;
    }

    .product-card:focus {
      outline: 2px solid #2196F3;
      outline-offset: 2px;
    }

    .product-image-wrapper {
      position: relative;
      width: 100%;
      height: 220px;
      background: #f5f5f5;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-card:hover .product-image {
      transform: scale(1.05);
    }

    .product-badges {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 5px;
    }

    .badge-new, .badge-hot {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-new {
      background: #4CAF50;
      color: white;
    }

    .badge-hot {
      background: #FF5722;
      color: white;
    }

    .product-info {
      padding: 15px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .product-name {
      font-size: 15px;
      margin: 0 0 5px 0;
      color: #333;
      line-height: 1.4;
      font-weight: 500;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-category {
      font-size: 12px;
      color: #999;
      margin: 0 0 8px 0;
      text-transform: capitalize;
    }

    .product-rating {
      font-size: 13px;
      margin-bottom: 8px;
    }

    .stars {
      color: #FFC107;
      font-weight: 500;
    }

    .product-description {
      font-size: 12px;
      color: #888;
      margin: 0 0 12px 0;
      flex-grow: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      gap: 8px;
    }

    .price-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .price {
      font-size: 18px;
      font-weight: 700;
      color: #2196F3;
    }

    .original-price {
      font-size: 12px;
      color: #999;
      text-decoration: line-through;
    }

    .button-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-add-cart {
      padding: 8px 14px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.3s;
      white-space: nowrap;
      flex: 1;
    }

    .btn-add-cart:hover:not(:disabled) {
      background: #1976D2;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }

    .btn-add-cart:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-add-cart.out-of-stock {
      background: #ccc;
      color: #666;
    }

    .btn-edit {
      padding: 8px 10px;
      background: #FF9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-edit:hover {
      background: #F57C00;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
    }

    .no-products, .loading-spinner {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state {
      color: #999;
    }

    .empty-title {
      font-size: 24px;
      margin: 0 0 10px 0;
      color: #666;
      font-weight: 500;
    }

    .empty-message {
      font-size: 14px;
      color: #999;
      margin: 0;
    }

    .loading-spinner {
      position: relative;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top-color: #2196F3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-spinner p {
      color: #999;
      font-size: 14px;
      margin: 0;
    }

    @media (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
      }

      .categories-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 15px;
      }

      .shop-filters {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
      }

      .filter-group, .sort-group {
        width: 100%;
      }

      .brand-select, .sort-select {
        width: 100%;
      }

      .view-count {
        margin-left: 0;
      }
    }
  `]
})
export class ShopComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  allBrands$ = this.brandsService.brands$;
  selectedBrand: string = '';
  searchQuery: string = '';
  sortBy: string = 'name';
  isLoading = false;
  isAdmin = false;

  private destroy$ = new Subject<void>();

  constructor(
    private backendService: BackendProductService,
    private brandsService: BrandsService,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    this.isAdmin = userRole === 'admin';

    // Load categories
    this.loadCategories();

    // Subscribe to query params for brand filtering
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        // Handle Brand
        if (params['brand']) {
          this.selectedBrand = params['brand'];
        } else {
          this.selectedBrand = '';
        }

        // Handle Search
        if (params['search']) {
          this.searchQuery = params['search'];
        } else {
          this.searchQuery = '';
        }

        // Load products from API with filters
        this.loadProducts();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.isLoading = true;

    // Build params for API call
    const apiParams: any = { limit: 1000 };
    if (this.selectedBrand) {
      apiParams.brand = this.selectedBrand;
    }
    if (this.searchQuery) {
      apiParams.search = this.searchQuery;
    }

    this.backendService.getProducts(apiParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const data = response.data || response;
          console.log('ShopComponent received products:', data);
          if (Array.isArray(data)) {
            this.products = data;
            this.filterAndSort();
          } else {
            console.warn('ShopComponent received invalid data format:', data);
            this.products = [];
            this.filteredProducts = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.products = [];
          this.filteredProducts = [];
          this.isLoading = false;
        }
      });
  }

  onBrandChange() {
    if (this.selectedBrand) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { brand: this.selectedBrand },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { brand: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  clearFilters() {
    this.selectedBrand = '';
    this.searchQuery = '';
    this.router.navigate(['/shop']);
  }

  formatBrandName(slug: string): string {
    if (!slug) return '';
    // Capitalize first letter of each word and replace hyphens
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }



  // Sort based on selection
  onSortChange() {
    this.filterAndSort();
  }

  filterAndSort() {
    let result = [...this.products];
    // Sort based on selection
    switch (this.sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'newest':
        result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        break;
      case 'name':
      default:
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    this.filteredProducts = result;
  }

  trackByProductId(index: number, product: Product): string {
    return product.id || index.toString();
  }

  trackByCategory(index: number, category: Category): string {
    return category.id || index.toString();
  }

  loadCategories() {
    try {
      // Get categories from ProductService (in-memory data)
      const allCategories = this.productService.getCategories();
      // Filter to show main categories with product counts
      this.categories = allCategories.slice(0, 6); // Show first 6 categories
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    }
  }

  getProductCountForCategory(categoryName: string): number {
    // Count products in this category
    return this.products.filter(p =>
      p.category && p.category.toLowerCase() === categoryName.toLowerCase()
    ).length;
  }



  onImageError(event: any) {
    event.target.src = 'assets/images/placeholder.png';
  }

  navigateToProduct(product: Product): void {
    if (product.id) {
      this.router.navigate(['/product', product.id]);
    }
  }

  editProduct(event: Event, product: Product): void {
    event.stopPropagation();
    if (product.id) {
      this.router.navigate(['/admin/products/edit'], { queryParams: { id: product.id } });
    }
  }

  navigateToCategory(category: Category): void {
    if (category.slug) {
      this.router.navigate(['/category', category.slug]);
    }
  }

  addToCart(event: Event, product: Product): void {
    event.stopPropagation();
    if (product.inStock) {
      console.log('Adding to cart:', product.name);
      // Add to cart logic here
    }
  }
}
