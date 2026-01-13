import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { PaginationService, PaginationState } from '../../services/pagination.service';
import { Product, Category } from '../../models/product.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent, AuthModalComponent, PaginationComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private paginationService = inject(PaginationService);
  
  showAuthModal = false;
  authModalMessage = '';
  authModalTab: 'login' | 'signup' = 'login';

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  categoryName: string = '';
  categoryDescription: string = '';
  currentCategory: Category | undefined;
  categories: Category[] = [];
  categoriesForBrand: Category[] = [];
  sortBy: string = 'default';
  searchTerm: string = '';
  brandFilter: string = '';
  brandDisplayName: string = '';
  showCategories: boolean = false;
  // Show products as tiles (image cards) instead of list/grid on category pages
  showProductTiles: boolean = true;
  
  // Pagination
  itemsPerPage: number = 12;
  paginationState: PaginationState | null = null;
  pageNumbers: number[] = [];
  
  Math = Math;

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }

  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }

  onLoginRequired(message: string) {
    this.authModalMessage = message;
    this.authModalTab = 'login';
    this.showAuthModal = true;
  }

  closeAuthModal() {
    this.showAuthModal = false;
    this.authModalMessage = '';
  }

  ngOnInit() {
    // Combine both params and queryParams to handle both category and brand filters
    combineLatest([
      this.route.params,
      this.route.queryParams
    ]).subscribe(([params, queryParams]) => {
      const category = params['category'];
      this.brandFilter = queryParams['brand'] || '';
      this.loadProducts(category);
    });
  }

  private loadProducts(category?: string) {
    let newProducts: Product[] = [];
    
    if (category) {
      // Decode URL encoded category (e.g., raspberry%2Frpi-accessories)
      const decodedCategory = decodeURIComponent(category);
      
      // Handle subcategories
      if (decodedCategory.includes('/')) {
        const parts = decodedCategory.split('/');
        const mainCategory = parts[0].replace(/-/g, ' ');
        const subCategory = parts.slice(1).join('/').replace(/-/g, ' ');
        this.categoryName = `${mainCategory} / ${subCategory}`.toUpperCase();
      } else {
        this.categoryName = decodedCategory.replace(/-/g, ' ').toUpperCase();
      }
      
      this.currentCategory = this.productService.getCategoryBySlug(decodedCategory);
      this.categoryDescription = this.currentCategory?.description || '';
      newProducts = this.productService.getProductsByCategory(decodedCategory);
      this.showCategories = false;
    } else {
      // On /shop page
      this.showCategories = true;
      
      // If brand filter is active, limit categories and show brand products
      if (this.brandFilter) {
        // Format brand display name
        this.brandDisplayName = this.brandFilter.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ').toUpperCase();
        this.categoryName = this.brandDisplayName;
        
        // Load all products for filtering
        newProducts = this.productService.getProducts();
        
        // Show all categories except the last 4 (BMS, Shield Accessories, Wheels, Wireless Modules)
        const allCategories = this.productService.getCategories();
        const excludeIds = ['15', '16', '17', '18'];
        this.categories = allCategories.filter(cat => cat.productCount && cat.productCount > 0 && !excludeIds.includes(cat.id));
      } else {
        // Show all categories except the last 4 (BMS, Shield Accessories, Wheels, Wireless Modules)
        const allCategories = this.productService.getCategories();
        const excludeIds = ['15', '16', '17', '18'];
        this.categories = allCategories.filter(cat => cat.productCount && cat.productCount > 0 && !excludeIds.includes(cat.id));
        this.categoryName = 'Shop';
        this.categoryDescription = '';
        this.products = [];
        this.filteredProducts = [];
        return;
      }
    }
    
    // Only update if products changed
    if (JSON.stringify(this.products.map(p => p.id)) !== JSON.stringify(newProducts.map(p => p.id))) {
      this.products = newProducts;
      this.applyFilters();
    }
  }

  private applyFilters() {
    let filtered = [...this.products];
    
    // Apply brand filter if set
    if (this.brandFilter) {
      const normalizedFilter = this.brandFilter.toLowerCase().replace(/-/g, ' ');
      filtered = filtered.filter(p => 
        p.brand.toLowerCase().replace(/-/g, ' ') === normalizedFilter
      );
      
      // Extract unique categories for this brand
      const uniqueCategories = new Map<string, Category>();
      filtered.forEach(product => {
        const categoryName = product.category;
        if (categoryName && !uniqueCategories.has(categoryName)) {
          const cat = this.productService.getCategories().find(c => 
            c.name.toLowerCase().replace(/-/g, ' ') === categoryName.toLowerCase().replace(/-/g, ' ')
          );
          if (cat) {
            uniqueCategories.set(categoryName, cat);
          }
        }
      });
      this.categoriesForBrand = Array.from(uniqueCategories.values());
    }
    
    // Apply search filter if set
    if (this.searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(this.searchTerm) ||
        p.brand.toLowerCase().includes(this.searchTerm) ||
        (p.description && p.description.toLowerCase().includes(this.searchTerm))
      );
    }
    
    this.filteredProducts = filtered;
    this.applySorting();
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortBy = select.value;
    this.applySorting();
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase();
    this.applyFilters();
  }

  applySorting() {
    // Sort the already filtered products
    const sortedProducts = [...this.filteredProducts];
    switch (this.sortBy) {
      case 'price-low':
        sortedProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sortedProducts.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    this.filteredProducts = sortedProducts;
    this.updatePagination();
  }

  updatePagination() {
    // Calculate pagination using service
    this.paginationState = this.paginationService.calculatePagination(
      this.filteredProducts.length,
      this.itemsPerPage
    );
    this.pageNumbers = this.paginationService.getPageNumbers();
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts() {
    if (this.paginationState) {
      const startIndex = (this.paginationState.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      this.displayedProducts = this.filteredProducts.slice(startIndex, endIndex);
    }
  }

  onPageChanged(page: number) {
    this.paginationService.setCurrentPage(page);
    const state = this.paginationService.getCurrentState();
    this.paginationState = state;
    this.pageNumbers = this.paginationService.getPageNumbers();
    this.updateDisplayedProducts();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToPage(page: number) {
    this.onPageChanged(page);
  }

  getProductCountForCategory(categoryName: string): number {
    return this.filteredProducts.filter(p => p.category === categoryName).length;
  }

  setView(view: 'tiles' | 'list') {
    this.showProductTiles = view === 'tiles';
  }

  getCategoryDisplayName(): string {
    const categoryMap: { [key: string]: string } = {
      'raspberry': 'Raspberry Pi Boards',
      'raspberry/rpi-accessories': 'RPI Accessories',
      'robotic-diy-kits': 'Robotic DIY Kits',
      'ready-running-projects': 'Ready Running Projects',
      'mini-drone-kits': 'Mini Drone Kits',
      'diy-kits': 'DIY Kits',
      'bonka': 'Bonka Batteries',
      'drone-transmiter-receiver': 'Drone Transmitter and Receiver',
      'agriculture-drone-parts': 'Agriculture Drone Parts'
    };
    
    const slug = decodeURIComponent(this.route.snapshot.params['category'] || '');
    return categoryMap[slug] || this.currentCategory?.name || this.categoryName || 'All Products';
  }
}
