import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
// import { ProductImageManagerComponent } from '../../../components/product-image-manager/product-image-manager.component';

interface Product {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  price?: number;
  image?: string;
  images?: string[];
  in_stock?: boolean;
  stock_count?: number;
  is_hot?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  rating?: number;
  product_url?: string;
  metadata?: any;
}

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

@Component({
  selector: 'app-admin-product-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-product-edit.component.html',
  styleUrls: ['./admin-product-edit.component.css']
})
export class AdminProductEditComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiUrl = `${environment.apiUrl}`;

  product: Product = {
    name: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    price: 0,
    image: '',
    images: [],
    in_stock: true,
    stock_count: 0,
    is_hot: false,
    is_new: false,
    is_featured: false,
    rating: 0
  };

  categories: Category[] = [];
  subcategories: Subcategory[] = [];
  brands: Brand[] = [];

  loading = false;
  error = '';
  success = '';
  editingId: number | null = null;
  selectedFiles: File[] = [];
  showForm = false;
  uploadMode: 'file' | 'url' = 'file';
  infoUrlList: string[] = [''];

  ngOnInit() {
    // Load categories, brands, and subcategories
    this.loadCategories();
    this.loadBrands();

    // Check if we're editing an existing product
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.editingId = parseInt(params['id']);
        this.loadProduct(this.editingId);
        this.showForm = true;
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  loadCategories() {
    this.http.get<any>(`${this.apiUrl}/categories?includeDetails=true`)
      .subscribe({
        next: (response) => {
          this.categories = response;
        },
        error: (err) => {
          console.error('Error loading categories:', err);
        }
      });
  }

  loadBrands() {
    this.http.get<any>(`${this.apiUrl}/brands`)
      .subscribe({
        next: (response) => {
          const data = response.brands || response.data || [];
          this.brands = data;
        },
        error: (err) => {
          console.error('Error loading brands:', err);
        }
      });
  }

  loadSubcategories() {
    if (!this.product.category) {
      this.subcategories = [];
      return;
    }

    this.http.get<any>(`${this.apiUrl}/categories?includeDetails=true`)
      .subscribe({
        next: (response) => {
          const categories = response;
          const selectedCat = categories.find((c: any) => c.name === this.product.category);
          this.subcategories = selectedCat?.subcategories || [];
        },
        error: (err) => {
          console.error('Error loading subcategories:', err);
        }
      });
  }

  loadProduct(id: number) {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/products/${id}`)
      .subscribe({
        next: (response) => {
          const productData = response.data || response;
          this.product = {
            ...productData,
            images: productData.images || (productData.image ? [productData.image] : [])
          };
          this.loading = false;
          this.loadSubcategories();
        },
        error: (err) => {
          this.error = 'Failed to load product';
          console.error('Error loading product:', err);
          this.loading = false;
        }
      });
  }

  onCategoryChange() {
    this.product.subcategory = '';
    this.loadSubcategories();
  }

  onFilesSelected(event: any) {
    this.selectedFiles = Array.from(event.target.files);
  }

  addUrlInput() {
    this.infoUrlList.push('');
  }

  removeUrlInput(index: number) {
    this.infoUrlList.splice(index, 1);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  async downloadImagesFromUrls(): Promise<string[]> {
    const validUrls = this.infoUrlList.filter(url => url && url.trim().length > 0);
    const uploadedUrls: string[] = [];

    for (const url of validUrls) {
      try {
        const response = await this.http.post<any>(
          `${this.apiUrl}/upload/image`,
          { imageUrl: url, type: 'product' }
        ).toPromise();

        if (response?.imageUrl) {
          uploadedUrls.push(response.imageUrl);
        }
      } catch (err) {
        console.error('Error downloading image from URL:', url, err);
      }
    }
    return uploadedUrls;
  }

  async uploadImages(): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of this.selectedFiles) {
      try {
        const reader = new FileReader();
        const url = await new Promise<string>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64Data = reader.result as string;
              const response = await this.http.post<any>(
                `${this.apiUrl}/upload/image`,
                { base64Data: base64Data, type: 'product' }
              ).toPromise();

              resolve(response?.imageUrl || base64Data);
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsDataURL(file);
        });
        uploadedUrls.push(url);
      } catch (err) {
        console.error('Error uploading image:', err);
      }
    }

    return uploadedUrls;
  }

  async saveProduct() {
    if (!this.product.name || !this.product.category) {
      this.error = 'Product name and category are required';
      return;
    }

    this.loading = true;

    try {
      let newImageUrls: string[] = [];

      // Handle File Uploads
      if (this.uploadMode === 'file' && this.selectedFiles.length > 0) {
        newImageUrls = await this.uploadImages();
      }
      // Handle URL Uploads
      else if (this.uploadMode === 'url') {
        newImageUrls = await this.downloadImagesFromUrls();
      }

      // Add new images to existing ones
      if (newImageUrls.length > 0) {
        this.product.images = [...(this.product.images || []), ...newImageUrls];
      }

      const payload = {
        name: this.product.name,
        slug: this.product.slug || this.slugify(this.product.name),
        description: this.product.description,
        category: this.product.category,
        subcategory: this.product.subcategory,
        brand: this.product.brand,
        price: this.product.price,
        image: this.product.images?.[0] || this.product.image, // Use first image as main
        in_stock: this.product.in_stock,
        stock_count: this.product.stock_count,
        is_hot: this.product.is_hot,
        is_new: this.product.is_new,
        is_featured: this.product.is_featured,
        rating: this.product.rating,
        product_url: this.product.product_url,
        metadata: {
          ...this.product.metadata,
          images: this.product.images
        }
      };

      const url = this.editingId
        ? `${this.apiUrl}/products/${this.editingId}`
        : `${this.apiUrl}/products`;

      const method = this.editingId ? 'PUT' : 'POST';

      this.http.request(method, url, {
        body: payload,
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (response: any) => {
          this.success = this.editingId ? 'Product updated successfully' : 'Product created successfully';
          this.selectedFiles = [];
          this.loading = false;

          // Get product ID for redirection
          const productData = response.data || response;
          const validId = this.editingId || productData.id || productData.productId;

          setTimeout(() => {
            if (validId) {
              // Navigate to product detail page
              this.router.navigate(['/product', validId]);
            } else {
              // Fallback to shop if no ID found
              this.router.navigate(['/shop']);
            }
          }, 1500);
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to save product';
          this.loading = false;
        }
      });
    } catch (err: any) {
      this.error = err.message || 'Failed to save product';
      this.loading = false;
    }
  }

  closeForm() {
    this.showForm = false;
    this.selectedFiles = [];
  }

  removeImage(index: number) {
    if (this.product.images) {
      this.product.images.splice(index, 1);
    }
  }

  goBack() {
    this.router.navigate(['/shop']);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  onStockCountChange() {
    if (this.product.stock_count === 0) {
      this.product.in_stock = false;
    } else if (this.product.stock_count && this.product.stock_count > 0) {
      // Optional: Auto-check in_stock if count > 0?
      // For now let's just safe guard the 0 case
    }
  }
}
