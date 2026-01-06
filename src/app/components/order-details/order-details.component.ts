import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="order-details-container">
      <!-- Back Button -->
      <button class="back-btn" routerLink="/orders">
        ← Back to Orders
      </button>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading order details...</p>
      </div>

      <!-- Order Details -->
      <div *ngIf="!isLoading && order" class="order-content">
        <!-- Order Header -->
        <div class="order-header-section">
          <div class="order-title">
            <h1>Order #{{ order.id }}</h1>
            <div class="order-meta">
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
              <span 
                class="order-status-badge"
                [ngStyle]="{ 'background-color': getStatusColor(order.status) }">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
          </div>

          <div class="order-actions">
            <button 
              class="btn btn-outline"
              [routerLink]="['/order', order.id, 'track']">
              📍 Track Order
            </button>
            <button 
              *ngIf="canCancelOrder(order.status)"
              class="btn btn-danger"
              (click)="openCancelDialog()">
              ✕ Cancel Order
            </button>
          </div>
        </div>

        <div class="details-grid">
          <!-- Order Items -->
          <section class="section">
            <h2>📦 Order Items</h2>
            <div class="items-list">
              <div *ngFor="let item of order.items" class="item-row">
                <div class="item-info">
                  <h3>{{ item.product.name }}</h3>
                  <p class="item-sku">SKU: {{ item.product.id }}</p>
                </div>
                <div class="item-qty">Qty: {{ item.quantity }}</div>
                <div class="item-price">₹{{ item.price | number:'1.2-2' }}</div>
                <div class="item-subtotal">₹{{ item.subtotal | number:'1.2-2' }}</div>
              </div>
            </div>
          </section>

          <!-- Pricing Details -->
          <section class="section">
            <h2>💰 Price Breakdown</h2>
            <div class="pricing-details">
              <div class="price-row">
                <span>Subtotal:</span>
                <span>₹{{ order.pricing.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="price-row">
                <span>Shipping:</span>
                <span>{{ order.pricing.shipping === 0 ? 'FREE' : '₹' + (order.pricing.shipping | number:'1.2-2') }}</span>
              </div>
              <div class="price-row">
                <span>Tax (18% GST):</span>
                <span>₹{{ order.pricing.tax | number:'1.2-2' }}</span>
              </div>
              <div class="price-row total">
                <span>Total Amount:</span>
                <span>₹{{ order.pricing.total | number:'1.2-2' }}</span>
              </div>
            </div>
          </section>

          <!-- Delivery Address -->
          <section class="section">
            <h2>📍 Delivery Address</h2>
            <div class="address-details">
              <p><strong>{{ order.customer.firstName }} {{ order.customer.lastName }}</strong></p>
              <p>{{ order.deliveryAddress.street }}</p>
              <p>{{ order.deliveryAddress.landmark }}</p>
              <p>{{ order.deliveryAddress.city }}, {{ order.deliveryAddress.state }} - {{ order.deliveryAddress.pincode }}</p>
              <p class="contact">📞 {{ order.customer.phone }}</p>
            </div>
          </section>

          <!-- Payment Information -->
          <section class="section">
            <h2>💳 Payment Information</h2>
            <div class="payment-details">
              <div class="detail-row">
                <span>Payment Method:</span>
                <span>{{ order.paymentMethod }}</span>
              </div>
              <div class="detail-row">
                <span>Payment Status:</span>
                <span [ngClass]="'status-' + order.paymentStatus">
                  {{ formatPaymentStatus(order.paymentStatus) }}
                </span>
              </div>
            </div>
          </section>

          <!-- Delivery Information -->
          <section class="section" *ngIf="order.estimatedDeliveryDate || order.actualDeliveryDate">
            <h2>📅 Delivery Information</h2>
            <div class="delivery-details">
              <div *ngIf="order.estimatedDeliveryDate" class="detail-row">
                <span>Estimated Delivery:</span>
                <span>{{ formatDate(order.estimatedDeliveryDate) }}</span>
              </div>
              <div *ngIf="order.actualDeliveryDate" class="detail-row">
                <span>Delivered On:</span>
                <span>{{ formatDate(order.actualDeliveryDate) }}</span>
              </div>
            </div>
          </section>

          <!-- Cancellation Details -->
          <section class="section" *ngIf="order.status === 'cancelled'">
            <h2>❌ Cancellation Details</h2>
            <div class="cancellation-details alert-warning">
              <div class="detail-row">
                <span>Cancelled On:</span>
                <span>{{ formatDate(order.cancellationDate) }}</span>
              </div>
              <div class="detail-row">
                <span>Reason:</span>
                <span>{{ order.cancellationReason || 'No reason provided' }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && !order" class="error-state">
        <p>Order not found</p>
        <button class="btn btn-primary" routerLink="/orders">Go to Orders</button>
      </div>

      <!-- Cancel Confirmation Dialog -->
      <div *ngIf="showCancelDialog" class="dialog-overlay">
        <div class="dialog">
          <h2>Cancel Order #{{ order?.id }}?</h2>
          <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
          
          <div class="form-group">
            <label>Reason for cancellation:</label>
            <textarea 
              [(ngModel)]="cancellationReason"
              placeholder="Tell us why you're cancelling..."
              class="textarea"></textarea>
          </div>

          <div class="dialog-actions">
            <button class="btn btn-outline" (click)="closeCancelDialog()">
              Keep Order
            </button>
            <button class="btn btn-danger" (click)="confirmCancel()">
              Confirm Cancellation
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-details-container {
      max-width: 1000px;
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

    .order-header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #e0e0e0;
    }

    .order-title h1 {
      font-size: 24px;
      margin: 0 0 10px 0;
      color: #333;
    }

    .order-meta {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .order-date {
      font-size: 14px;
      color: #666;
    }

    .order-status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .order-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .details-grid {
      display: grid;
      gap: 20px;
    }

    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .section h2 {
      font-size: 18px;
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .item-row {
      display: grid;
      grid-template-columns: 1fr 80px 100px 120px;
      gap: 15px;
      align-items: center;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .item-info h3 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 14px;
    }

    .item-sku {
      color: #999;
      font-size: 12px;
      margin: 0;
    }

    .item-qty, .item-price, .item-subtotal {
      text-align: right;
      font-size: 14px;
      color: #333;
    }

    .pricing-details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }

    .price-row:last-child {
      border-bottom: none;
    }

    .price-row.total {
      border-top: 2px solid #667eea;
      padding: 12px 0;
      font-weight: 600;
      font-size: 16px;
      color: #667eea;
    }

    .price-row span:first-child {
      color: #666;
    }

    .price-row span:last-child {
      color: #333;
      font-weight: 500;
    }

    .address-details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.8;
    }

    .address-details p {
      margin: 5px 0;
      color: #333;
    }

    .address-details p strong {
      font-weight: 600;
    }

    .contact {
      color: #667eea;
      margin-top: 10px !important;
    }

    .payment-details,
    .delivery-details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row span:first-child {
      color: #666;
      font-weight: 500;
    }

    .detail-row span:last-child {
      color: #333;
    }

    .status-completed {
      color: #28a745;
      font-weight: 600;
    }

    .status-pending {
      color: #ffc107;
      font-weight: 600;
    }

    .status-failed {
      color: #dc3545;
      font-weight: 600;
    }

    .cancellation-details {
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #dc3545;
    }

    .alert-warning {
      background: #fff5f5;
    }

    .btn {
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-outline {
      background: white;
      border: 1px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-danger {
      background: white;
      border: 1px solid #dc3545;
      color: #dc3545;
    }

    .btn-danger:hover {
      background: #dc3545;
      color: white;
    }

    .error-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
    }

    /* Dialog */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: white;
      border-radius: 8px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .dialog h2 {
      color: #333;
      margin: 0 0 15px 0;
    }

    .dialog p {
      color: #666;
      margin: 0 0 20px 0;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }

    .textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
      min-height: 80px;
      resize: vertical;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
    }

    @media (max-width: 768px) {
      .order-header-section {
        flex-direction: column;
        gap: 15px;
      }

      .item-row {
        grid-template-columns: 1fr;
        gap: 5px;
      }

      .item-qty, .item-price, .item-subtotal {
        text-align: left;
      }

      .item-qty::before {
        content: 'Qty: ';
        color: #666;
      }

      .item-price::before {
        content: 'Price: ';
        color: #666;
      }

      .item-subtotal::before {
        content: 'Subtotal: ';
        color: #666;
      }
    }
  `]
})
export class OrderDetailsComponent implements OnInit {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  order: Order | null = null;
  isLoading = true;
  showCancelDialog = false;
  cancellationReason = '';

  ngOnInit() {
    this.loadOrder();
  }

  loadOrder() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.isLoading = false;
      return;
    }

    this.orderService.getOrder(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.isLoading = false;
      }
    });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatPaymentStatus(status: string): string {
    const map: Record<string, string> = {
      'completed': 'Payment Completed',
      'pending': 'Payment Pending',
      'failed': 'Payment Failed'
    };
    return map[status] || status;
  }

  getStatusLabel(status: string): string {
    return this.orderService.getOrderStatusLabel(status as any);
  }

  getStatusColor(status: string): string {
    return this.orderService.getOrderStatusColor(status as any);
  }

  canCancelOrder(status: string): boolean {
    return ['pending', 'confirmed', 'processing'].includes(status);
  }

  openCancelDialog() {
    this.showCancelDialog = true;
  }

  closeCancelDialog() {
    this.showCancelDialog = false;
    this.cancellationReason = '';
  }

  confirmCancel() {
    if (!this.order) return;

    this.orderService.cancelOrder(this.order.id).subscribe({
      next: () => {
        this.closeCancelDialog();
        this.loadOrder();
      },
      error: (error) => {
        console.error('Error cancelling order:', error);
      }
    });
  }
}
