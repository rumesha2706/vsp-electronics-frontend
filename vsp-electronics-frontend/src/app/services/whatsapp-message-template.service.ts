import { Injectable } from '@angular/core';

/**
 * WhatsApp Message Template Service
 * Provides professional, modern message templates with image support
 */

export interface WhatsAppMessageTemplate {
  messageText: string;
  imageUrl?: string;
  mediaType?: 'image' | 'document' | 'video';
  buttons?: WhatsAppButton[];
}

export interface WhatsAppButton {
  text: string;
  url?: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappMessageTemplateService {

  /**
   * Professional Order Confirmation Template
   * With all order details and delivery information
   */
  getOrderConfirmationTemplate(orderData: any): WhatsAppMessageTemplate {
    const itemsList = orderData.items
      .map((item: any) => `  ✓ ${item.productName}\n    Qty: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}`)
      .join('\n\n');

    const messageText = `✅ *Order Confirmed Successfully!*

${this.getOrderDivider()}

📋 *Order Details*
Order ID: *${orderData.orderId}*
Date: ${new Date(orderData.orderedAt).toLocaleDateString('en-IN', { 
  weekday: 'short', 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
})}

${this.getOrderDivider()}

📦 *Your Items*
${itemsList}

${this.getOrderDivider()}

💰 *Price Breakdown*
Subtotal ............. ₹${orderData.pricing.subtotal.toLocaleString('en-IN')}
Shipping ............. ${orderData.pricing.shipping === 0 ? 'FREE 🎁' : '₹' + orderData.pricing.shipping.toLocaleString('en-IN')}
Tax (18% GST) ......... ₹${orderData.pricing.tax.toLocaleString('en-IN')}
${'━'.repeat(35)}
*Total Amount* ........ *₹${orderData.pricing.total.toLocaleString('en-IN')}*

${this.getOrderDivider()}

🏠 *Delivery Address*
${orderData.customer.firstName} ${orderData.customer.lastName}
${orderData.deliveryAddress.street}
${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state}
📍 PIN: ${orderData.deliveryAddress.pincode}

${this.getOrderDivider()}

⏱️  *Estimated Delivery*
3-5 Business Days

${this.getOrderDivider()}

📞 *Need Help?*
📧 Email: support@vspelectronics.com
💬 WhatsApp: https://wa.me/919951130198

*Thank you for shopping with VSP Electronics!* 🙏`;

    return {
      messageText,
      imageUrl: this.getOrderConfirmationBanner() // Optional banner image
    };
  }

  /**
   * Compact Order Confirmation (for quick preview)
   */
  getCompactOrderTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `✅ *Order Placed Successfully!*

*Order ID:* ${orderData.orderId}
*Amount:* ₹${orderData.pricing.total.toLocaleString('en-IN')}
*Delivery:* 3-5 Days

${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.pincode}

Track your order & get updates.
Tap the link below:
https://vspelectronics.com/order/${orderData.orderId}`;

    return {
      messageText,
      imageUrl: this.getOrderConfirmationBanner()
    };
  }

