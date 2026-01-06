import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-debug-storage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 1000px; margin: 0 auto; font-family: monospace;">
      <h2>🔍 Storage Debug Console</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3>Current User</h3>
        <pre>{{ currentUser | json }}</pre>
      </div>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3>Orders from Service</h3>
        <p><strong>Count:</strong> {{ orders.length }}</p>
        <pre>{{ orders | json }}</pre>
      </div>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3>localStorage Keys</h3>
        <pre>{{ storageKeys | json }}</pre>
      </div>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3>All localStorage Content</h3>
        <pre>{{ storageContent | json }}</pre>
      </div>

      <div style="margin-top: 20px;">
        <button (click)="refreshDebugInfo()" 
                style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          🔄 Refresh
        </button>
        <button (click)="clearAllOrders()" 
                style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
          ❌ Clear All Orders
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: white;
      min-height: 100vh;
    }
  `]
})
export class DebugStorageComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);

  orders: any[] = [];
  currentUser: any = null;
  storageKeys: string[] = [];
  storageContent: Record<string, any> = {};

  ngOnInit() {
    this.refreshDebugInfo();
  }

  refreshDebugInfo() {
    // Get current user
    this.currentUser = this.authService.currentUser();

    // Get orders from service
    this.orderService.getUserOrders().subscribe(response => {
      this.orders = response.orders;
    });

    // Get all storage keys
    this.storageKeys = Object.keys(localStorage);

    // Get content of order-related keys
    this.storageContent = {};
    for (let key of this.storageKeys) {
      if (key.includes('order') || key.includes('user') || key === 'auth-token') {
        try {
          const content = localStorage.getItem(key);
          if (content) {
            try {
              this.storageContent[key] = JSON.parse(content);
            } catch {
              this.storageContent[key] = content;
            }
          }
        } catch (error) {
          this.storageContent[key] = 'Error reading';
        }
      }
    }

    console.log('Debug Info Updated', {
      currentUser: this.currentUser,
      ordersCount: this.orders.length,
      storageKeys: this.storageKeys,
      storageContent: this.storageContent
    });
  }

  clearAllOrders() {
    if (confirm('Are you sure you want to clear all orders from localStorage?')) {
      for (let key of this.storageKeys) {
        if (key.includes('order')) {
          localStorage.removeItem(key);
        }
      }
      this.refreshDebugInfo();
      alert('All order data cleared!');
    }
  }
}
