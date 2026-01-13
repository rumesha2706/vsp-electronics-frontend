import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-product-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-add.component.html',
  styleUrls: ['./product-add.component.css']
})
export class ProductAddComponent implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private location = inject(Location);

  categories: Category[] = [];
  brands: any[] = [];
  
  // Form data
  productForm: Partial<Product> = {
    name: '',
    brand: 'ACEBOTT',
    category: '',
    subcategory: '',
    price: 0,
    originalPrice: 0,
    image: '',
    inStock: true,
    isHot: false,
    isNew: false,
    isFeatured: false,
    description: '',
    aboutProduct: ''
  };

  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  imageUploadMode: 'file' | 'url' = 'file';
  imageUrlInput: string = '';

  successMessage = '';
  errorMessage = '';
  isSubmitting = false;

  ngOnInit() {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadData();
  }

  loadData() {
    this.categories = this.productService.getAllCategories();
    this.brands = this.productService.getBrands();
  }

  getSubcategories() {
    const category = this.categories.find(c => c.slug === this.productForm.category);
    return category?.subcategories || [];
  }

  onImageFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.productForm.image = this.imagePreview || '';
      };
      reader.readAsDataURL(file);
    }
  }

  onImageUrlChange() {
    if (this.imageUrlInput.trim()) {
      this.imagePreview = this.imageUrlInput;
      this.productForm.image = this.imageUrlInput;
    }
  }

  toggleImageMode(mode: 'file' | 'url') {
    this.imageUploadMode = mode;
    this.imagePreview = null;
    this.imageUrlInput = '';
    this.selectedImageFile = null;
    this.productForm.image = '';
  }

  saveProduct() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Get the category name from slug
      const categoryMatch = this.categories.find(c => c.slug === this.productForm.category);
      const categoryName = categoryMatch?.name || this.productForm.category;

      // Prepare product data for API
      const productData = {
        name: this.productForm.name,
        slug: this.productForm.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
        description: this.productForm.description,
        category: categoryName,
        subcategory: this.productForm.subcategory || null,
        brand: this.productForm.brand,
        price: this.productForm.price,
        image: this.productForm.image,
        inStock: this.productForm.inStock,
        isHot: this.productForm.isHot,
        isNew: this.productForm.isNew,
        isFeatured: this.productForm.isFeatured,
        rating: 0
      };

      // Send to API
      this.productService.addProduct(productData).subscribe({
        next: (response: any) => {
          this.successMessage = 'Product added successfully!';
          
          setTimeout(() => {
            this.router.navigate(['/admin/products']);
          }, 1500);
        },
        error: (error: any) => {
          console.error('Error adding product:', error);
          this.errorMessage = error.error?.error || 'Failed to add product';
          this.isSubmitting = false;
        }
      });
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to add product';
      this.isSubmitting = false;
    }
  }

  validateForm(): boolean {
    if (!this.productForm.name?.trim()) {
      this.errorMessage = 'Product name is required';
      return false;
    }
    if (!this.productForm.category) {
      this.errorMessage = 'Category is required';
      return false;
    }
    if (!this.productForm.price || this.productForm.price <= 0) {
      this.errorMessage = 'Price must be greater than 0';
      return false;
    }
    if (!this.productForm.image?.trim()) {
      this.errorMessage = 'Product image is required';
      return false;
    }
    if (!this.productForm.description?.trim()) {
      this.errorMessage = 'Product description is required';
      return false;
    }
    return true;
  }

  goBack() {
    this.location.back();
  }
}
