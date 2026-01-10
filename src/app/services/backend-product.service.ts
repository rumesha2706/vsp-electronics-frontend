import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {
    console.log('BackendProductService initialized with API URL:', this.apiUrl);
  }

  /**
   * Map API response fields (snake_case) to model fields (camelCase)
   */
  private mapProduct(apiProduct: any): Product {
    // Extract metadata if it exists
    const metadata = apiProduct.metadata || {};

    return {
      id: String(apiProduct.id),
      name: apiProduct.name,
      price: parseFloat(apiProduct.price) || 0,
      originalPrice: apiProduct.original_price ? parseFloat(apiProduct.original_price) : undefined,
      image: apiProduct.image,
      category: apiProduct.category,
      subcategory: apiProduct.subcategory,
      brand: apiProduct.brand,
      rating: parseFloat(apiProduct.rating) || 0,
      inStock: apiProduct.in_stock === true || apiProduct.in_stock === 'true',
      stockCount: apiProduct.stock_count ? parseInt(apiProduct.stock_count) : 0,
      isHot: apiProduct.is_hot === true || apiProduct.is_hot === 'true',
      isNew: apiProduct.is_new === true || apiProduct.is_new === 'true',
      isFeatured: apiProduct.is_featured === true || apiProduct.is_featured === 'true',
      description: apiProduct.description,
      aboutProduct: apiProduct.about_product || metadata.about_product,
      sku: apiProduct.sku,
      productUrl: apiProduct.product_url,
      packageIncludes: metadata.package_includes,
      specifications: metadata.specifications,
      features: metadata.features,
      images: apiProduct.images || metadata.images || []
    };
  }

  /**
   * Get all products with optional filters
   */
  getProducts(params?: {
    category?: string;
    subcategory?: string;
    brand?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.subcategory) httpParams = httpParams.set('subcategory', params.subcategory);
      if (params.brand) httpParams = httpParams.set('brand', params.brand);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());
    }

    console.log('Calling API:', this.apiUrl, 'with params:', params);
    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map(response => {
        // Map products from API format to model format
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.map((product: any) => this.mapProduct(product));
        }
        return response;
      })
    );
  }

  /**
   * Get a single product by ID
   */
  getProductById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        // Map product from API format to model format
        if (response.data) {
          response.data = this.mapProduct(response.data);
        }
        return response;
      })
    );
  }

  /**
   * Create a new product
   */
  createProduct(product: Partial<Product>): Observable<any> {
    return this.http.post<any>(this.apiUrl, product);
  }

  /**
   * Update an existing product
   */
  updateProduct(id: string, product: Partial<Product>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, product);
  }

  /**
   * Delete a product
   */
  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Bulk import products
   */
  bulkImportProducts(productsData: Partial<Product>[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk/import`, { productsData });
  }

  /**
   * Clear all products
   */
  clearAllProducts(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/clear`);
  }

  /**
   * Get product statistics
   */
  getProductStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/summary`);
  }

  /**
   * Search products
   */
  searchProducts(searchTerm: string): Observable<any> {
    return this.getProducts({ search: searchTerm });
  }

  /**
   * Filter products by category
   */
  filterByCategory(category: string): Observable<any> {
    return this.getProducts({ category });
  }

  /**
   * Filter products by brand
   */
  filterByBrand(brand: string): Observable<any> {
    return this.getProducts({ brand });
  }

  /**
   * Get all categories with details (subcategories, brands)
   */
  getCategoriesWithDetails(): Observable<any> {
    const url = `${environment.apiUrl}/categories`;
    return this.http.get<any>(url, { params: { includeDetails: 'true' } }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(cat => ({
            id: String(cat.id),
            name: cat.name,
            slug: cat.slug,
            image: cat.image_url || cat.image || 'assets/images/placeholder.jpg',
            productCount: cat.product_count || 0,
            description: cat.description,
            subcategories: cat.subcategories ? cat.subcategories.map((sub: any) => ({
              id: String(sub.id),
              name: sub.name,
              slug: sub.slug,
              productCount: sub.product_count || 0,
              image: sub.image_url || sub.image
            })) : []
          }));
        }
        return response;
      })
    );
  }
  /**
   * Get category by slug
   */
  getCategoryBySlug(slug: string): Observable<any> {
    const url = `${environment.apiUrl}/categories/slug/${slug}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }
}
