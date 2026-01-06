import { Injectable, inject } from '@angular/core';
import { AuthService, User } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { CartService } from './cart.service';
import { ProductService } from './product.service';

export interface WhatsAppMessage {
  title: string;
  template: string;
  generateMessage: (user: User, data?: any) => string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  
  // WhatsApp business number (for customers to contact VSP Electronics support)
  supportBusinessNumber = '919951130198'; // VSP Electronics Support WhatsApp number

  // Generate order confirmation message (to send TO customer)
  generateOrderConfirmationMessage(user: User, orderData: any): string {
    const orderDate = new Date(orderData.timestamp || Date.now()).toLocaleDateString('en-IN');
    const orderTime = new Date(orderData.timestamp || Date.now()).toLocaleTimeString('en-IN');
    
    let itemsList = '';
    if (orderData.items && Array.isArray(orderData.items)) {
      itemsList = orderData.items.map((item: any, index: number) => 
        `${index + 1}. ${item.name || item.productName}\n   Qty: ${item.quantity} × ₹${item.price}`
      ).join('\n');
    }

    const message = `🎉 *Order Confirmation - VSP Electronics* 🎉

Hello ${user.name},

Thank you for your order! Your order has been successfully placed.

📋 *Order Details:*
Order ID: ${orderData.orderId || 'TXN' + Date.now()}
Date: ${orderDate}
Time: ${orderTime}

📦 *Items Ordered:*
${itemsList || 'Items: ' + (orderData.items || 'See order details')}

💰 *Order Summary:*
Subtotal: ₹${orderData.subtotal || orderData.amount || 0}
Shipping: ₹${orderData.shipping || 0}
*Total Amount: ₹${orderData.amount || orderData.total || 0}*

✅ *What's Next:*
1. Your order is being processed
2. You'll receive tracking details within 24 hours
3. Estimated delivery: 3-5 business days

📞 *Need Help?*
For order queries, reach out to us at:
WhatsApp: https://wa.me/${this.supportBusinessNumber}
Email: support@vspelectronics.com

Thank you for choosing VSP Electronics!

Best regards,
VSP Electronics Team`;

    return message;
  }

