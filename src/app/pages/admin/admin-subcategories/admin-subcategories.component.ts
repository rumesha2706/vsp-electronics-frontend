import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BackendProductService } from '../../../services/backend-product.service';
import { environment } from '../../../../environments/environment';

interface Subcategory {
  id?: number;
  name: string;
  slug?: string;
  category_id: number;
  description?: string;
  image_url?: string;
  display_order?: number;
  product_url?: string;
}

interface Category {
  id: number;
  name: string;
}

@Component({
  selector: 'app-admin-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-subcategories.component.html',
  styleUrls: ['./admin-subcategories.component.css']
})
export class AdminSubcategoriesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}`;

  subcategories: Subcategory[] = [];
  categories: Category[] = [];
  showForm = false;
  editingId: number | null = null;
  loading = false;
  error = '';
  success = '';
  selectedFile: File | null = null;

  formData: Subcategory = {
    name: '',
    category_id: 0,
    description: '',
    image_url: '',
    display_order: 0
  };

  ngOnInit() {
    this.loadCategories();
    this.loadSubcategories();
  }

  goBack() {
    if (this.selectedSubcategory) {
      this.closeSubcategoryProducts();
    } else {
      this.router.navigate(['/admin']);
    }
  }

  loadCategories() {
    this.http.get<any>(`${this.apiUrl}/categories`)
      .subscribe(
        (response) => {
          this.categories = Array.isArray(response) ? response : response.data || [];
        },
        (error) => {
          this.error = 'Failed to load categories';
        }
      );
  }

  loadSubcategories() {
    this.loading = true;
    // Fetch categories with details (includes subcategories)
    this.http.get<any>(`${this.apiUrl}/categories?includeDetails=true`)
      .subscribe(
        (response) => {
          console.log('Categories API Response:', response);
          const categories = Array.isArray(response) ? response : response.data || [];
          const allSubcategories: Subcategory[] = [];

          // Aggregate subcategories from all categories
          categories.forEach((cat: any) => {
            if (cat.subcategories && Array.isArray(cat.subcategories)) {
              cat.subcategories.forEach((subcat: any) => {
                allSubcategories.push({
                  ...subcat,
                  category_id: cat.id
                });
              });
            }
          });

          console.log('Final Subcategories Array:', allSubcategories);
          this.subcategories = allSubcategories;
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to load subcategories';
          console.error('Error loading subcategories:', error);
          this.loading = false;
        }
      );
  }

  openForm(subcategory?: Subcategory) {
    if (subcategory) {
      this.editingId = subcategory.id || null;
      this.formData = { ...subcategory };
    } else {
      this.editingId = null;
      this.formData = {
        name: '',
        category_id: 0,
        description: '',
        image_url: '',
        display_order: 0
      };
    }
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  closeForm() {
    this.showForm = false;
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async saveSubcategory() {
    if (!this.formData.name || this.formData.category_id === 0) {
      this.error = 'Subcategory name and category are required';
      return;
    }

    this.loading = true;

    try {
      // Upload image if selected
      if (this.selectedFile) {
        const imageUrl = await this.uploadImage(this.selectedFile);
        this.formData.image_url = imageUrl;
      }

      // Convert field names to match backend API expectations
      const payload = {
        category_id: this.formData.category_id,
        name: this.formData.name,
        slug: this.formData.slug || this.slugify(this.formData.name),
        description: this.formData.description,
        imageUrl: this.formData.image_url,
        displayOrder: this.formData.display_order
      };

      console.log('Saving subcategory with payload:', payload);

      const categoryId = this.formData.category_id;
      const url = this.editingId
        ? `${this.apiUrl}/categories/admin/${categoryId}/subcategories/${this.editingId}`
        : `${this.apiUrl}/categories/admin/${categoryId}/subcategories/create`;

      const method = this.editingId ? 'PUT' : 'POST';

      this.http.request(method, url, { body: payload })
        .subscribe(
          (response: any) => {
            console.log('Save response:', response);
            this.success = this.editingId ? 'Subcategory updated successfully' : 'Subcategory created successfully';
            this.loadSubcategories();
            this.closeForm();
            this.loading = false;
          },
          (error) => {
            console.error('Save error:', error);
            this.error = error.error?.error || 'Failed to save subcategory';
            this.loading = false;
          }
        );
    } catch (err: any) {
      this.error = err.message || 'Failed to upload image';
      this.loading = false;
    }
  }

  deleteSubcategory(id?: number, categoryId?: number) {
    if (!id || !categoryId || !confirm('Are you sure you want to delete this subcategory?')) {
      return;
    }

    this.loading = true;
    this.http.delete(`${this.apiUrl}/categories/admin/${categoryId}/subcategories/${id}`)
      .subscribe(
        () => {
          this.success = 'Subcategory deleted successfully';
          this.loadSubcategories();
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to delete subcategory';
          this.loading = false;
        }
      );
  }

  getCategoryName(categoryId: number): string {
    const cat = this.categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await this.http.post<any>(
            `${this.apiUrl}/upload/image`,
            { base64Data: base64Data, type: 'subcategory' }
          ).toPromise();

          console.log('Upload response:', response);
          const uploadedUrl = response?.imageUrl || base64Data;
          console.log('Uploaded image URL:', uploadedUrl);
          resolve(uploadedUrl);
        } catch (err) {
          console.error('Upload error:', err);
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  }
  // Products State
  products: any[] = [];
  selectedSubcategory: Subcategory | null = null;
  showProductModal = false;
  selectedProduct: any | null = null;
  productForm: any = {};

  // Inject BackendProductService
  private backendService = inject(BackendProductService);

  // ... (previous methods)

  // --- Subcategory Product View Logic ---

  viewSubcategoryProducts(sub: Subcategory) {
    this.selectedSubcategory = sub;
    this.loadProducts(sub.slug || this.slugify(sub.name)); // Fallback to slugify if slug missing
  }

  closeSubcategoryProducts() {
    this.selectedSubcategory = null;
    this.products = [];
  }

  loadProducts(subcategorySlug: string) {
    this.loading = true;
    this.backendService.getProducts({ subcategory: subcategorySlug, limit: 1000 }).subscribe({
      next: (res) => {
        this.products = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.error = 'Failed to load products';
        this.loading = false;
      }
    });
  }

  // --- Product CRUD ---

  openProductModal(product?: any) {
    if (product) {
      this.selectedProduct = product;
      this.productForm = { ...product };
    } else {
      const activeCategoryName = this.getCategoryName(this.selectedSubcategory?.category_id || 0);

      this.selectedProduct = null;
      this.productForm = {
        name: '',
        brand: '',
        price: 0,
        image: '',
        description: '',
        inStock: true,
        category: activeCategoryName, // Pre-fill category name
        subcategory: this.selectedSubcategory?.slug // Pre-fill subcategory slug
      };
    }
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
  }

  saveProduct() {
    if (!this.productForm.name || !this.productForm.price) return;

    const payload: any = { ...this.productForm };

    if (this.selectedProduct) {
      this.backendService.updateProduct(this.selectedProduct.id, payload).subscribe(() => {
        if (this.selectedSubcategory) {
          const slug = this.selectedSubcategory.slug || this.slugify(this.selectedSubcategory.name);
          this.loadProducts(slug);
        }
        this.closeProductModal();
      });
    } else {
      this.backendService.createProduct(payload).subscribe(() => {
        if (this.selectedSubcategory) {
          const slug = this.selectedSubcategory.slug || this.slugify(this.selectedSubcategory.name);
          this.loadProducts(slug);
        }
        this.closeProductModal();
      });
    }
  }

  deleteProduct(product: any) {
    if (confirm('Delete this product?')) {
      this.backendService.deleteProduct(product.id).subscribe(() => {
        if (this.selectedSubcategory) {
          const slug = this.selectedSubcategory.slug || this.slugify(this.selectedSubcategory.name);
          this.loadProducts(slug);
        }
      });
    }
  }
}
