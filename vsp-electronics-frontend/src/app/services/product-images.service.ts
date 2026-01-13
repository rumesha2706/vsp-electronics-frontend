import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  position: number;
  alt_text?: string;
  is_primary: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductImagesService {
  private apiUrl = '/api/products';

  constructor(private http: HttpClient) {}

  /**
   * Get all images for a product
   */
  getProductImages(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${productId}/images`);
  }

  /**
   * Get primary image for a product
   */
  getPrimaryImage(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${productId}/images/primary`);
  }

  /**
   * Add new image to product
   */
  addImage(productId: number, imageUrl: string, altText?: string, position?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${productId}/images`, {
      imageUrl,
      altText,
      position
    });
  }

  /**
   * Update image details
   */
  updateImage(productId: number, imageId: number, updates: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${productId}/images/${imageId}`, updates);
  }

  /**
   * Set image as primary
   */
  setPrimaryImage(productId: number, imageId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${productId}/images/${imageId}`, {
      isPrimary: true
    });
  }

  /**
   * Delete an image
   */
  deleteImage(productId: number, imageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${productId}/images/${imageId}`);
  }

  /**
   * Reorder images
   */
  reorderImages(productId: number, imageOrder: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${productId}/images/reorder`, { imageOrder });
  }
}
