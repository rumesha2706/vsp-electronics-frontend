import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private apiUrl = `${environment.apiUrl}/recently-viewed`;
  private userId: string;
  private recentlyViewedSubject = new BehaviorSubject<Product[]>([]);
  public recentlyViewed$ = this.recentlyViewedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Generate or retrieve user ID (for demonstration, using a persistent ID)
    this.userId = this.getUserId();
    this.loadRecentlyViewed();
  }

  /**
   * Get or create a unique user ID (stored in localStorage)
   */
  private getUserId(): string {
    let userId = localStorage.getItem('vsp_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('vsp_user_id', userId);
    }
    return userId;
  }

  /**
   * Add product to recently viewed
   */
  addToRecentlyViewed(productId: number): Observable<any> {
    return this.http.post<any>(this.apiUrl, {
      userId: this.userId,
      productId
    }).pipe(
      tap(() => this.loadRecentlyViewed())
    );
  }

  /**
   * Load recently viewed products for current user
   */
  loadRecentlyViewed(limit: number = 10): void {
    this.http.get<any>(`${this.apiUrl}/${this.userId}?limit=${limit}`).subscribe(
      (response) => {
        const products = response.data || [];
        this.recentlyViewedSubject.next(products);
      },
      (error) => {
        console.error('Error loading recently viewed products:', error);
      }
    );
  }

  /**
   * Get recently viewed products
   */
  getRecentlyViewed(limit: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${this.userId}?limit=${limit}`).pipe(
      tap((response) => {
        const products = response.data || [];
        this.recentlyViewedSubject.next(products);
      })
    );
  }

  /**
   * Remove product from recently viewed
   */
  removeFromRecentlyViewed(productId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${this.userId}/${productId}`).pipe(
      tap(() => this.loadRecentlyViewed())
    );
  }

  /**
   * Clear all recently viewed products
   */
  clearRecentlyViewed(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${this.userId}`).pipe(
      tap(() => this.recentlyViewedSubject.next([]))
    );
  }

  /**
   * Get current recently viewed products as observable
   */
  getRecentlyViewedAsObservable(): Observable<Product[]> {
    return this.recentlyViewed$;
  }
}
