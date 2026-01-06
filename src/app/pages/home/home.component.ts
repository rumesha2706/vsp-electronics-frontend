import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product, Category, Brand } from '../../models/product.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { DroneCarouselComponent } from '../../components/drone-carousel/drone-carousel.component';
import { RecentlyViewedCarouselComponent } from '../../components/recently-viewed-carousel/recently-viewed-carousel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, AuthModalComponent, DroneCarouselComponent, RecentlyViewedCarouselComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  productService = inject(ProductService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);

  private http = inject(HttpClient);

  showAuthModal = false;
  authModalMessage = '';
  authModalTab: 'login' | 'signup' = 'login';

  featuredProducts: Product[] = [];
  newProducts: Product[] = [];
  topSellerProducts: Product[] = [];
  categories: Category[] = [];
  brands: Brand[] = [];
  featuredBrands: Brand[] = [];

  activeProductTab: 'featured' | 'new' | 'topSellers' = 'featured';
  displayedProducts: Product[] = [];
  showAllProducts = false;
  productsPerPage = 10;

  loading = false;
  error = '';
  brandsLoading = false;

  ngOnInit() {
    // Preload local data immediately to avoid blinking
    this.loadLocalData();
    // Then fetch fresh data from API
    this.loadData();
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

  loadData() {
    this.loading = true;
    this.error = '';

    // Fetch all home data from API
    this.http.get<any>('/api/home/all').subscribe({
      next: (response) => {
        // Process featured categories
        if (response.categories && Array.isArray(response.categories)) {
          this.categories = response.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            image: cat.image_url,
            productCount: cat.product_count,
            displayOrder: cat.display_order
          }));
        }

        // Process featured brands
        if (response.brands && Array.isArray(response.brands)) {
          this.featuredBrands = response.brands.map((brand: any) => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            image: brand.logo_url,
            website: brand.website_url,
            productCount: brand.product_count
          }));
        }

        // Process products
        if (response.featured && Array.isArray(response.featured)) {
          this.featuredProducts = response.featured;
        }
        if (response.new && Array.isArray(response.new)) {
          this.newProducts = response.new;
        }
        if (response.topSellers && Array.isArray(response.topSellers)) {
          this.topSellerProducts = response.topSellers;
        }

        this.updateDisplayedProducts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading home data:', error);
        this.error = 'Failed to load home page data';
        this.loading = false;

        // Check if we have any data to show, either from partial response or local backup
        if (this.featuredProducts.length === 0 && this.categories.length === 0) {
          this.loadLocalData();
        }
      }
    });
  }

  loadLocalData() {
    // Fallback to local product service
    this.featuredProducts = this.productService.getFeaturedProducts();
    this.newProducts = this.productService.getNewProducts();
    this.topSellerProducts = this.productService.getTopSellerProducts();

    const allCategories = this.productService.getCategories();

    const featuredCategorySlugs = [
      'robotic-diy-kits',
      'ready-running-projects',
      'raspberry',
      'mini-drone-kits',
      'drone-transmiter-receiver',
      'bonka',
      'agriculture-drone-parts',
      'diy-kits'
    ];

    this.categories = allCategories.filter(cat =>
      featuredCategorySlugs.includes(cat.slug)
    ).sort((a, b) => {
      return featuredCategorySlugs.indexOf(a.slug) - featuredCategorySlugs.indexOf(b.slug);
    });

    this.brands = this.productService.getBrands();

    const brandSlugs = ['acebott', 'amass', 'arduino', 'bonka', 'eft', 'elcon', 'emax', 'hobbywing', 'jiyi', 'mastech', 'raspberry-pi', 'skydroid', 'skyrc', 'tattu'];
    this.featuredBrands = this.brands.filter(b => brandSlugs.includes(b.slug));

    this.updateDisplayedProducts();
  }

  setProductTab(tab: 'featured' | 'new' | 'topSellers') {
    this.activeProductTab = tab;
    this.showAllProducts = false;
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts() {
    let allProducts: Product[] = [];

    switch (this.activeProductTab) {
      case 'featured':
        allProducts = this.featuredProducts;
        break;
      case 'new':
        allProducts = this.newProducts;
        break;
      case 'topSellers':
        allProducts = this.topSellerProducts;
        break;
    }

    if (this.showAllProducts) {
      this.displayedProducts = allProducts;
    } else {
      this.displayedProducts = allProducts.slice(0, this.productsPerPage);
    }
  }

  toggleShowAll() {
    this.showAllProducts = !this.showAllProducts;
    this.updateDisplayedProducts();
  }


}
