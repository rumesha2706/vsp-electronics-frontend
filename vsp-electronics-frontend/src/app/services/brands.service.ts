import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  metadata?: any;
}

export interface BrandResponse {
  success: boolean;
  count?: number;
  brands?: Brand[];
  brand?: Brand;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandsService {
  private readonly API_URL = `${environment.apiUrl}/brands`;

  // Observable for all brands
  private brandsSubject = new BehaviorSubject<Brand[]>([]);
  public brands$ = this.brandsSubject.asObservable();

  // Observable for currently selected brand
  private selectedBrandSubject = new BehaviorSubject<Brand | null>(null);
  public selectedBrand$ = this.selectedBrandSubject.asObservable();

  // Observable for loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Observable for error state
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAllBrands();
  }

  /**
   * Get all brands from the server
   */
  getAllBrands(): Observable<BrandResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<BrandResponse>(this.API_URL).pipe(
      tap((response) => {
        if (response.success && response.brands) {
          this.brandsSubject.next(response.brands);
        }
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Failed to load brands';
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        console.error('Error loading brands:', error);
        throw error;
      })
    );
  }

  /**
   * Load all brands and update the subject
   */
  private loadAllBrands(): void {
    this.getAllBrands().subscribe(
      (response) => {
        if (response.success && response.brands) {
          this.brandsSubject.next(response.brands);
        }
      },
      (error) => {
        console.error('Failed to load brands:', error);
      }
    );
  }

  /**
   * Get brand by slug
   */
  getBrandBySlug(slug: string): Observable<BrandResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<BrandResponse>(`${this.API_URL}/${slug}`).pipe(
      tap((response) => {
        if (response.success && response.brand) {
          this.selectedBrandSubject.next(response.brand);
        }
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Failed to load brand';
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        console.error('Error loading brand:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new brand (admin only)
   */
  createBrand(brand: Partial<Brand>): Observable<BrandResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.post<BrandResponse>(this.API_URL, brand).pipe(
      tap((response) => {
        if (response.success && response.brand) {
          const currentBrands = this.brandsSubject.value;
          this.brandsSubject.next([...currentBrands, response.brand]);
        }
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Failed to create brand';
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        console.error('Error creating brand:', error);
        throw error;
      })
    );
  }

  /**
   * Update existing brand (admin only)
   */
  updateBrand(id: number, brand: Partial<Brand>): Observable<BrandResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.put<BrandResponse>(`${this.API_URL}/${id}`, brand).pipe(
      tap((response) => {
        if (response.success && response.brand) {
          const currentBrands = this.brandsSubject.value;
          const updatedBrands = currentBrands.map(b =>
            b?.id === id ? response.brand : b
          ).filter((b): b is Brand => b !== undefined);
          this.brandsSubject.next(updatedBrands);
        }
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Failed to update brand';
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        console.error('Error updating brand:', error);
        throw error;
      })
    );
  }

  /**
   * Delete brand (admin only)
   */
  deleteBrand(id: number): Observable<BrandResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.delete<BrandResponse>(`${this.API_URL}/${id}`).pipe(
      tap((response) => {
        if (response.success) {
          const currentBrands = this.brandsSubject.value;
          const filteredBrands = currentBrands.filter(b => b.id !== id);
          this.brandsSubject.next(filteredBrands);
        }
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        const errorMessage = error.error?.message || 'Failed to delete brand';
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        console.error('Error deleting brand:', error);
        throw error;
      })
    );
  }

  /**
   * Get brands list synchronously (useful for templates)
   */
  getBrandsList(): Brand[] {
    return this.brandsSubject.value;
  }

  /**
   * Get selected brand synchronously
   */
  getSelectedBrand(): Brand | null {
    return this.selectedBrandSubject.value;
  }

  /**
   * Set selected brand
   */
  setSelectedBrand(brand: Brand | null): void {
    this.selectedBrandSubject.next(brand);
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Refresh brands list
   */
  refresh(): void {
    this.loadAllBrands();
  }
}
