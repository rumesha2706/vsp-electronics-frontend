import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Subcategory {
  id?: number;
  name: string;
  slug: string;
  count?: number;
  image?: string;
  image_url?: string;
  category_id?: number;
  description?: string;
  display_order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubcategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;
  private productsApiUrl = `${environment.apiUrl}/products`;
  private subcategoriesCache = new Map<string, Observable<Subcategory[]>>();
  private categoryIdCache = new Map<string, number>();

  constructor(private http: HttpClient) {}

  /**
   * Clear the subcategories cache (useful for testing)
   */
  clearCache(): void {
    this.subcategoriesCache.clear();
    this.categoryIdCache.clear();
  }

  /**
   * Get all subcategories for a given category slug
   */
  getSubcategoriesBySlug(categorySlug: string): Observable<Subcategory[]> {
    if (!categorySlug) {
      return of([]);
    }

    // Check cache
    const cacheKey = `slug-${categorySlug}`;
    if (this.subcategoriesCache.has(cacheKey)) {
      return this.subcategoriesCache.get(cacheKey)!;
    }

    // First, get the category by slug to retrieve its ID
    const observable = this.http.get<any>(`${this.apiUrl}`)
      .pipe(
        switchMap(response => {
          // API returns array directly
          const categories = Array.isArray(response) ? response : (response.data || response.categories || []);
          
          console.log(`getSubcategoriesBySlug: Received ${categories.length} categories`);
          
          // Find category by slug
          const category = categories.find((c: any) => 
            c.slug === categorySlug || this.slugify(c.name) === categorySlug
          );
          
          if (!category) {
            console.warn(`Category not found with slug: ${categorySlug}`);
            return of([]);
          }

          console.log(`Found category: ${category.name} (ID: ${category.id})`);

          // Now fetch subcategories directly using the category ID
          return this.fetchSubcategoriesByIdDirect(category.id);
        }),
        catchError(error => {
          console.error(`Error fetching subcategories for slug ${categorySlug}:`, error);
          return of([]);
        }),
        shareReplay(1)
      );

    this.subcategoriesCache.set(cacheKey, observable);
    return observable;
  }

  /**
   * Get all subcategories for a given category (from subcategories table)
   */
  getSubcategoriesByCategory(categoryName: string): Observable<Subcategory[]> {
    if (!categoryName) {
      return of([]);
    }

    // Check cache
    if (this.subcategoriesCache.has(categoryName)) {
      return this.subcategoriesCache.get(categoryName)!;
    }

    // First, get category ID by slug
    const categorySlug = this.slugify(categoryName);
    
    // Try to fetch from categories endpoint with subcategories data
    const observable = this.http.get<any>(`${this.apiUrl}`)
      .pipe(
        switchMap(response => {
          const categories = response.categories || response.data || [];
          const category = categories.find((c: any) => 
            this.slugify(c.name) === categorySlug || c.id.toString() === categorySlug
          );
          
          if (!category) {
            console.warn(`Category not found: ${categoryName}`);
            return of([]);
          }

          // Now fetch subcategories for this category
          return this.fetchSubcategoriesByIdDirect(category.id);
        }),
        shareReplay(1)
      );

    this.subcategoriesCache.set(categoryName, observable);
    return observable;
  }

  /**
   * Fetch subcategories directly by category ID from API
   */
  private fetchSubcategoriesByIdDirect(categoryId: number): Observable<Subcategory[]> {
    return this.http.get<any>(`${this.apiUrl}/${categoryId}/subcategories`)
      .pipe(
        map(response => {
          // API returns array directly or wrapped in data property
          let subcategoriesData: any[] = [];
          
          if (Array.isArray(response)) {
            subcategoriesData = response;
          } else if (response && Array.isArray(response.data)) {
            subcategoriesData = response.data;
          } else if (response && Array.isArray(response)) {
            subcategoriesData = response;
          }
          
          console.log(`fetchSubcategoriesByIdDirect: Found ${subcategoriesData.length} subcategories for category ${categoryId}`);
          
          // Transform DB response to match UI expectations
          return subcategoriesData.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            image_url: sub.image_url,
            image: sub.image_url, // Add image field for compatibility with template
            category_id: sub.category_id,
            description: sub.description,
            display_order: sub.display_order,
            count: parseInt(sub.count) || 0 // Use product count from database
          }));
        }),
        catchError(error => {
          console.error('Error fetching subcategories by ID:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  /**
   * Convert name to slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
