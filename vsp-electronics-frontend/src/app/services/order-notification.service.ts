import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Order } from '../models/order.model';
import { AuthService, User } from './auth.service';
import { environment } from '../../environments/environment';

export interface NotificationSettings {
  sendWhatsApp: boolean;
  sendEmail: boolean;
  sendBoth: boolean;
  phoneNumber?: string;
  email?: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  whatsappStatus?: string;
  emailStatus?: string;
  messageId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderNotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = environment.apiUrl;
  private whatsappApiUrl = `${this.apiUrl}/whatsapp`;
  private emailApiUrl = `${this.apiUrl}/email`;
  private ordersApiUrl = `${this.apiUrl}/orders`;

  /**
   * Send order confirmation notification via WhatsApp and/or Email
   */
  sendOrderConfirmation(
    order: Order,
    settings: NotificationSettings = { sendWhatsApp: true, sendEmail: true, sendBoth: true }
  ): Observable<NotificationResponse> {
    const user = this.authService.currentUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const notifications: Observable<any>[] = [];

    if (settings.sendWhatsApp && settings.phoneNumber) {
      notifications.push(
        this.sendWhatsAppOrderConfirmation(order, user, settings.phoneNumber)
      );
    }

    if (settings.sendEmail && settings.email) {
      notifications.push(
        this.sendEmailOrderConfirmation(order, user, settings.email)
      );
    }

    if (notifications.length === 0) {
      return of({
        success: false,
        message: 'No notification method selected'
      });
    }

    return this.combineNotifications(notifications);
  }

  /**
   * Send order status update via WhatsApp
   */
  sendOrderStatusUpdate(
    order: Order,
    phoneNumber: string,
    newStatus: string
  ): Observable<NotificationResponse> {
    const message = this.generateStatusUpdateMessage(order, newStatus);

    return this.http.post<NotificationResponse>(
      `${this.whatsappApiUrl}/send`,
      {
        phoneNumber,
        message,
        orderId: order.id,
        templateName: 'order_status_update'
      }
    ).pipe(
      catchError(error => {
        console.error('WhatsApp notification error:', error);
        return of({
          success: false,
          message: 'Failed to send WhatsApp notification',
          whatsappStatus: error.message
        });
      })
    );
  }

  /**
   * Send order tracking update via WhatsApp
   */
  sendTrackingUpdate(
    order: Order,
    phoneNumber: string,
    trackingInfo: any
  ): Observable<NotificationResponse> {
    const message = this.generateTrackingMessage(order, trackingInfo);

    return this.http.post<NotificationResponse>(
      `${this.whatsappApiUrl}/send`,
      {
        phoneNumber,
        message,
        orderId: order.id,
        templateName: 'order_tracking_update'
      }
    ).pipe(
      catchError(error => {
        console.error('Tracking notification error:', error);
        return of({
          success: false,
          message: 'Failed to send tracking notification'
        });
      })
    );
  }

  /**
   * Send WhatsApp order confirmation
   */
  private sendWhatsAppOrderConfirmation(
    order: Order,
    user: User,
    phoneNumber: string
  ): Observable<any> {
    const message = this.generateOrderConfirmationMessage(order, user);

    return this.http.post<NotificationResponse>(
      `${this.whatsappApiUrl}/send`,
      {
        phoneNumber,
        message,
        orderId: order.id,
        templateName: 'order_confirmation'
      }
    ).pipe(
      catchError(error => {
        console.error('WhatsApp error:', error);
        return of({ success: false, message: 'WhatsApp failed', whatsappStatus: error.message });
      })
    );
  }

  /**
   * Send Email order confirmation
   */
  private sendEmailOrderConfirmation(
    order: Order,
    user: User,
    email: string
  ): Observable<any> {
    const subject = `Order Confirmation - ${order.id || 'ORD-' + Date.now()}`;
    const htmlContent = this.generateOrderConfirmationHtml(order, user);

    return this.http.post<NotificationResponse>(
      `${this.emailApiUrl}/send-order-confirmation`,
      {
        to: email,
        subject,
        htmlContent,
        orderId: order.id
      }
    ).pipe(
      catchError(error => {
        console.error('Email error:', error);
        return of({ success: false, message: 'Email failed', emailStatus: error.message });
      })
    );
  }

  /**
   * Generate WhatsApp order confirmation message
   */
  private generateOrderConfirmationMessage(order: Order, user: User): string {
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
    const orderTime = new Date(order.createdAt).toLocaleTimeString('en-IN');

    let itemsList = '';
    if (order.items && Array.isArray(order.items)) {
      itemsList = order.items.map((item: any, index: number) =>
        `${index + 1}. ${item.name || 'Product'}\n   Qty: ${item.quantity} × ₹${item.price}`
      ).join('\n');
    }

    return `🎉 *Order Confirmation - VSP Electronics* 🎉

Hello ${user.firstName || user.name},

Thank you for your order! Your order has been successfully placed.

📋 *Order Details:*
Order ID: ${order.id}
Date: ${orderDate}
Time: ${orderTime}

📦 *Items Ordered:*
${itemsList}

💰 *Order Summary:*
Subtotal: ₹${order.pricing?.subtotal || 0}
Shipping: ₹${order.pricing?.shipping || 0}
Tax: ₹${order.pricing?.tax || 0}
*Total Amount: ₹${order.pricing?.total || 0}*

📍 *Delivery Address:*
${order.deliveryAddress ? order.deliveryAddress.street + ', ' + order.deliveryAddress.city : 'See order details'}

✅ *What's Next:*
1. Your order is being processed
2. You'll receive tracking details within 24 hours
3. Estimated delivery: 3-5 business days

📞 *Need Help?*
For order queries, reach out to us at:
WhatsApp: wa.me/919951130198
Email: support@vspelectronics.com

Thank you for choosing VSP Electronics!`;
  }