  // Get user's orders from transactions
  getUserOrders() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    
    const allTransactions = this.analyticsService.getTransactions();
    return allTransactions.filter(t => t.userId === currentUser.id && t.type === 'order');
  }

  // Get user's current cart
  getUserCart() {
    return this.cartService.getCartItems();
  }

  // Generate product inquiry message
  generateProductInquiryMessage(user: User, productName?: string): string {
    const message = `Hi VSP Electronics Team,

I am interested in your products. I would like to know more about:
${productName ? `- ${productName}` : '- Your available products and specifications'}

Please share:
✓ Product details and specifications
✓ Pricing and available variants
✓ Delivery timeline
✓ Any bulk discounts available

My contact details:
Name: ${user.name}
Phone: ${user.phone}
Email: ${user.email}

Looking forward to hearing from you.

Thank you!`;
    
    return message;
  }

  // Generate order status message
  generateOrderStatusMessage(user: User): string {
    const orders = this.getUserOrders();
    const orderCount = orders.length;
    const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
    
    let message = `Hi VSP Electronics Team,

I would like to check the status of my order(s).

My Details:
Name: ${user.name}
Phone: ${user.phone}
Email: ${user.email}`;

    if (lastOrder) {
      const lastOrderDate = new Date(lastOrder.timestamp).toLocaleDateString('en-IN');
      message += `

Last Order Details:
Order Date: ${lastOrderDate}
Items Ordered: ${lastOrder.items}
Amount: ₹${lastOrder.amount}`;
    }

    message += `

Please provide:
✓ Current order status
✓ Estimated delivery date
✓ Tracking information (if available)
✓ Any updates on pending orders

Thank you!`;

    return message;
  }

  // Generate technical support message
  generateTechnicalSupportMessage(user: User, productName?: string): string {
    const message = `Hi VSP Electronics Team,

I need technical support for ${productName ? `my ${productName}` : 'my recent purchase'}.

My Details:
Name: ${user.name}
Phone: ${user.phone}
Email: ${user.email}

Issues/Questions:
- Please let me know what technical assistance you can provide
- I can provide more details about the issue

Could you please help me with:
✓ Troubleshooting assistance
✓ Product documentation
✓ Replacement/warranty information (if applicable)
✓ Setup and configuration help

Thank you for your support!`;

    return message;
  }

  // Generate bulk order message
  generateBulkOrderMessage(user: User, quantity?: number, category?: string): string {
    const message = `Hi VSP Electronics Team,

I am interested in placing a bulk order.

My Details:
Name: ${user.name}
Phone: ${user.phone}
Email: ${user.email}

Order Requirements:
${quantity ? `Approximate Quantity: ${quantity} units` : 'Quantity: To be discussed'}
${category ? `Category: ${category}` : 'Category: Open to suggestions'}

Could you please provide:
✓ Bulk pricing and available discounts
✓ Minimum order quantity requirements
✓ Lead time for bulk orders
✓ Payment terms and conditions
✓ Delivery options
✓ Warranty and support for bulk orders

I look forward to discussing this opportunity with you.

Thank you!`;

    return message;
  }

  // Generate ready to deliver notification
  generateReadyToDeliverMessage(user: User, productNames: string[]): string {
    const message = `Hi ${user.name},

Good news! Your requested products are now ready for delivery:

${productNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

Your Contact Details:
Phone: ${user.phone}
Email: ${user.email}

We can ship these items immediately. Please confirm:
✓ Delivery address
✓ Preferred delivery time
✓ Any special delivery instructions

Click on the link below or reply to confirm your delivery details:
https://localhost:4200/order-confirmation

Thank you for your order!
VSP Electronics Team`;

    return message;
  }

  // Generate personalized quote request message
  generateQuoteRequestMessage(user: User, items?: Array<{name: string, quantity: number}>): string {
    let itemList = '';
    if (items && items.length > 0) {
      itemList = items.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n');
    }

    const message = `Hi VSP Electronics Team,

I would like to request a quote for the following items:

${itemList || 'Please provide a list of available products and pricing'}

My Details:
Name: ${user.name}
Phone: ${user.phone}
Email: ${user.email}

Required Details:
✓ Item-wise pricing
✓ Total amount
✓ Delivery timeline
✓ Payment terms
✓ Any available discounts

Please send me a detailed quote at your earliest convenience.

Thank you!`;

    return message;
  }

  // Send WhatsApp message to business support
  sendToBusinessNumber(message: string) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${this.supportBusinessNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  // Send order confirmation to customer's WhatsApp number
  sendOrderConfirmationToCustomer(orderData: any, customerPhone?: string) {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      console.error('No user logged in');
      return false;
    }

    // Use provided phone or fallback to logged-in user's phone
    const phoneToSendTo = customerPhone || currentUser.phone;
    
    if (!phoneToSendTo) {
      console.error('No phone number found for customer');
      return false;
    }

    const message = this.generateOrderConfirmationMessage(currentUser, orderData);
    const encodedMessage = encodeURIComponent(message);
    
    // Format phone number for WhatsApp (ensure it starts with country code)
    let formattedPhone = phoneToSendTo.replace(/\D/g, ''); // Remove all non-digits
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }
    
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    console.log('📱 Sending order confirmation to:', phoneToSendTo);
    window.open(whatsappUrl, '_blank');
    
    return true;
  }

  // Send WhatsApp message to user (for admin/business use)
  sendToUserNumber(userPhone: string, message: string) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${userPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  // Get all predefined message templates for logged-in user
  getMessageTemplates(): WhatsAppMessage[] {
    const currentUser = this.authService.currentUser();
    
    if (!currentUser) {
      return [
        {
          title: 'Product Inquiry',
          template: 'Ask about product details and pricing',
          generateMessage: () => 'Hi, I would like to know more about your products.'
        },
        {
          title: 'Order Status',
          template: 'Check your order status',
          generateMessage: () => 'Hi, I would like to check my order status.'
        },
        {
          title: 'Technical Support',
          template: 'Get technical assistance',
          generateMessage: () => 'Hi, I need technical support for my purchase.'
        },
        {
          title: 'Bulk Order',
          template: 'Place a bulk order inquiry',
          generateMessage: () => 'Hi, I am interested in placing a bulk order.'
        }
      ];
    }

    return [
      {
        title: 'Product Inquiry',
        template: 'Ask about product details and pricing',
        generateMessage: (user: User) => this.generateProductInquiryMessage(user)
      },
      {
        title: 'Order Status',
        template: 'Check your order status',
        generateMessage: (user: User) => this.generateOrderStatusMessage(user)
      },
      {
        title: 'Technical Support',
        template: 'Get technical assistance',
        generateMessage: (user: User) => this.generateTechnicalSupportMessage(user)
      },
      {
        title: 'Bulk Order',
        template: 'Place a bulk order inquiry',
        generateMessage: (user: User) => this.generateBulkOrderMessage(user)
      }
    ];
  }

  /**
   * Send verification code via WhatsApp
   */
  sendVerificationCodeViaWhatsapp(phoneNumber: string, verificationCode: string, purpose: 'signup' | 'password-reset' | 'email-change' = 'signup'): { success: boolean; message: string } {
    try {
      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 10) {
        return {
          success: false,
          message: 'Invalid phone number'
        };
      }

      // Format phone number - ensure it has country code
      let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone; // Add India country code
      }

      // Generate purpose-specific message
      const purposeMessages = {
        'signup': `🎉 *Welcome to VSP Electronics!*\n\nYour verification code is:\n\n*${verificationCode}*\n\nThis code expires in 24 hours.\n\nIf you didn't sign up, please ignore this message.`,
        'password-reset': `🔐 *Password Reset Request*\n\nYour password reset code is:\n\n*${verificationCode}*\n\nThis code expires in 24 hours.\n\nIf you didn't request this, please ignore this message.`,
        'email-change': `🔒 *Confirm Email Change*\n\nYour email change verification code is:\n\n*${verificationCode}*\n\nThis code expires in 24 hours.\n\nIf you didn't request this, please ignore this message.`
      };

      const message = purposeMessages[purpose];

      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      
      // Open in new window
      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
      }

      console.log(`✅ WhatsApp verification code sent to ${formattedPhone}`);

      return {
        success: true,
        message: `Verification code sent via WhatsApp to ${phoneNumber}`
      };
    } catch (error) {
      console.error('WhatsApp verification error:', error);
      return {
        success: false,
        message: 'Failed to send WhatsApp message. Please try again.'
      };
    }
  }

  /**
   * Generate verification code message
   */
  generateVerificationMessage(phoneNumber: string, code: string, purpose: 'signup' | 'password-reset' | 'email-change' = 'signup'): string {
    const purposeTexts = {
      'signup': '🎉 Welcome to VSP Electronics! Your verification code is',
      'password-reset': '🔐 Password Reset Request. Your verification code is',
      'email-change': '🔒 Confirm Email Change. Your verification code is'
    };

    return `${purposeTexts[purpose]}:\n\n*${code}*\n\nThis code expires in 24 hours.`;
  }
}