  /**
   * Premium Template with Item Details
   */
  getPremiumOrderTemplate(orderData: any): WhatsAppMessageTemplate {
    const itemsList = orderData.items
      .map((item: any) => {
        const itemTotal = (item.quantity * item.price).toLocaleString('en-IN');
        return `${item.productName}
      Quantity: ${item.quantity}
      Price: ₹${item.price.toLocaleString('en-IN')} × ${item.quantity}
      Subtotal: ₹${itemTotal}`;
      })
      .join('\n\n');

    const messageText = `🎉 *Your Order is Confirmed!*

${this.getPremiumDivider()}
ORDER DETAILS
${this.getPremiumDivider()}

*Order Number:* ${orderData.orderId}
*Order Date:* ${new Date(orderData.orderedAt).toLocaleDateString('en-IN')}
*Payment Method:* ${this.getPaymentMethodLabel(orderData.paymentMethod)}
*Order Status:* 🟢 Confirmed & Processing

${this.getPremiumDivider()}
ITEMS ORDERED (${orderData.items.length})
${this.getPremiumDivider()}

${itemsList}

${this.getPremiumDivider()}
ORDER SUMMARY
${this.getPremiumDivider()}

Subtotal ................. ₹${orderData.pricing.subtotal.toLocaleString('en-IN')}
Shipping Cost ............ ${orderData.pricing.shipping === 0 ? '🆓 FREE' : '₹' + orderData.pricing.shipping.toLocaleString('en-IN')}
GST & Taxes .............. ₹${orderData.pricing.tax.toLocaleString('en-IN')}
─────────────────────────────────
*TOTAL AMOUNT* ........... *₹${orderData.pricing.total.toLocaleString('en-IN')}*

${this.getPremiumDivider()}
DELIVERY DETAILS
${this.getPremiumDivider()}

*Recipient:* ${orderData.customer.firstName} ${orderData.customer.lastName}
*Phone:* ${orderData.customer.phone}

*Delivery Address:*
${orderData.deliveryAddress.street}
${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state}
Pincode: ${orderData.deliveryAddress.pincode}

${this.getPremiumDivider()}
WHAT'S NEXT?
${this.getPremiumDivider()}

📍 *Step 1:* Your order is being processed
📦 *Step 2:* We'll pack your items with care
🚚 *Step 3:* Delivery within 3-5 business days
✅ *Step 4:* Order delivered & verified

${this.getPremiumDivider()}

📞 *Questions?*
📧 Email us: support@vspelectronics.com
💬 Chat with us: https://wa.me/919951130198?text=I%20have%20question%20about%20my%20order

*Thank you for choosing VSP Electronics!*
We appreciate your business! 🙏`;

    return {
      messageText,
      imageUrl: this.getOrderConfirmationBanner()
    };
  }

  /**
   * Minimal Clean Template
   */
  getMinimalOrderTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `✅ Order Confirmed!

Order ID: ${orderData.orderId}
Amount: ₹${orderData.pricing.total.toLocaleString('en-IN')}
Delivery: ${orderData.deliveryAddress.city}
Estimated Delivery: 3-5 days

Thank you for shopping with us!`;