  /**
   * Generate WhatsApp status update message
   */
  private generateStatusUpdateMessage(order: Order, newStatus: string): string {
    const statusEmojis: { [key: string]: string } = {
      'confirmed': '✅',
      'processing': '⚙️',
      'shipped': '📦',
      'in_transit': '🚚',
      'delivered': '🎉',
      'cancelled': '❌',
      'pending': '⏳'
    };

    const emoji = statusEmojis[newStatus] || '📢';

    return `${emoji} *Order Status Update*

Your order ${order.id} status has been updated!

📊 *New Status: ${newStatus.toUpperCase()}*

For complete tracking details, visit:
Order: ${window.location.origin}/orders/${order.id}

Need help? Contact us on WhatsApp: wa.me/919951130198`;
  }

  /**
   * Generate WhatsApp tracking message
   */
  private generateTrackingMessage(order: Order, trackingInfo: any): string {
    return `📦 *Order Tracking Update*

Order ID: ${order.id}

📍 *Current Status:* ${trackingInfo.status || 'In Transit'}
📅 *Last Updated:* ${trackingInfo.lastUpdated || new Date().toLocaleDateString('en-IN')}

🚚 *Tracking Details:*
Carrier: ${trackingInfo.carrier || 'Standard Shipping'}
Tracking Number: ${trackingInfo.trackingNumber || 'N/A'}

📌 *Current Location:* ${trackingInfo.currentLocation || 'In Transit'}
⏰ *Expected Delivery:* ${trackingInfo.estimatedDelivery || 'See order details'}

Track your package in real-time:
${window.location.origin}/orders/${order.id}/tracking

Thank you for your patience!`;
  }

  /**
   * Generate HTML for email order confirmation
   */
  private generateOrderConfirmationHtml(order: Order, user: User): string {
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');

    let itemsHtml = '';
    if (order.items && Array.isArray(order.items)) {
      itemsHtml = order.items.map((item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name || 'Product'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('');
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table th { background: #667eea; color: white; padding: 12px; text-align: left; }
          .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
          .summary-total { display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #667eea; font-size: 18px; font-weight: bold; color: #667eea; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          .track-button { background: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Confirmation</h1>
            <p>Thank you for your purchase!</p>
          </div>
          <div class="content">
            <p>Hello ${user.firstName || user.name},</p>
            
            <p>Your order has been successfully placed and confirmed. Below are your order details.</p>

            <div class="section">
              <div class="section-title">📋 Order Information</div>
              <div class="summary-row">
                <span><strong>Order ID:</strong></span>
                <span>${order.id}</span>
              </div>
              <div class="summary-row">
                <span><strong>Order Date:</strong></span>
                <span>${orderDate}</span>
              </div>
              <div class="summary-row">
                <span><strong>Status:</strong></span>
                <span><strong style="color: #28a745;">Confirmed</strong></span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📦 Order Items</div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">💰 Order Summary</div>
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${order.pricing?.subtotal || 0}</span>
              </div>
              <div class="summary-row">
                <span>Shipping:</span>
                <span>₹${order.pricing?.shipping || 0}</span>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <span>₹${order.pricing?.tax || 0}</span>
              </div>
              <div class="summary-total">
                <span>Total Amount:</span>
                <span>₹${order.pricing?.total || 0}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📍 Delivery Address</div>
              <p>
                ${order.deliveryAddress?.street || 'N/A'}<br>
                ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}<br>
                ${order.deliveryAddress?.pincode || ''}
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${window.location.origin}/orders/${order.id}" class="button">View Order Details</a>
              <a href="${window.location.origin}/orders/${order.id}/tracking" class="button track-button">Track Order</a>
            </div>

            <div class="section">
              <div class="section-title">✅ What's Next?</div>
              <ol>
                <li>Your order is being processed</li>
                <li>You'll receive tracking details within 24 hours</li>
                <li>Estimated delivery: 3-5 business days</li>
              </ol>
            </div>

            <div class="footer">
              <p>If you have any questions about your order, please reply to this email or contact us.</p>
              <p>Email: support@vspelectronics.com | WhatsApp: +91 9951130198</p>
              <p>&copy; 2026 VSP Electronics. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Combine multiple notification responses
   */
  private combineNotifications(notifications: Observable<any>[]): Observable<NotificationResponse> {
    return new Observable(observer => {
      const results: NotificationResponse = {
        success: true,
        message: 'Notifications sent successfully',
        whatsappStatus: undefined,
        emailStatus: undefined
      };

      let completed = 0;

      notifications.forEach(notification => {
        notification.subscribe({
          next: (response) => {
            if (response.success) {
              if (response.whatsappStatus) {
                results.whatsappStatus = response.whatsappStatus;
              }
              if (response.emailStatus) {
                results.emailStatus = response.emailStatus;
              }
            }
            completed++;
            if (completed === notifications.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            completed++;
            results.success = false;
            if (completed === notifications.length) {
              observer.next(results);
              observer.complete();
            }
          }
        });
      });
    });
  }
}
