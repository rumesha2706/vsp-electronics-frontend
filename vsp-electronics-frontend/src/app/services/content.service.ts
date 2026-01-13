/**
 * Content Service
 * Loads all documentation and static content from API instead of markdown files
 * Replaces markdown file system with database-backed content delivery
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

export interface Content {
  id: number;
  title: string;
  slug: string;
  category: string;
  content: string;
  description?: string;
  metaKeywords?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
}

export interface TableOfContents {
  slug: string;
  headings: Heading[];
}

export interface Heading {
  level: number;
  text: string;
  id: string;
  lineNumber: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private apiUrl = '/api/content';
  private cacheDuration = 3600000; // 1 hour
  private cache = new Map<string, { data: any; timestamp: number }>();
  private contentLoaded$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.preloadCommonContent();
  }

  /**
   * Preload commonly used content (README, SETUP, etc.)
   */
  private preloadCommonContent(): void {
    const commonPages = ['readme', 'setup', 'start-here', 'security-guide'];
    
    commonPages.forEach(slug => {
      this.getContent(slug).subscribe(
        () => {},
        error => console.warn(`Could not preload ${slug}:`, error)
      );
    });
  }

  /**
   * Get content by slug
   * @param slug Content slug
   */
  getContent(slug: string): Observable<Content> {
    const cacheKey = `content_${slug}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<Content>(`${this.apiUrl}/${slug}`)
      .pipe(
        tap(content => this.setCache(cacheKey, content)),
        catchError(error => {
          console.error(`Error fetching content '${slug}':`, error);
          return throwError(() => new Error(`Could not load content: ${slug}`));
        }),
        shareReplay(1)
      );
  }

  /**
   * Get all content in a category
   * @param category Category name
   */
  getByCategory(category: string): Observable<Content[]> {
    const cacheKey = `category_${category}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<{ category: string; items: Content[]; count: number }>(
        `${this.apiUrl}/category/${category}`
      )
      .pipe(
        map(response => response.items),
        tap(items => this.setCache(cacheKey, items)),
        catchError(error => {
          console.error(`Error fetching category '${category}':`, error);
          return throwError(() => new Error(`Could not load category: ${category}`));
        }),
        shareReplay(1)
      );
  }

  /**
   * Get paginated content list
   * @param page Page number
   * @param limit Items per page
   * @param category Optional category filter
   */
  getList(page: number = 1, limit: number = 20, category?: string): Observable<any> {
    const cacheKey = `list_${page}_${limit}_${category || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (category) {
      url += `&category=${category}`;
    }

    return this.http
      .get<any>(url)
      .pipe(
        tap(data => this.setCache(cacheKey, data)),
        catchError(error => {
          console.error('Error fetching content list:', error);
          return throwError(() => new Error('Could not load content list'));
        }),
        shareReplay(1)
      );
  }

  /**
   * Search content
   * @param query Search term
   */
  search(query: string): Observable<Content[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    return this.http
      .get<{ query: string; results: Content[]; count: number }>(
        `${this.apiUrl}/search/query?q=${encodeURIComponent(query)}`
      )
      .pipe(
        map(response => response.results),
        catchError(error => {
          console.error('Error searching content:', error);
          return of([]);
        })
      );
  }

  /**
   * Get table of contents for content
   * @param slug Content slug
   */
  getTableOfContents(slug: string): Observable<TableOfContents> {
    const cacheKey = `toc_${slug}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    return this.http
      .get<TableOfContents>(`${this.apiUrl}/${slug}/toc`)
      .pipe(
        tap(toc => this.setCache(cacheKey, toc)),
        catchError(error => {
          console.error(`Error fetching TOC for '${slug}':`, error);
          return throwError(() => new Error(`Could not load table of contents for ${slug}`));
        })
      );
  }

  /**
   * Get content list by category
   * @param category Category name
   */
  listByCategory(category: string): Observable<Content[]> {
    return this.getByCategory(category);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Check if cache is valid
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

  /**
   * Mark content as loaded
   */
  markAsLoaded(): void {
    this.contentLoaded$.next(true);
  }

  /**
   * Get content loaded status
   */
  isContentLoaded(): Observable<boolean> {
    return this.contentLoaded$.asObservable();
  }
}
