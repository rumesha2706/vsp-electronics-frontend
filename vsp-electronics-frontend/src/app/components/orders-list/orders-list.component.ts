import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="orders-container">
      <div class="orders-header">
        <h1>📦 My Orders</h1>
        <p class="subtitle">View and manage your orders</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading your orders...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && orders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>No Orders Yet</h2>
        <p>Start shopping to create your first order</p>
        <button class="btn-primary" routerLink="/">Browse Products</button>
      </div>

      <!-- Orders List -->
      <div *ngIf="!isLoading && orders.length > 0" class="orders-list">
        <div *ngFor="let order of orders" class="order-card">
          <!-- Order Header -->
          <div class="order-header">
            <div class="order-info">
              <h3>Order #{{ order.id }}</h3>
              <p class="order-date">
                {{ formatDate(order.createdAt) }}
              </p>
            </div>
            <div class="order-status" [ngStyle]="{ 'background-color': getStatusColor(order.status) }">
              {{ getStatusLabel(order.status) }}
            </div>
          </div>

          <!-- Order Items Preview -->
          <div class="order-items-preview">
            <span *ngFor="let item of order.items" class="item-badge">
              {{ item.product.name }} ({{ item.quantity }})
            </span>
          </div>

          <!-- Order Details -->
          <div class="order-details">
            <div class="detail-row">
              <span>Total Amount:</span>
              <span class="amount">₹{{ order.pricing.total | number:'1.2-2' }}</span>
            </div>
            <div class="detail-row">
              <span>Delivery To:</span>
              <span>{{ order.deliveryAddress.city }}, {{ order.deliveryAddress.state }}</span>
            </div>
            <div *ngIf="order.estimatedDeliveryDate" class="detail-row">
              <span>Est. Delivery:</span>
              <span>{{ formatDate(order.estimatedDeliveryDate) }}</span>
            </div>
          </div>

          <!-- Order Actions -->
          <div class="order-actions">
            <button 
              class="btn btn-outline"
              [routerLink]="['/order', order.id]">
              📋 View Details
            </button>
            <button 
              class="btn btn-outline"
              [routerLink]="['/order', order.id, 'track']">
              📍 Track Order
            </button>
            <button 
              *ngIf="canCancelOrder(order.status)"
              class="btn btn-danger"
              (click)="openCancelDialog(order)">
              ✕ Cancel Order
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        <p>{{ errorMessage }}</p>
      </div>
    </div>

    <!-- Cancel Confirmation Dialog -->
    <div *ngIf="cancelingOrder" class="dialog-overlay">
      <div class="dialog">
        <h2>Cancel Order?</h2>
        <p>Are you sure you want to cancel order <strong>#{{ cancelingOrder.id }}</strong>?</p>
        
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
  `,
  styles: [`
    .orders-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .orders-header {
      margin-bottom: 30px;
      text-align: center;
    }

    .orders-header h1 {
      font-size: 28px;
      margin-bottom: 5px;
      color: #333;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
    }

    .loading {
      text-align: center;
      padding: 40px;
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

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .empty-state h2 {
      color: #333;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 20px;
    }

    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .order-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }

    .order-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #f0f0f0;
    }

    .order-info h3 {
      font-size: 16px;
      margin: 0 0 5px 0;
      color: #333;
    }

    .order-date {
      font-size: 12px;
      color: #999;
      margin: 0;
    }

    .order-status {
      padding: 6px 12px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .order-items-preview {
      margin-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .item-badge {
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
    }

    .order-details {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-row span:first-child {
      color: #666;
      font-weight: 500;
    }

    .detail-row span:last-child {
      color: #333;
    }

    .amount {
      font-weight: 600;
      font-size: 16px;
      color: #667eea;
    }

    .order-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      flex: 1;
      min-width: 140px;
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
      border: none;
      padding: 12px 30px;
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

    .error-message {
      background: #fee;
      color: #c33;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
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

    @media (max-width: 600px) {
      .orders-container {
        padding: 10px;
      }

      .order-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .order-actions {
        flex-direction: column;
      }

      .btn {
        min-width: unset;
      }
    }
  `]
})
export class OrdersListComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private router = inject(Router);

  orders: Order[] = [];
  isLoading = false;
  errorMessage = '';
  cancelingOrder: Order | null = null;
  cancellationReason = '';

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    const user = this.authService.currentUser();

    if (!user) {
      // Load from localStorage for guest users
      this.loadOrdersFromStorage();
      return;
    }

    this.orderService.getUserOrders(user.id).subscribe({
      next: (response) => {
        this.orders = response.orders;
        this.isLoading = false;
      },
      error: (error) => {
        // Fallback to localStorage
        console.warn('Failed to load orders from API, loading from localStorage:', error);
        this.loadOrdersFromStorage();
      }
    });
  }

  loadOrdersFromStorage() {
    try {
      // Load from localStorage
      const stored = localStorage.getItem('orders');
      if (stored) {
        this.orders = JSON.parse(stored);
        console.log('✅ Loaded orders from localStorage:', this.orders.length);
        this.isLoading = false;
        return;
      }

      this.orders = [];
      // Debug: show all available keys
      console.log('No orders found. Available localStorage keys:', {
        allKeys: Object.keys(localStorage),
        orderRelatedKeys: Object.keys(localStorage).filter(k => k.includes('order'))
      });
    } catch (error) {
      console.error('Failed to load orders from storage:', error);
      this.orders = [];
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  openCancelDialog(order: Order) {
    this.cancelingOrder = order;
    this.cancellationReason = '';
  }

  closeCancelDialog() {
    this.cancelingOrder = null;
    this.cancellationReason = '';
  }

  confirmCancel() {
    if (!this.cancelingOrder) return;

    this.orderService.cancelOrder(this.cancelingOrder.id).subscribe({
    });
  }
}