    return {
      messageText,
      imageUrl: this.getOrderConfirmationBanner()
    };
  }

  /**
   * Order Delivery Notification Template
   */
  getOrderDeliveryTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `🎉 *Your Order is On The Way!*

*Order ID:* ${orderData.orderId}

📦 *Items:*
${orderData.items.map((item: any) => `✓ ${item.productName}`).join('\n')}

🚚 *Status:* Out for Delivery

📍 *Delivery To:*
${orderData.deliveryAddress.street}
${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} ${orderData.deliveryAddress.pincode}

⏰ *Expected Delivery:* Today

Thanks for choosing VSP Electronics! 🙏`;

    return {
      messageText
    };
  }

  /**
   * Order Delivered Confirmation Template
   */
  getOrderDeliveredTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `✅ *Order Delivered Successfully!*

*Order ID:* ${orderData.orderId}
*Delivered To:* ${orderData.deliveryAddress.city}

Thank you for shopping with VSP Electronics!
Your satisfaction is our priority.

Have any feedback? We'd love to hear from you! 😊

📧 support@vspelectronics.com`;

    return {
      messageText
    };
  }

  /**
   * Pre-delivery Notification (24 hours before)
   */
  getPreDeliveryTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `📦 *Your Package is Coming Tomorrow!*

*Order ID:* ${orderData.orderId}

We're excited to deliver your order tomorrow!

📍 *Delivery Location:*
${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state}

⏰ *Delivery Window:* 9 AM - 5 PM

Please ensure someone is available to receive the package.

Questions? Contact us: https://wa.me/919951130198`;

    return {
      messageText
    };
  }

  /**
   * Multi-product Order with Item Images
   * Shows each item with its image and details
   */
  getDetailedOrderTemplate(orderData: any): WhatsAppMessageTemplate {
    const messageText = `🛍️ *Your Order Confirmed!*

${this.getOrderDivider()}

*Order ID:* ${orderData.orderId}
*Order Date:* ${new Date(orderData.orderedAt).toLocaleDateString('en-IN')}
*Status:* ✅ Confirmed

${this.getOrderDivider()}

📦 *Items Ordered (${orderData.items.length})*

${orderData.items.map((item: any, index: number) => `
${index + 1}. ${item.productName}
   SKU: ${item.productId || 'N/A'}
   Qty: ${item.quantity}
   Price: ₹${item.price.toLocaleString('en-IN')}
   Subtotal: ₹${(item.quantity * item.price).toLocaleString('en-IN')}
`).join('\n')}

${this.getOrderDivider()}

💳 *Bill Summary*

Subtotal ............... ₹${orderData.pricing.subtotal.toLocaleString('en-IN')}
Shipping ............... ${orderData.pricing.shipping === 0 ? 'FREE' : '₹' + orderData.pricing.shipping.toLocaleString('en-IN')}
Tax (18%) .............. ₹${orderData.pricing.tax.toLocaleString('en-IN')}
───────────────────────────
*Total Amount* ......... *₹${orderData.pricing.total.toLocaleString('en-IN')}*

${this.getOrderDivider()}

🚚 *Shipping & Delivery*

From: VSP Electronics
To: ${orderData.customer.firstName} ${orderData.customer.lastName}
Address: ${orderData.deliveryAddress.street}, ${orderData.deliveryAddress.city}
Pincode: ${orderData.deliveryAddress.pincode}

Estimated Delivery: 3-5 Business Days

${this.getOrderDivider()}

✨ *What's Next?*

1. Your order is being packed
2. We'll send tracking details soon
3. Package will arrive in 3-5 days
4. You'll receive SMS/WhatsApp updates

${this.getOrderDivider()}

💬 *Get Support*
📧 Email: support@vspelectronics.com
☎️ WhatsApp: https://wa.me/919951130198
🌐 Website: https://vspelectronics.com

Thank you for shopping with VSP Electronics! 🎁`;

    return {
      messageText,
      imageUrl: this.getOrderConfirmationBanner()
    };
  }

  /**
   * Get banner image URL for order confirmation
   * Can be customized with your own image URL
   */
  private getOrderConfirmationBanner(): string {
    // Return your order confirmation banner image URL
    // Example: https://your-domain.com/images/order-confirmation-banner.png
    return 'https://via.placeholder.com/500x250/8B6F47/FFFFFF?text=Order+Confirmed';
  }

  /**
   * Utility: Create divider for better formatting
   */
  private getOrderDivider(): string {
    return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  }

  /**
   * Utility: Premium divider
   */
  private getPremiumDivider(): string {
    return '╔════════════════════════════════════╗';
  }

  /**
   * Get payment method label
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'cod': 'Cash on Delivery',
      'upi': 'UPI Payment',
      'debit': 'Debit Card',
      'credit': 'Credit Card',
      'netbanking': 'Net Banking',
      'wallet': 'Digital Wallet'
    };
    return labels[method] || method.toUpperCase();
  }

  /**
   * Generate HTML invoice (for future use with image support)
   */
  generateInvoiceImage(orderData: any): Promise<Blob> {
    // This can be used to generate invoice as image
    // Example: Using html2canvas library to convert HTML to image
    return Promise.resolve(new Blob());
  }

  /**
   * Get template by name
   */
  getTemplateByName(templateName: string, orderData: any): WhatsAppMessageTemplate {
    const templates: { [key: string]: (data: any) => WhatsAppMessageTemplate } = {
      'professional': (data) => this.getOrderConfirmationTemplate(data),
      'compact': (data) => this.getCompactOrderTemplate(data),
      'premium': (data) => this.getPremiumOrderTemplate(data),
      'minimal': (data) => this.getMinimalOrderTemplate(data),
      'detailed': (data) => this.getDetailedOrderTemplate(data),
      'delivery': (data) => this.getOrderDeliveryTemplate(data),
      'delivered': (data) => this.getOrderDeliveredTemplate(data),
      'pre-delivery': (data) => this.getPreDeliveryTemplate(data)
    };

    return templates[templateName]?.(orderData) || this.getOrderConfirmationTemplate(orderData);
  }

  /**
   * Get all available templates
   */
  getAllTemplateNames(): string[] {
    return [
      'professional',
      'compact',
      'premium',
      'minimal',
      'detailed',
      'delivery',
      'delivered',
      'pre-delivery'
    ];
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format date for WhatsApp
   */
  formatDateForWhatsApp(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
