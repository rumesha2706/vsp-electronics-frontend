import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { BackendProductService } from '../../services/backend-product.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private backendService = inject(BackendProductService);
  private router = inject(Router);
  private location = inject(Location);

  products: Product[] = [];
  categories: Category[] = [];
  brands: any[] = [];
  filteredProducts: Product[] = [];
  
  showAddModal = false;
  showEditModal = false;
  selectedProduct: Product | null = null;
  
  // Form data
  productForm: Partial<Product> = {
    name: '',
    brand: 'ACEBOTT',
    category: '',
    price: 0,
    originalPrice: 0,
    image: '',
    inStock: true,
    isHot: false,
    description: '',
    aboutProduct: ''
  };

  // Filters
  searchTerm = '';
  selectedCategory = '';
  selectedBrand = '';

  successMessage = '';
  errorMessage = '';

  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  imageUploadMode: 'file' | 'url' = 'file';
  imageUrlInput: string = '';

  ngOnInit() {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadData();
  }

  loadData() {
    this.products = this.productService.getAllProducts();
    this.categories = this.productService.getAllCategories();
    this.brands = this.productService.getBrands();
    this.filteredProducts = [...this.products];
  }

  goBack() {
    this.location.back();
  }

  filterProducts() {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = !this.searchTerm || 
        product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.id.toString().includes(this.searchTerm);
      
      const matchesCategory = !this.selectedCategory || 
        product.category.toLowerCase() === this.selectedCategory.toLowerCase();
      
      const matchesBrand = !this.selectedBrand || 
        product.brand.toLowerCase() === this.selectedBrand.toLowerCase();

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }

  getSubcategories() {
    const category = this.categories.find(c => c.slug === this.productForm.category);
    return category?.subcategories || [];
  }

  openAddModal() {
    this.productForm = {
      name: '',
      brand: 'ACEBOTT',
      category: '',
      subcategory: '',
      price: 0,
      originalPrice: 0,
      image: '',
      inStock: true,
      isHot: false,
      description: '',
      aboutProduct: ''
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.imageUrlInput = '';
    this.imageUploadMode = 'file';
    this.showAddModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(product: Product) {
    this.selectedProduct = product;
    this.productForm = { ...product };
    
    // Convert category display name to slug for dropdown
    const categoryMatch = this.categories.find(c => 
      c.name.toLowerCase() === product.category.toLowerCase() ||
      c.slug === product.category
    );
    if (categoryMatch) {
      this.productForm.category = categoryMatch.slug;
    }
    
    // Set image preview if product has an image
    if (product.image) {
      this.imagePreview = product.image;
      this.imageUrlInput = product.image;
      // Determine mode based on whether it's a local asset or external URL
      if (product.image.startsWith('assets/') || product.image.startsWith('/assets/')) {
        this.imageUploadMode = 'file';
      } else {
        this.imageUploadMode = 'url';
      }
    }
    
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.selectedProduct = null;
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.imageUrlInput = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  addProduct() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      return;
    }

    try {
      // Convert category slug to category name
      const categoryObj = this.categories.find(c => c.slug === this.productForm.category);
      const categoryName = categoryObj ? categoryObj.name : (this.productForm.category || '');
      
      // Generate new product ID
      const maxId = Math.max(...this.products.map(p => parseInt(p.id as string)), 0);
      const newProduct: Product = {
        ...this.productForm as Product,
        id: (maxId + 1).toString(),
        category: categoryName, // Use category name, not slug
        rating: 5,
        isNew: false
      };

      // Call backend API to add product
      this.backendService.createProduct(newProduct).subscribe(
        (response) => {
          console.log('Product created successfully:', response);
          
          // Update local products list
          this.products.push(response.data || newProduct);
          this.filteredProducts = [...this.products];
          
          this.successMessage = 'Product added successfully!';
          setTimeout(() => {
            this.closeModals();
            this.filterProducts();
          }, 1500);
        },
        (error) => {
          console.error('Error adding product:', error);
          this.errorMessage = error.error?.error || 'Failed to add product. Please try again.';
        }
      );
    } catch (error) {
      console.error('Error adding product:', error);
      this.errorMessage = 'Failed to add product. Please try again.';
    }
  }

  updateProduct() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm() || !this.selectedProduct) {
      return;
    }

    try {
      // Convert category slug to category name
      const categoryObj = this.categories.find(c => c.slug === this.productForm.category);
      const categoryName = categoryObj ? categoryObj.name : (this.productForm.category || '');
      
      // Prepare the product data for API
      const updatedProductData = {
        ...this.productForm as Product,
        id: this.selectedProduct.id,
        category: categoryName // Use category name, not slug
      };

      // Call backend API to update product
      this.backendService.updateProduct(this.selectedProduct.id, updatedProductData).subscribe(
        (response) => {
          console.log('Product updated successfully:', response);
          
          // Update local products list
          const index = this.products.findIndex(p => p.id === this.selectedProduct!.id);
          if (index !== -1) {
            this.products[index] = updatedProductData;
            this.filteredProducts = [...this.products];
          }
          
          this.successMessage = 'Product updated successfully!';
          setTimeout(() => {
            this.closeModals();
            this.filterProducts();
          }, 1500);
        },
        (error) => {
          console.error('Error updating product:', error);
          this.errorMessage = error.error?.error || 'Failed to update product. Please try again.';
        }
      );
    } catch (error) {
      console.error('Error updating product:', error);
      this.errorMessage = 'Failed to update product. Please try again.';
    }
  }

  deleteProduct(product: Product) {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.backendService.deleteProduct(product.id as string).subscribe(
        (response) => {
          console.log('Product deleted successfully:', response);
          this.products = this.products.filter(p => p.id !== product.id);
          this.filteredProducts = [...this.products];
          this.successMessage = 'Product deleted successfully!';
          setTimeout(() => {
            this.successMessage = '';
          }, 2000);
        },
        (error) => {
          console.error('Error deleting product:', error);
          this.errorMessage = error.error?.error || 'Failed to delete product. Please try again.';
        }
      );
    }
  }

  validateForm(): boolean {
    if (!this.productForm.name || !this.productForm.category) {
      this.errorMessage = 'Product name and category are required';
      return false;
    }

    if (!this.productForm.price || this.productForm.price <= 0) {
      this.errorMessage = 'Valid price is required';
      return false;
    }

    return true;
  }

  toggleStock(product: Product) {
    const index = this.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      const updatedProduct = {
        ...this.products[index],
        inStock: !this.products[index].inStock
      };
      
      this.backendService.updateProduct(product.id as string, updatedProduct).subscribe(
        (response) => {
          this.products[index] = updatedProduct;
          this.filteredProducts = [...this.products];
        },
        (error) => {
          console.error('Error toggling stock:', error);
        }
      );
    }
  }

  toggleHot(product: Product) {
    const index = this.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      const updatedProduct = {
        ...this.products[index],
        isHot: !this.products[index].isHot
      };
      
      this.backendService.updateProduct(product.id as string, updatedProduct).subscribe(
        (response) => {
          this.products[index] = updatedProduct;
          this.filteredProducts = [...this.products];
        },
        (error) => {
          console.error('Error toggling hot:', error);
        }
      );
    }
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImageFile = input.files[0];
      console.log('File selected:', this.selectedImageFile.name, 'Size:', this.selectedImageFile.size);
      
      // Validate file type
      if (!this.selectedImageFile.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file';
        this.selectedImageFile = null;
        return;
      }

      // Validate file size (max 5MB)
      if (this.selectedImageFile.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size should be less than 5MB';
        this.selectedImageFile = null;
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        // Store base64 image directly so it works immediately
        this.productForm.image = e.target?.result as string;
        console.log('Image loaded, base64 length:', this.productForm.image?.length);
      };
      reader.readAsDataURL(this.selectedImageFile);
      
      this.errorMessage = '';
    }
  }

  clearImage() {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.imageUrlInput = '';
    this.productForm.image = '';
  }

  switchImageMode(mode: 'file' | 'url') {
    this.imageUploadMode = mode;
    this.clearImage();
  }

  onImageUrlInput() {
    if (!this.imageUrlInput || !this.imageUrlInput.trim()) {
      this.errorMessage = 'Please enter a valid image URL';
      return;
    }

    // Validate URL format
    try {
      new URL(this.imageUrlInput);
    } catch {
      this.errorMessage = 'Please enter a valid URL';
      return;
    }

    // Set preview
    this.imagePreview = this.imageUrlInput;
    this.errorMessage = '';

    // Automatically download and save the image if we have product details
    if (this.productForm.name && this.productForm.category) {
      this.downloadAndSaveImage();
    }
  }

  async downloadAndSaveImage() {
    try {
      if (!this.productForm.name || !this.productForm.category || !this.imageUrlInput) {
        return;
      }

      // Get category name from slug
      const categoryObj = this.categories.find(c => c.slug === this.productForm.category);
      const categoryName = categoryObj ? categoryObj.name : this.productForm.category;

      // Call API to download and save image
      const response = await fetch('/api/products/download-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: this.imageUrlInput,
          productName: this.productForm.name,
          category: categoryName
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Use the local path instead of the URL
        this.productForm.image = result.imagePath;
        this.imagePreview = result.imagePath;
        this.successMessage = `✅ Image saved as: ${this.productForm.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        console.log('Image downloaded and saved successfully', result.imagePath);
      } else {
        console.warn('Failed to download image:', result.error);
        // Keep the URL as fallback
        this.productForm.image = this.imageUrlInput;
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      // Keep the URL as fallback
      this.productForm.image = this.imageUrlInput;
    }
  }

  resetToDefaults() {
    if (confirm('This will reset all products to the default data from the code. Are you sure?')) {
      const success = this.productService.resetToDefaultProducts();
      if (success) {
        alert('Products reset successfully! The page will reload.');
        window.location.reload();
      } else {
        alert('Failed to reset products. Please try again.');
      }
    }
  }
}
