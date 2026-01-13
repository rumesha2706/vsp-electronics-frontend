import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductImagesService, ProductImage } from '../../services/product-images.service';

@Component({
  selector: 'app-product-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-image-gallery">
      <!-- Main Image Display -->
      <div class="main-image-container">
        <img 
          [src]="selectedImage?.image_url" 
          [alt]="selectedImage?.alt_text || 'Product image'"
          class="main-image"
        >
        <div class="image-info" *ngIf="selectedImage?.alt_text">
          {{ selectedImage?.alt_text }}
        </div>
      </div>

      <!-- Thumbnail Gallery -->
      <div class="thumbnail-gallery">
        <div class="gallery-heading">
          <h3>Image Gallery ({{ images.length }} images)</h3>
        </div>
        <div class="thumbnails">
          <div 
            *ngFor="let image of images; let i = index" 
            class="thumbnail"
            [class.active]="selectedImage?.id === image.id"
            (click)="selectImage(image)"
          >
            <img 
              [src]="image.image_url" 
              [alt]="image.alt_text || 'Thumbnail ' + (i + 1)"
              class="thumbnail-img"
            >
            <span *ngIf="image.is_primary" class="primary-badge">Primary</span>
          </div>
        </div>
      </div>

      <!-- Image Details -->
      <div class="image-details" *ngIf="selectedImage">
        <div class="detail-item">
          <span class="label">Position:</span>
          <span class="value">{{ selectedImage.position }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Alt Text:</span>
          <span class="value">{{ selectedImage.alt_text || 'Not set' }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Primary:</span>
          <span class="value">{{ selectedImage.is_primary ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading">
        <p>Loading images...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error">
        <p>{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && images.length === 0" class="empty">
        <p>No images available</p>
      </div>
    </div>
  `,
  styles: [`
    .product-image-gallery {
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .main-image-container {
      position: relative;
      margin-bottom: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .main-image {
      width: 100%;
      max-height: 500px;
      object-fit: contain;
      display: block;
    }

    .image-info {
      padding: 10px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    }

    .gallery-heading {
      margin-bottom: 10px;
    }

    .gallery-heading h3 {
      margin: 0;
      font-size: 14px;
      color: #333;
    }

    .thumbnails {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 10px 0;
      background: white;
      border-radius: 8px;
      padding: 10px;
    }

    .thumbnail {
      position: relative;
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .thumbnail:hover {
      border-color: #4CAF50;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .thumbnail.active {
      border-color: #4CAF50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }

    .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .primary-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #4CAF50;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }

    .image-details {
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #666;
      font-size: 14px;
    }

    .value {
      color: #333;
      font-size: 14px;
    }

    .loading, .error, .empty {
      padding: 20px;
      text-align: center;
      color: #666;
      background: white;
      border-radius: 8px;
      margin-top: 10px;
    }

    .error {
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #c62828;
    }

    .empty {
      background: #f5f5f5;
    }

    @media (max-width: 768px) {
      .main-image {
        max-height: 300px;
      }

      .thumbnail {
        width: 60px;
        height: 60px;
      }

      .thumbnails {
        gap: 8px;
      }
    }
  `]
})
export class ProductImageGalleryComponent implements OnInit {
  @Input() productId!: number;

  images: ProductImage[] = [];
  selectedImage: ProductImage | null = null;
  loading = false;
  error: string | null = null;

  constructor(private productImagesService: ProductImagesService) {}

  ngOnInit() {
    if (this.productId) {
      this.loadImages();
    }
  }

  loadImages() {
    this.loading = true;
    this.error = null;

    this.productImagesService.getProductImages(this.productId).subscribe({
      next: (response: any) => {
        this.images = response.data || [];
        if (this.images.length > 0) {
          this.selectedImage = this.images[0];
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading images:', err);
        this.error = 'Failed to load product images';
        this.loading = false;
      }
    });
  }

  selectImage(image: ProductImage) {
    this.selectedImage = image;
  }
}
