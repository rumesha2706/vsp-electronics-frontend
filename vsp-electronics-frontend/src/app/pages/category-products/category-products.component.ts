import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BackendProductService } from '../../services/backend-product.service';
import { SubcategoryService } from '../../services/subcategory.service';
import { Product } from '../../models/product.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { SubcategoryNavComponent } from '../../components/subcategory-nav/subcategory-nav.component';
import { SubcategoryCardComponent } from '../../components/subcategory-card/subcategory-card.component';

interface Subcategory {
  name: string;
  slug: string;
  count: number;
  image?: string;
}

@Component({
  selector: 'app-category-products',
  templateUrl: './category-products.component.html',
  styleUrls: ['./category-products.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent, SubcategoryNavComponent, SubcategoryCardComponent]
})
export class CategoryProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  error: string | null = null;
  categoryName = '';
  subcategoryName = '';
  categorySlug = '';
  subcategorySlug = '';

  // Subcategories
  subcategories: Subcategory[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 12;
  totalProducts = 0;
  hasMorePages = false;

  // Filtering
  selectedBrand = '';
  brands: string[] = [];
  searchTerm = '';

  constructor(
    private backendProductService: BackendProductService,
    private subcategoryService: SubcategoryService,
    private route: ActivatedRoute
  ) { }



  ngOnInit() {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      const subcategorySlug = params['subcategorySlug'];

      this.categorySlug = slug;
      this.subcategorySlug = subcategorySlug || '';

      // Set initial loading state
      this.loading = true;

      // 1. Fetch proper category details first to get the correct name from DB
      this.backendProductService.getCategoryBySlug(slug).subscribe({
        next: (category) => {
          if (category) {
            console.log('Category details found:', category);
            this.categoryName = category.name;

            // 2. Load subcategories
            this.loadSubcategories(slug);

            // 3. Resolve subcategory name if slug exists
            if (this.subcategorySlug) {
              this.resolveSubcategoryName(category.id, this.subcategorySlug);
            } else {
              this.subcategoryName = '';
              // 4. Load products with correct category name
              this.loadProducts();
            }
          } else {
            console.error('Category not found for slug:', slug);
            this.error = 'Category not found';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching category details:', err);
          // Fallback to slug-to-title if API fails
          this.categoryName = this.slugToTitle(slug);
          this.subcategoryName = subcategorySlug ? this.slugToTitle(subcategorySlug) : '';
          this.loadSubcategories(slug);
          this.loadProducts();
        }
      });
    });
  }

  resolveSubcategoryName(categoryId: number, slug: string) {
    // We need to find the subcategory name that matches the slug
    // We can use the subcategory service or just list from category details if available
    this.subcategoryService.getSubcategoriesBySlug(this.categorySlug).subscribe(subs => {
      const sub = subs.find(s => s.slug === slug);
      if (sub) {
        this.subcategoryName = sub.name;
      } else {
        this.subcategoryName = this.slugToTitle(slug);
      }
      this.loadProducts();
    });
  }

  /**
   * Load subcategories for this category
   */
  loadSubcategories(slug?: string) {
    const categorySlug = slug || this.categorySlug;
    console.log(`Loading subcategories for slug: ${categorySlug}`);

    this.subcategoryService.getSubcategoriesBySlug(categorySlug)
      .subscribe(
        (data: any[]) => {
          console.log('Subcategories loaded successfully:', data);
          console.log(`Number of subcategories: ${data ? data.length : 0}`);
          this.subcategories = data || [];

          // Log the condition check
          console.log(`Conditions - subcategorySlug: "${this.subcategorySlug}", subcategories.length: ${this.subcategories.length}`);
          console.log(`Will display subcategories: ${!this.subcategorySlug && this.subcategories.length > 0}`);
        },
        (error: any) => {
          console.error('Error loading subcategories:', error);
          this.subcategories = [];
        }
      );
  }

  /**
   * Load products from API
   */
  loadProducts() {
    this.loading = true;
    this.error = null;

    const offset = (this.currentPage - 1) * this.pageSize;

    // Build query parameters
    const queryParams: any = {
      category: this.categoryName,
      limit: this.pageSize,
      offset: offset
    };

    // Add subcategory filter only if a specific subcategory is selected
    // Pass the slug (e.g., 'rpi-accessories') to match DB values and API expectations
    // Otherwise, the API will return all products in the category (both with and without subcategories)
    // Add subcategory filter only if a specific subcategory is selected
    // Pass the slug (e.g., 'rpi-accessories') to match DB values and API expectations
    // Otherwise, the API will return all products in the category (both with and without subcategories)
    if (this.subcategorySlug) {
      queryParams.subcategory = this.subcategorySlug;
    } else if (this.subcategoryName) {
      queryParams.subcategory = this.subcategoryName;
    }

    if (this.selectedBrand) {
      queryParams.brand = this.selectedBrand;
    }

    if (this.searchTerm) {
      queryParams.search = this.searchTerm;
    }

    console.log('Loading products with params:', queryParams);

    this.backendProductService.getProducts(queryParams)
      .subscribe(
        (response) => {
          console.log('Products loaded successfully:', response);
          this.products = response.data || [];
          this.totalProducts = response.pagination?.total || 0;
          this.hasMorePages = response.pagination?.hasMore || false;

          // Extract unique brands
          this.extractBrands();

          this.loading = false;
        },
        (error) => {
          console.error('Error loading products:', error);
          this.error = `Failed to load products: ${error.statusText || error.message || 'Unknown error'}. Please try again.`;
          this.loading = false;
        }
      );
  }

  /**
   * Extract unique brands from products
   */
  extractBrands() {
    const brandSet = new Set(this.products.map(p => p.brand));
    this.brands = Array.from(brandSet).sort();
  }

  /**
   * Handle pagination
   */
  goToPage(page: number) {
    if (page >= 1 && page <= Math.ceil(this.totalProducts / this.pageSize)) {
      this.currentPage = page;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasMorePages) {
      this.currentPage++;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Filter by brand
   */
  filterByBrand(brand: string) {
    this.selectedBrand = brand;
    this.currentPage = 1;
    this.loadProducts();
  }

  /**
   * Clear filters
   */
  clearFilters() {
    this.selectedBrand = '';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadProducts();
  }

  /**
   * Search products
   */
  search() {
    this.currentPage = 1;
    this.loadProducts();
  }

  /**
   * Convert slug to title (e.g., "robotic-diy-kits" -> "Robotic DIY Kits")
   */
  slugToTitle(slug: string): string {
    const titleCase = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Handle acronyms like DIY, RPi, etc
    const acronyms: { [key: string]: string } = {
      'Diy': 'DIY',
      'Rpi': 'RPi',
      'Iot': 'IoT',
      'Led': 'LED',
      'Usb': 'USB'
    };

    let result = titleCase;
    for (const [key, value] of Object.entries(acronyms)) {
      result = result.replace(key, value);
    }

    console.log('Converted slug:', slug, 'to:', result);
    return result;
  }

  /**
   * Get pagination array
   */
  get pages(): number[] {
    const totalPages = Math.ceil(this.totalProducts / this.pageSize);
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalProducts / this.pageSize);
  }
}
