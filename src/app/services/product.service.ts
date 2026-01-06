import { Injectable, signal } from '@angular/core';
import { Product, Category, Brand } from '../models/product.model';
import { BackendProductService } from './backend-product.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private defaultProducts: Product[] = [
    // All product data has been cleared for fresh data import on 2025-12-31
    // Categories remain intact for new products to be loaded
  ];

  private products = signal<Product[]>([]);

  constructor(private backend: BackendProductService) {
    // Clear old cached categories that might have subcategories
    localStorage.removeItem('drone_shop_products');
    localStorage.removeItem('drone_shop_categories');
    
    // Load products from localStorage if available
    const savedProducts = localStorage.getItem('drone_shop_products');
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        this.products.set(parsed);
        // Don't return here - continue to fetch fresh data in background
      } catch (error) {
        console.error('Error loading products from localStorage:', error);
      }
    }

    // If no local data, attempt to fetch from backend API (fallback)
    this.backend.getProducts({ limit: 1000 }).subscribe({
      next: (res) => {
        const list = res.data || res;
        if (Array.isArray(list) && list.length > 0) {
          this.products.set(list);
          localStorage.setItem('drone_shop_products', JSON.stringify(list));
          console.log(`✅ Loaded ${list.length} products from backend into ProductService`);
        } else {
          // No data from backend, keep defaults (empty) so UI shows empty state
          this.products.set(this.defaultProducts);
        }
      },
      error: (err) => {
        console.warn('Could not load products from backend:', err?.message || err);
        this.products.set(this.defaultProducts);
      }
    });
  }

  private categories = signal<Category[]>([
    { id: '1', name: '3D printers parts', slug: '3d-printers-parts', image: 'assets/images/categories/3d-printers.jpg', productCount: 46 },
    { id: '2', name: 'AC MOTOR', slug: 'ac-motor', image: 'assets/images/categories/ac-motor.jpg', productCount: 2 },
    { 
      id: '3', 
      name: 'Accessories', 
      slug: 'accessories', 
      image: 'assets/images/categories/accessories.jpg', 
      productCount: 169,
      subcategories: [
        { 
          id: '3-1', 
          name: 'Connectors', 
          slug: 'connectors', 
          productCount: 18,
          image: '/assets/images/products/amass-xt90-male-female-connector.jpg'
        },
        { 
          id: '3-2', 
          name: 'DIP Converters', 
          slug: 'dip-converters', 
          productCount: 3,
          image: '/assets/images/products/type-c-to-dip-converter.jpg'
        },
        { 
          id: '3-3', 
          name: 'IOT', 
          slug: 'iot', 
          productCount: 2,
          image: '/assets/images/products/arduino-uno-kit-akx00037.jpg'
        },
        { 
          id: '3-4', 
          name: 'Keypad', 
          slug: 'keypad', 
          productCount: 6,
          image: '/assets/images/products/4x4-matrix-membrane-keypad.jpg'
        },
        { 
          id: '3-5', 
          name: 'Silicone Wires', 
          slug: 'silicone-wires', 
          productCount: 18,
          image: '/assets/images/products/16-awg-silicone-wire-red.jpg'
        },
        { 
          id: '3-6', 
          name: 'Twezzers', 
          slug: 'twezzers', 
          productCount: 5,
          image: '/assets/images/products/anti-static-tweezers-6pcs-set.jpg'
        },
        { 
          id: '3-7', 
          name: 'USB Cables', 
          slug: 'usb', 
          productCount: 1,
          image: '/assets/images/products/cable-for-arduino-uno-mega-usb-a-to-b.jpg'
        }
      ]
    },
    { id: '4', name: 'Agriculture Drone Parts', slug: 'agriculture-drone-parts', image: 'assets/images/categories/agriculture-drone-parts.jpg', productCount: 31 },
    { id: '5', name: 'ANTENNA', slug: 'antenna', image: 'assets/images/categories/antenna.jpg', productCount: 69 },
    { id: '6', name: 'Audio Jack', slug: 'audio-jack', image: 'assets/images/categories/audio-jack.jpg', productCount: 24 },
    { 
      id: '7', 
      name: 'BATTERY', 
      slug: 'battery', 
      image: 'assets/images/categories/battery.jpg', 
      productCount: 41,
      subcategories: [
        { 
          id: '7-1', 
          name: 'Battery Holders', 
          slug: 'battery-holders', 
          productCount: 5,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '7-2', 
          name: 'Battery Chargers', 
          slug: 'battery-chargers', 
          productCount: 8,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '7-3', 
          name: 'LiPo Batteries', 
          slug: 'lipo-batteries', 
          productCount: 15,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '7-4', 
          name: 'Battery Connectors', 
          slug: 'battery-connectors', 
          productCount: 5,
          image: '/assets/images/products/placeholder.jpg'
        }
      ]
    },
    { id: '8', name: 'ROBOTIC DIY KITS', slug: 'robotic-diy-kits', image: 'assets/images/categories/robotic-kits.jpg', productCount: 14 },
    { id: '9', name: 'READY RUNNING PROJECTS', slug: 'ready-running-projects', image: 'assets/images/categories/ready-running-projects.jpg', productCount: 19 },
    { 
      id: '10', 
      name: 'Raspberry Pi Boards', 
      slug: 'raspberry', 
      image: 'assets/images/categories/raspberry.jpg', 
      productCount: 12,
      subcategories: [
        { 
          id: '10-1', 
          name: 'RPI Accessories', 
          slug: 'raspberry/rpi-accessories', 
          productCount: 50,
          image: '/assets/images/products/placeholder.jpg'
        }
      ]
    },
    { id: '11', name: 'MINI DRONE KITS ( BELOW 20CMS )', slug: 'mini-drone-kits', image: 'assets/images/categories/mini-drone-kits.jpg', productCount: 3 },
    { id: '12', name: 'DRONE TRANSMITER AND RECEIVER', slug: 'drone-transmiter-receiver', image: 'assets/images/categories/drone-transmiter.jpg', productCount: 16 },
    { 
      id: '13', 
      name: 'DIY KITS', 
      slug: 'diy-kits', 
      image: 'assets/images/categories/diy-kits.jpg', 
      productCount: 105,
      subcategories: [
        { 
          id: '13-1', 
          name: 'ACEBOTT', 
          slug: 'acebott-kits', 
          productCount: 14,
          image: '/assets/images/products/3in1-acebott-esp32-smart-home-lv1.jpg'
        },
        { 
          id: '13-2', 
          name: 'AM ROBOTICS', 
          slug: 'am-robotics-kits', 
          productCount: 26,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '13-3', 
          name: 'dbolo Kits', 
          slug: 'dbolo-kits', 
          productCount: 4,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '13-4', 
          name: 'JSB DIY KITS', 
          slug: 'jsb-diy-kits', 
          productCount: 15,
          image: '/assets/images/products/placeholder.jpg'
        },
        { 
          id: '13-5', 
          name: 'ROBOTIC DIY KITS', 
          slug: 'robotic-diy-kits', 
          productCount: 14,
          image: 'assets/images/categories/robotic-kits.jpg'
        },
        { 
          id: '13-6', 
          name: 'MINI DRONE KITS ( BELOW 20CMS )', 
          slug: 'mini-drone-kits', 
          productCount: 3,
          image: 'assets/images/categories/mini-drone-kits.jpg'
        }
      ]
    },
    { id: '14', name: 'Bonka Batteries', slug: 'bonka', image: 'assets/images/categories/bonka.jpg', productCount: 31 },
    { id: '15', name: 'BMS', slug: 'bms', image: 'assets/images/categories/battery.jpg', productCount: 25 },
    { id: '16', name: 'Shield Accessories', slug: 'shield-accessories', image: 'assets/images/categories/accessories.jpg', productCount: 33 },
    { id: '17', name: 'Wheels', slug: 'wheels', image: '/assets/images/categories/robotic-kits.jpg', productCount: 30 },
    { id: '18', name: 'Wireless Modules', slug: 'wireless-modules', image: 'assets/images/categories/antenna.jpg', productCount: 35 }
  ]);

  private brands = signal<Brand[]>([
    { id: '1', name: 'ACEBOTT', slug: 'acebott', image: 'assets/images/brands/LOGO.png' },
    { id: '2', name: 'Amass', slug: 'amass', image: 'assets/images/brands/Amass-1.jpg' },
    { id: '3', name: 'Arduino', slug: 'arduino', image: 'assets/images/brands/Arduino.png' },
    { id: '4', name: 'BONKA', slug: 'bonka', image: 'assets/images/brands/BONKA.png' },
    { id: '5', name: 'EFT', slug: 'eft', image: 'assets/images/brands/EFT-1.jpg' },
    { id: '6', name: 'Elcon', slug: 'elcon', image: 'assets/images/brands/Elcon-1-e1713075585301.jpg' },
    { id: '7', name: 'EMAX', slug: 'emax', image: 'assets/images/brands/EMAX-LOGO.png' },
    { id: '8', name: 'Hobbywing', slug: 'hobbywing', image: 'assets/images/brands/Hobbywing.png' },
    { id: '9', name: 'JIYI', slug: 'jiyi', image: 'assets/images/brands/LOGO.png' },
    { id: '10', name: 'Mastech', slug: 'mastech', image: 'assets/images/brands/Mastech-1.png' },
    { id: '11', name: 'Raspberry Pi', slug: 'raspberry-pi', image: 'assets/images/brands/pi.jpg' },
    { id: '12', name: 'SKYDROID', slug: 'skydroid', image: 'assets/images/brands/SKydroid.jpg' },
    { id: '13', name: 'SKYRC', slug: 'skyrc', image: 'assets/images/brands/SKYRC.png' },
    { id: '14', name: 'TATTU', slug: 'tattu', image: 'assets/images/brands/TATTU.jpg' }
  ]);

  getProducts() {
    return this.products();
  }

  getProductById(id: string) {
    return this.products().find((p: Product) => p.id === id);
  }

  getProductsByCategory(category: string) {
    // Handle subcategory paths like "raspberry/rpi-accessories", "accessories/connectors", or "diy-kits/robotic-diy-kits"
    if (category.includes('/')) {
      const parts = category.split('/');
      const mainCategory = parts[0];
      const subCategory = parts.slice(1).join('/');
      
      // Normalize for comparison
      const normalizedMainCategory = mainCategory.toLowerCase().replace(/-/g, ' ');
      const normalizedSubCategory = subCategory.toLowerCase().replace(/-/g, ' ');
      
      // Strip common suffixes like "kits" from the subcategory slug to match category/brand names
      let matchedSubCategory = normalizedSubCategory;
      if (matchedSubCategory.endsWith(' kits')) {
        matchedSubCategory = matchedSubCategory.replace(/ kits$/, '');
      }
      
      return this.products().filter((p: Product) => {
        const productCategory = p.category.toLowerCase().replace(/-/g, ' ');
        const productSubCategory = (p.subcategory || '').toLowerCase().replace(/-/g, ' ');
        const productBrand = p.brand.toLowerCase().replace(/-/g, ' ');
        
        // First, check if product's category matches the subcategory (for categories like "Robotic DIY Kits")
        const categoryMatchesSubCategory = productCategory === matchedSubCategory ||
                                          productCategory === normalizedSubCategory ||
                                          productCategory.includes(matchedSubCategory) ||
                                          productCategory.includes(normalizedSubCategory);
        
        if (categoryMatchesSubCategory) {
          return true;
        }
        
        // Otherwise, check if product is in the main category (e.g., DIY Kits)
        const isMainCategoryMatch = productCategory.includes(normalizedMainCategory);
        
        if (isMainCategoryMatch) {
          // If main category matches, check if brand or subcategory also matches
          return productBrand === normalizedSubCategory ||
                 productBrand === matchedSubCategory ||
                 productBrand.includes(matchedSubCategory) ||
                 productSubCategory === normalizedSubCategory ||
                 productSubCategory.includes(normalizedSubCategory);
        }
        
        return false;
      });
    }
    
    // Convert slug to match category name format
    const normalizedCategory = category.toLowerCase().replace(/-/g, ' ');
    return this.products().filter((p: Product) => 
      p.category.toLowerCase().replace(/-/g, ' ').includes(normalizedCategory)
    );
  }

  getCategories() {
    return this.categories();
  }

  getCategoryBySlug(slug: string): Category | undefined {
    // Handle subcategory path like 'diy-kits/acebott-kits'
    if (slug.includes('/')) {
      const parts = slug.split('/');
      const mainCategorySlug = parts[0];
      const subCategorySlug = parts.slice(1).join('/');
      
      const mainCategory = this.categories().find(cat => cat.slug === mainCategorySlug);
      if (mainCategory && mainCategory.subcategories) {
        // sub.slug might be stored as 'acebott-kits' or as a full path; check both formats
        const subcat = mainCategory.subcategories.find(sub => sub.slug === subCategorySlug || sub.slug === slug || `${mainCategorySlug}/${sub.slug}` === slug);
        if (subcat) {
          return {
            id: subcat.id,
            name: subcat.name,
            // Return the full path slug so router links are consistent (parent/sub)
            slug: `${mainCategorySlug}/${subcat.slug}`,
            image: subcat.image || mainCategory.image,
            productCount: subcat.productCount,
            description: ''
          };
        }
      }
    }

    // Check top-level category
    const top = this.categories().find(cat => cat.slug === slug);
    if (top) return top;

    // Support accessing subcategories by standalone slug (e.g., '/category/acebott-kits')
    for (const cat of this.categories()) {
      if (cat.subcategories) {
        const subcat = cat.subcategories.find(sub => sub.slug === slug || `${cat.slug}/${sub.slug}` === slug);
        if (subcat) {
          return {
            id: subcat.id,
            name: subcat.name,
            slug: `${cat.slug}/${subcat.slug}`,
            image: subcat.image || cat.image,
            productCount: subcat.productCount,
            description: ''
          };
        }
      }
    }

    return undefined;
  }

  getBrands() {
    return this.brands();
  }

  getFeaturedProducts() {
    return this.products().filter((p: Product) => p.isFeatured).slice(0, 10);
  }

  getNewProducts() {
    return this.products().filter((p: Product) => p.isNew).slice(0, 10);
  }

  getTopSellerProducts() {
    // Return products by rating as top sellers
    return this.products()
      .filter((p: Product) => p.rating && p.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  }

  getAllProducts(): Product[] {
    return this.products();
  }

  getAllCategories(): Category[] {
    return this.categories();
  }

  setProducts(products: Product[]) {
    try {
      this.products.set(products);
      // Also save to localStorage
      localStorage.setItem('drone_shop_products', JSON.stringify(products));
    } catch (error) {
      console.error('Error saving products:', error);
      throw error; // Re-throw so caller can handle it
    }
  }

  addProduct(product: any) {
    // This method calls the backend API to add a product
    // The actual API call is handled by the backend service
    return this.backend.createProduct(product);
  }

  resetToDefaultProducts() {
    try {
      // Clear localStorage
      localStorage.removeItem('drone_shop_products');
      // Reset to default products
      this.products.set(this.defaultProducts);
      // Save to localStorage
      localStorage.setItem('drone_shop_products', JSON.stringify(this.defaultProducts));
      return true;
    } catch (error) {
      console.error('Error resetting products:', error);
      return false;
    }
  }
}


