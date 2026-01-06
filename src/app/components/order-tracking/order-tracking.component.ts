import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order, OrderTracking } from '../../models/order.model';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tracking-container">
      <!-- Back Button -->
      <button class="back-btn" (click)="goBack()">
        ← Back
      </button>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading tracking information...</p>
      </div>

      <!-- Tracking Info -->
      <div *ngIf="!isLoading && order && tracking" class="tracking-content">
        <!-- Header -->
        <div class="tracking-header">
          <h1>📦 Track Your Order</h1>
          <p class="order-number">Order #{{ order.id }}</p>
          <div class="order-status-badge" [ngStyle]="{ 'background-color': getStatusColor(order.status) }">
            {{ getStatusLabel(order.status) }}
          </div>
        </div>

        <!-- Timeline -->
        <div class="timeline-section">
          <h2>📍 Tracking Timeline</h2>
          <div class="timeline">
            <div *ngFor="let event of tracking.events; let last = last" class="timeline-item">
              <div class="timeline-marker">
                <div class="timeline-dot" [ngStyle]="{ 'background-color': getEventColor(event.status) }">
                  <span class="timeline-icon">{{ getStatusIcon(event.status) }}</span>
                </div>
              </div>
              <div class="timeline-content">
                <h3>{{ getStatusLabel(event.status) }}</h3>
                <p class="timeline-date">{{ formatDateTime(event.timestamp) }}</p>
                <p class="timeline-description">{{ event.description }}</p>
                <p *ngIf="event.location" class="timeline-location">📍 {{ event.location }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Location -->
        <div class="info-card">
          <h2>📍 Current Status</h2>
          <div class="status-info">
            <div class="info-row">
              <span>Status:</span>
              <strong>{{ getStatusLabel(order.status) }}</strong>
            </div>
            <div class="info-row">
              <span>Last Updated:</span>
              <strong>{{ formatDateTime(tracking.lastUpdated) }}</strong>
            </div>
            <div *ngIf="tracking.location" class="info-row">
              <span>Current Location:</span>
              <strong>{{ tracking.location }}</strong>
            </div>
            <div *ngIf="tracking.estimatedDelivery" class="info-row">
              <span>Estimated Delivery:</span>
              <strong>{{ formatDate(tracking.estimatedDelivery) }}</strong>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="info-card">
          <h2>📦 Order Summary</h2>
          <div class="order-summary">
            <div class="summary-row">
              <span>Items Ordered:</span>
              <strong>{{ order.items.length }} items</strong>
            </div>
            <div class="summary-row">
              <span>Total Amount:</span>
              <strong>₹{{ order.pricing.total | number:'1.2-2' }}</strong>
            </div>
            <div class="summary-row">
              <span>Delivery Address:</span>
              <strong>{{ order.deliveryAddress.city }}, {{ order.deliveryAddress.state }}</strong>
            </div>
            <div class="summary-row">
              <span>Ordered On:</span>
              <strong>{{ formatDate(order.createdAt) }}</strong>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="info-card">
          <h2>📋 Order Items</h2>
          <div class="items-table">
            <div *ngFor="let item of order.items" class="item-card">
              <div class="item-details">
                <h3>{{ item.product.name }}</h3>
                <p class="item-meta">
                  <span>Qty: {{ item.quantity }}</span>
                  <span class="separator">•</span>
                  <span>₹{{ item.price }}</span>
                </p>
              </div>
              <div class="item-subtotal">₹{{ item.subtotal | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn btn-primary" [routerLink]="['/order', order.id]">
            📋 View Full Details
          </button>
          <button class="btn btn-outline" routerLink="/orders">
            👈 Back to Orders
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && !order" class="error-state">
        <p>❌ Order not found</p>
        <button class="btn btn-primary" routerLink="/orders">Go to Orders</button>
      </div>
    </div>
  `,
  styles: [`
    .tracking-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .back-btn {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 20px;
      padding: 0;
    }

    .back-btn:hover {
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .tracking-content {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .tracking-header {
      text-align: center;
      margin-bottom: 40px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .tracking-header h1 {
      font-size: 28px;
      margin: 0 0 10px 0;
      color: #333;
    }

    .order-number {
      color: #666;
      font-size: 16px;
      margin: 0 0 15px 0;
    }

    .order-status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }

    .timeline-section {
      margin-bottom: 30px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .timeline-section h2 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #333;
    }

    .timeline {
      position: relative;
      padding-left: 40px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 20px;
      bottom: 0;
      width: 2px;
      background: #e0e0e0;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 30px;
    }

    .timeline-item:last-child {
      margin-bottom: 0;
    }

    .timeline-marker {
      position: absolute;
      left: -40px;
      top: 0;
    }

    .timeline-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }

    .timeline-icon {
      display: inline-block;
    }

    .timeline-content {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }

    .timeline-content h3 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 15px;
      font-weight: 600;
    }

    .timeline-date {
      color: #999;
      font-size: 12px;
      margin: 0 0 8px 0;
    }

    .timeline-description {
      color: #666;
      font-size: 14px;
      margin: 0 0 8px 0;
    }

    .timeline-location {
      color: #667eea;
      font-size: 12px;
      margin: 0;
    }

    .info-card {
      background: white;
      padding: 25px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      margin-bottom: 20px;
    }

    .info-card h2 {
      font-size: 16px;
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }

    .status-info,
    .order-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-row,
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }

    .info-row:last-child,
    .summary-row:last-child {
      border-bottom: none;
    }

    .info-row span:first-child,
    .summary-row span:first-child {
      color: #666;
      font-weight: 500;
    }

    .info-row strong,
    .summary-row strong {
      color: #333;
      text-align: right;
    }

    .items-table {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }

    .item-details h3 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 14px;
    }

    .item-meta {
      margin: 0;
      color: #666;
      font-size: 12px;
    }

    .separator {
      margin: 0 8px;
    }

    .item-subtotal {
      font-weight: 600;
      color: #667eea;
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-outline {
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .error-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
    }

    @media (max-width: 600px) {
      .tracking-container {
        padding: 10px;
      }

      .info-row,
      .summary-row {
        flex-direction: column;
        gap: 5px;
      }

      .timeline {
        padding-left: 25px;
      }

      .timeline::before {
        left: 3px;
      }

      .timeline-marker {
        left: -35px;
      }

      .item-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .item-subtotal {
        align-self: flex-end;
      }
    }
  `]
})
export class OrderTrackingComponent implements OnInit {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  order: Order | null = null;
  tracking: OrderTracking | null = null;
  isLoading = true;

  ngOnInit() {
    this.loadOrderTracking();
  }

  loadOrderTracking() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.isLoading = false;
      return;
    }

    // Load order details
    this.orderService.getOrder(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.loadTracking(orderId);
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.isLoading = false;
      }
    });
  }

  loadTracking(orderId: string) {
    this.orderService.getOrderTracking(orderId).subscribe({
      next: (tracking) => {
        this.tracking = tracking;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tracking:', error);
        this.isLoading = false;
      }
    });
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    return this.orderService.getOrderStatusLabel(status as any);
  }

  getStatusIcon(status: string): string {
    return this.orderService.getOrderStatusIcon(status as any);
  }

  getStatusColor(status: string): string {
    return this.orderService.getOrderStatusColor(status as any);
  }

  getEventColor(status: string): string {
    const statusColors: Record<string, string> = {
      'pending': '#ffc107',
      'confirmed': '#17a2b8',
      'processing': '#007bff',
      'shipped': '#6c63ff',
      'out_for_delivery': '#fd7e14',
      'delivered': '#28a745',
      'cancelled': '#dc3545'
    };
    return statusColors[status] || '#999';
  }

  goBack() {
    this.router.navigate(['/orders']);
  }
}
