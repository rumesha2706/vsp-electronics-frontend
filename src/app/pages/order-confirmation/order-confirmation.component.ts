import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderNotificationService, NotificationSettings } from '../../services/order-notification.service';
import { AuthService, User } from '../../services/auth.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.css']
})
export class OrderConfirmationComponent implements OnInit {
  route = inject(ActivatedRoute);
  orderService = inject(OrderService);
  notificationService = inject(OrderNotificationService);
  authService = inject(AuthService);
  
  orderId: string = '';
  order: Order | null = null;
  businessWhatsAppNumber = '+919951130198'; // VSP Electronics WhatsApp number
  currentUser: User | null = null;
  
  // Notification UI states
  showNotificationModal = false;
  notificationSettings: NotificationSettings = {
    sendWhatsApp: true,
    sendEmail: true,
    sendBoth: true
  };
  notificationLoading = false;
  notificationMessage = '';
  notificationSuccess = false;

  ngOnInit() {
    this.currentUser = this.authService.currentUser();
    this.route.params.subscribe(params => {
      this.orderId = params['id'] || sessionStorage.getItem('lastOrderId') || '';
      if (this.orderId) {
        this.loadOrder();
      }
    });
  }

  loadOrder() {
    // First try to get from OrderService (which will look in storage)
    this.orderService.getOrder(this.orderId).subscribe({
      next: (order) => {
        if (order) {
          this.order = order;
        } else {
          // If not found, try to get from localStorage directly
          this.loadFromLocalStorage();
        }
      },
      error: () => {
        // If error, try localStorage directly
        this.loadFromLocalStorage();
      }
    });
  }

  loadFromLocalStorage() {
    try {
      // Try to get orders from localStorage for the current user
      const userId = localStorage.getItem('userId') || 'guest';
      const storageKey = `orders_${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const orders = JSON.parse(stored);
        const foundOrder = orders.find((o: Order) => o.id === this.orderId);
        if (foundOrder) {
          this.order = foundOrder;
          return;
        }
      }

      // Try guest orders as fallback
      const guestStored = localStorage.getItem('orders_guest');
      if (guestStored) {
        const guestOrders = JSON.parse(guestStored);
        const foundOrder = guestOrders.find((o: Order) => o.id === this.orderId);
        if (foundOrder) {
          this.order = foundOrder;
          return;
        }
      }

      // If still not found, create basic order for button to show
      this.createBasicOrder();
    } catch (e) {
      console.error('Error loading from localStorage:', e);
      this.createBasicOrder();
    }
  }

  createBasicOrder() {
    // Create a basic order object so WhatsApp button shows
    this.order = {
      id: this.orderId,
      userId: 'guest',
      customer: {
        firstName: 'Customer',
        lastName: '',
        email: '',
        phone: ''
      },
      items: [],
      status: 'confirmed',
      paymentStatus: 'completed',
      paymentMethod: 'cod',
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
      },
      deliveryAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: ''
      },
      pricing: {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        discount: 0,
        total: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Order;
  }

  shareViaWhatsApp() {
    if (!this.order) return;
    
    // Professional WhatsApp template with better formatting
    const message = `
*🎉 ORDER CONFIRMATION* 📦

━━━━━━━━━━━━━━━━━━━━━━

*Order Details:*
🔹 Order ID: ${this.order.id}
🔹 Amount: ₹${this.order.pricing.total}
🔹 Status: ${this.order.status.toUpperCase()}
🔹 Payment Method: COD

━━━━━━━━━━━━━━━━━━━━━━

*📦 Items Ordered:*
${this.order.items && this.order.items.length > 0 
  ? this.order.items.map((item: any) => `• ${item.name} (₹${item.price})`).join('\n')
  : '• Order items will be shown'}

━━━━━━━━━━━━━━━━━━━━━━

*🚚 Delivery Address:*
${this.order.deliveryAddress.street || 'Not specified'}
${this.order.deliveryAddress.city}, ${this.order.deliveryAddress.state}
${this.order.deliveryAddress.pincode}

━━━━━━━━━━━━━━━━━━━━━━

⏱️ Expected Delivery: 3-5 business days
📞 Need Help? Contact our support team

Thank you for your purchase! 🙏
    `.trim();
    
    const encodedMessage = encodeURIComponent(message);
    // Use wa.me without phone number - user will choose contact
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  /**
   * Open notification preferences modal
   */
  openNotificationModal() {
    this.showNotificationModal = true;
    this.notificationMessage = '';
    this.notificationSuccess = false;
    
    // Pre-fill with current user data
    if (this.currentUser) {
      this.notificationSettings.phoneNumber = this.currentUser.phone || '';
      this.notificationSettings.email = this.currentUser.email || '';
    }
  }

  /**
   * Close notification modal
   */
  closeNotificationModal() {
    this.showNotificationModal = false;
  }

  /**
   * Send order notifications via WhatsApp and/or Email
   */
  sendOrderNotifications() {
    if (!this.order) {
      this.notificationMessage = 'Order information not available';
      return;
    }

    // Validate phone or email is provided
    const phoneValid = this.notificationSettings.sendWhatsApp && this.notificationSettings.phoneNumber?.trim();
    const emailValid = this.notificationSettings.sendEmail && this.notificationSettings.email?.trim();

    if (!phoneValid && !emailValid) {
      this.notificationMessage = 'Please provide at least a phone number or email';
      return;
    }

    this.notificationLoading = true;
    this.notificationMessage = 'Sending notifications...';

    this.notificationService.sendOrderConfirmation(this.order, this.notificationSettings)
      .subscribe({
        next: (response) => {
          this.notificationLoading = false;
          
          if (response.success) {
            this.notificationSuccess = true;
            const sentVia = [];
            if (response.whatsappStatus) sentVia.push('WhatsApp');
            if (response.emailStatus) sentVia.push('Email');
            
            this.notificationMessage = sentVia.length > 0 
              ? `✅ Order confirmation sent via ${sentVia.join(' and ')}!`
              : '✅ Notifications sent successfully!';
            
            // Close modal after 3 seconds
            setTimeout(() => {
              this.showNotificationModal = false;
            }, 3000);
          } else {
            this.notificationSuccess = false;
            this.notificationMessage = response.message || 'Failed to send notifications';
          }
        },
        error: (error) => {
          this.notificationLoading = false;
          this.notificationSuccess = false;
          this.notificationMessage = 'Error sending notifications: ' + (error?.message || 'Unknown error');
        }
      });
  }

  /**
   * Send tracking update notification
   */
  sendTrackingNotification(phoneNumber?: string) {
    if (!this.order) return;

    const phone = phoneNumber || this.notificationSettings.phoneNumber;
    if (!phone) {
      alert('Please provide a phone number for tracking notification');
      return;
    }

    this.notificationService.sendTrackingUpdate(
      this.order,
      phone,
      {
        status: 'in_transit',
        currentLocation: 'In Transit',
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
      }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert('✅ Tracking notification sent via WhatsApp!');
        } else {
          alert('Failed to send tracking notification');
        }
      },
      error: (error) => {
        alert('Error sending tracking notification: ' + error?.message);
      }
    });
  }
}
