/**
 * Product Data Service
 * Loads product data from database instead of hardcoded TypeScript files
 * This service replaces the multiple data-*.ts files in src/app/data/
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  categorySlug?: string;
  brand: string;
  rating: number;
  inStock: boolean;
  isHot: boolean;
  isNew: boolean;
  image: string;
  aboutProduct?: string;
  description?: string;
}

export interface CategoryData {
  name: string;
  slug: string;
  productCount: number;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductDataService {
  private apiUrl = '/api/products';
  private cacheDuration = 3600000; // 1 hour
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(private http: HttpClient) {}

  /**
   * Get all products by category
   * @param categorySlug Category slug to filter products
   * @param page Pagination page
   * @param limit Items per page
   */
  getProductsByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Observable<{ products: Product[]; total: number }> {
    const cacheKey = `products_${categorySlug}_${page}_${limit}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<{ products: Product[]; total: number }>(
        `${this.apiUrl}?category=${categorySlug}&page=${page}&limit=${limit}`
      )
      .pipe(
        map(response => {
          this.setCache(cacheKey, response);
          return response;
        }),
        catchError(error => {
          console.error('Error fetching products by category:', error);
          return throwError(() => new Error('Failed to load products'));
        })
      );
  }

  /**
   * Get products by multiple categories
   * @param categoryIds Array of category IDs
   */
  getProductsByCategories(categoryIds: string[]): Observable<Product[]> {
    const cacheKey = `products_multi_${categoryIds.join('_')}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    const params = new URLSearchParams();
    categoryIds.forEach(id => params.append('categories', id));

    return this.http
      .get<Product[]>(`${this.apiUrl}?${params.toString()}`)
      .pipe(
        map(products => {
          this.setCache(cacheKey, products);
          return products;
        }),
        catchError(error => {
          console.error('Error fetching products by categories:', error);
          return throwError(() => new Error('Failed to load products'));
        })
      );
  }

  /**
   * Get all products for import (admin only)
   */
  getAllProducts(): Observable<Product[]> {
    const cacheKey = 'products_all';
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<Product[]>(`${this.apiUrl}/all`)
      .pipe(
        map(products => {
          this.setCache(cacheKey, products);
          return products;
        }),
        catchError(error => {
          console.error('Error fetching all products:', error);
          return throwError(() => new Error('Failed to load products'));
        })
      );
  }

  /**
   * Get category import configuration
   */
  getCategoryImports(): Observable<CategoryData[]> {
    const cacheKey = 'category_imports';
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<CategoryData[]>(`/api/config/categories/imports`)
      .pipe(
        map(categories => {
          this.setCache(cacheKey, categories);
          return categories;
        }),
        catchError(error => {
          console.error('Error fetching category imports:', error);
          return throwError(() => new Error('Failed to load category imports'));
        })
      );
  }

  /**
   * Import products from data (admin only)
   * @param products Array of products to import
   */
  importProducts(products: Product[]): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/bulk-import`, { products })
      .pipe(
        map(response => {
          this.clearCache();
          return response;
        }),
        catchError(error => {
          console.error('Error importing products:', error);
          return throwError(() => new Error('Failed to import products'));
        })
      );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < this.cacheDuration;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
