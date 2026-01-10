import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendProductService } from '../../../services/backend-product.service';
import { SubcategoryService } from '../../../services/subcategory.service';
import { Product } from '../../../models/product.model';

@Component({
    selector: 'app-admin-category-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-category-details.component.html',
    styleUrls: ['./admin-category-details.component.css']
})
export class AdminCategoryDetailsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    private backendService = inject(BackendProductService);
    private subcategoryService = inject(SubcategoryService);

    categorySlug = '';
    category: any = null;
    products: Product[] = [];
    subcategories: any[] = [];

    loading = true;
    error = '';
    activeTab: 'products' | 'subcategories' = 'products';

    // Modal states
    showProductModal = false;
    showSubcategoryModal = false;

    selectedProduct: Product | null = null;
    selectedSubcategory: any | null = null;

    // Forms
    productForm: Partial<Product> = {};
    subcategoryForm: any = {};

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.categorySlug = params['slug'];
            if (this.categorySlug) {
                this.loadCategoryDetails();
            }
        });
    }

    goBack() {
        this.location.back();
    }

    loadCategoryDetails() {
        this.loading = true;
        this.backendService.getCategoryBySlug(this.categorySlug).subscribe({
            next: (data) => {
                this.category = data;
                this.loadProducts();
                this.loadSubcategories();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading category:', err);
                this.error = 'Category not found';
                this.loading = false;
            }
        });
    }

    // loadProducts moved below to handle filtering

    loadSubcategories() {
        if (!this.categorySlug) return;
        this.subcategoryService.getSubcategoriesBySlug(this.categorySlug).subscribe({
            next: (data) => {
                this.subcategories = data || [];
            }
        });
    }

    // --- Product Actions ---

    openProductModal(product?: Product) {
        if (product) {
            this.selectedProduct = product;
            this.productForm = { ...product };

            // If product has subcategory (name), find its slug to pre-select dropdown
            if (this.productForm.subcategory) {
                const matchingSub = this.subcategories.find(s =>
                    s.name === this.productForm.subcategory || s.slug === this.productForm.subcategory
                );
                if (matchingSub) {
                    this.productForm.subcategory = matchingSub.slug;
                }
            }
        } else {
            this.selectedProduct = null;
            this.productForm = {
                name: '',
                brand: '',
                price: 0,
                image: '',
                description: '',
                inStock: true,
                category: this.category.name // Pre-fill category
            };
        }
        this.showProductModal = true;
    }

    saveProduct() {
        if (!this.productForm.name || !this.productForm.price) return;

        const payload: any = {
            ...this.productForm,
            category: this.category.name // Ensure category is strictly set
        };

        if (this.selectedProduct) {
            this.backendService.updateProduct(this.selectedProduct.id, payload).subscribe(() => {
                this.loadProducts();
                this.closeModals();
            });
        } else {
            // Find max ID logic if not using DB auto-increment (fallback)
            // ideally backend handles ID
            this.backendService.createProduct(payload).subscribe(() => {
                this.loadProducts();
                this.closeModals();
            });
        }
    }

    // --- Product Actions ---

    // Filter state
    activeSubcategoryFilter: string | null = null;

    filterBySubcategory(sub: any) {
        this.activeSubcategoryFilter = sub.slug;
        this.activeTab = 'products';
        this.loadProducts();
    }

    clearSubcategoryFilter() {
        this.activeSubcategoryFilter = null;
        this.loadProducts();
    }

    loadProducts() {
        if (!this.category) return;

        const params: any = {
            category: this.category.name,
            limit: 1000
        };

        if (this.activeSubcategoryFilter) {
            // Find the name associated with the slug if needed, or pass slug if backend supports it
            // Assuming backend supports filtering by subcategory slug or we pass the name
            const sub = this.subcategories.find(s => s.slug === this.activeSubcategoryFilter);
            if (sub) {
                params.subcategory = sub.slug; // backend-product.service uses this param
            }
        }

        this.backendService.getProducts(params).subscribe({
            next: (res) => {
                this.products = res.data || [];
            }
        });
    }

    deleteProduct(product: Product) {
        if (confirm('Delete this product?')) {
            this.backendService.deleteProduct(product.id).subscribe(() => this.loadProducts());
        }
    }

    // --- Subcategory Actions ---

    openSubcategoryModal(sub?: any) {
        if (sub) {
            this.selectedSubcategory = sub;
            this.subcategoryForm = { ...sub };
        } else {
            this.selectedSubcategory = null;
            this.subcategoryForm = { name: '' };
        }
        this.showSubcategoryModal = true;
    }

    saveSubcategory() {
        if (!this.subcategoryForm.name) return;

        // Ensure category_id is set
        const payload = {
            ...this.subcategoryForm,
            category_id: this.category.id
        };

        if (this.selectedSubcategory) {
            this.subcategoryService.updateSubcategory(this.selectedSubcategory.id, payload).subscribe({
                next: () => {
                    this.loadSubcategories();
                    this.closeModals();
                },
                error: (err) => alert('Failed to update subcategory')
            });
        } else {
            this.subcategoryService.createSubcategory(payload).subscribe({
                next: () => {
                    this.loadSubcategories();
                    this.closeModals();
                },
                error: (err) => alert('Failed to create subcategory')
            });
        }
    }

    deleteSubcategory(sub: any) {
        if (confirm(`Are you sure you want to delete "${sub.name}"?`)) {
            this.subcategoryService.deleteSubcategory(sub.id).subscribe({
                next: () => this.loadSubcategories(),
                error: (err) => alert('Failed to delete subcategory')
            });
        }
    }

    closeModals() {
        this.showProductModal = false;
        this.showSubcategoryModal = false;
    }

    // Placeholder for category edit
    openCategoryEditModal() {
        alert('Edit category feature coming soon (use main list for now)');
    }
}
