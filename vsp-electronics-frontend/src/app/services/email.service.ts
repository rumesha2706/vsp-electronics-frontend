import { Injectable, inject } from '@angular/core';
import { WhatsappApiService } from './whatsapp-api.service';
import { WhatsappMessageTemplateService } from './whatsapp-message-template.service';

declare const Email: any;

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private whatsappApiService = inject(WhatsappApiService);
  private templateService = inject(WhatsappMessageTemplateService);
  
  // Using SMTP.js for email sending - https://smtpjs.com/
  // This is a simple solution for testing. For production, use a proper backend
  
  async sendPasswordResetEmail(to: string, resetCode: string, userName: string): Promise<{success: boolean, message: string}> {
    try {
      // Check if Email.send is available
      if (typeof Email === 'undefined') {
        console.error('SMTP.js not loaded');
        return {
          success: false,
          message: 'Email service not available. Please ensure SMTP.js is loaded.'
        };
      }

      // Send email using SMTP.js
      const response = await Email.send({
        SecureToken: "YOUR_SMTP_TOKEN", // Will be configured with your test email
        To: to,
        From: "noreply@vspelectronics.com",
        Subject: "Password Reset Code - VSP Electronics",
        Body: this.getEmailTemplate(resetCode, userName)
      });

      if (response === 'OK') {
        return {
          success: true,
          message: 'Password reset code sent to your email'
        };
      } else {
        console.error('Email send failed:', response);
        return {
          success: false,
          message: 'Failed to send email. Please try again.'
        };
      }
    } catch (error) {
      console.error('Email error:', error);
      return {
        success: false,
        message: 'Failed to send email. Please try again.'
      };
    }
  }

  private getEmailTemplate(resetCode: string, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password for your VSP Electronics account.</p>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; color: #666;">Your password reset code is:</p>
              <div class="code">${resetCode}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This code will expire in <strong>30 minutes</strong></li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>

            <p>Enter this code on the password reset page to create a new password.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>VSP Electronics Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 VSP Electronics. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Alternative method using console for testing (when SMTP not configured)
  sendPasswordResetEmailTest(to: string, resetCode: string, userName: string): {success: boolean, message: string} {
    console.log('='.repeat(60));
    console.log('📧 PASSWORD RESET EMAIL');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Name: ${userName}`);
    console.log(`Reset Code: ${resetCode}`);
    console.log(`Expires: 30 minutes from now`);
    console.log('='.repeat(60));
    
    return {
      success: true,
      message: `Reset code sent! Check console for code (Testing mode)`
    };
  }

  async sendQuoteRequest(quoteData: any): Promise<{success: boolean, message: string}> {
    try {
      console.log('='.repeat(80));
      console.log('📋 QUOTE REQUEST SUBMISSION');
      console.log('='.repeat(80));
      console.log('Customer Information:');
      console.log(`  Name: ${quoteData.customer.firstName} ${quoteData.customer.lastName}`);
      console.log(`  Email: ${quoteData.customer.email}`);
      console.log(`  Phone: ${quoteData.customer.phone}`);
      console.log(`  Company: ${quoteData.customer.company || 'N/A'}`);
      console.log('');
      console.log('Billing Address:');
      console.log(`  ${quoteData.billingAddress.street}, ${quoteData.billingAddress.city}`);
      console.log(`  ${quoteData.billingAddress.state} - ${quoteData.billingAddress.pincode}`);
      console.log('');
      console.log('Items Requested:');
      quoteData.items.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.productName} - Qty: ${item.quantity}, Price: ₹${item.price}, Total: ₹${item.total}`);
      });
      console.log('');
      console.log(`Total Amount: ₹${quoteData.totalAmount}`);
      console.log(`Submitted At: ${new Date(quoteData.submittedAt).toLocaleString()}`);
      if (quoteData.notes) {
        console.log(`Notes: ${quoteData.notes}`);
      }
      console.log('='.repeat(80));

      // In production, send actual email here
      if (typeof Email !== 'undefined') {
        const response = await Email.send({
          SecureToken: "YOUR_SMTP_TOKEN",
          To: quoteData.customer.email,
          From: "noreply@vspelectronics.com",
          Subject: `Quote Request Confirmation - ${quoteData.items.length} Items`,
          Body: this.getQuoteRequestEmailTemplate(quoteData)
        });

        if (response === 'OK') {
          return {
            success: true,
            message: 'Quote request submitted successfully'
          };
        }
      }

      return {
        success: true,
        message: 'Quote request submitted successfully (Check console)'
      };
    } catch (error) {
      console.error('Quote request error:', error);
      return {
        success: false,
        message: 'Failed to submit quote request. Please try again.'
      };
    }
  }

  private getQuoteRequestEmailTemplate(quoteData: any): string {
    const itemsHtml = quoteData.items.map((item: any) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price}</td>
        <td>₹${item.total}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #667eea; color: white; }
          .total-row { background: #e8f0fe; font-weight: bold; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Quote Request Received</h1>
          </div>
          <div class="content">
            <p>Hello ${quoteData.customer.firstName} ${quoteData.customer.lastName},</p>
            <p>Thank you for submitting your quote request to VSP Electronics. We have received your request and will review it shortly.</p>
            
            <h3>Quote Details:</h3>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="3">Total Amount:</td>
                  <td>₹${quoteData.totalAmount}</td>
                </tr>
              </tbody>
            </table>

            <h3>Delivery Address:</h3>
            <p>
              ${quoteData.deliveryAddress.street}<br>
              ${quoteData.deliveryAddress.city}, ${quoteData.deliveryAddress.state} - ${quoteData.deliveryAddress.pincode}<br>
              ${quoteData.deliveryAddress.country}
            </p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Our team will contact you within 24 hours with pricing details and availability information.<br><br>
              Thank you for choosing VSP Electronics!<br><br>
              <strong>VSP Electronics Team</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 VSP Electronics. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOrderConfirmation(orderData: any): Promise<{success: boolean, message: string}> {
    try {
      console.log('='.repeat(80));
      console.log('📦 ORDER CONFIRMATION');
      console.log('='.repeat(80));
      console.log(`Order ID: ${orderData.orderId}`);
      console.log('');
      console.log('Customer Information:');
      console.log(`  Name: ${orderData.customer.firstName} ${orderData.customer.lastName}`);
      console.log(`  Email: ${orderData.customer.email}`);
      console.log(`  Phone: ${orderData.customer.phone}`);
      console.log('');
      console.log('Delivery Address:');
      console.log(`  ${orderData.deliveryAddress.street}, ${orderData.deliveryAddress.city}`);
      console.log(`  ${orderData.deliveryAddress.state} - ${orderData.deliveryAddress.pincode}`);
      console.log('');
      console.log('Items Ordered:');
      orderData.items.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.productName} - Qty: ${item.quantity}, Price: ₹${item.price}, Total: ₹${item.total}`);
      });
      console.log('');
      console.log('Price Summary:');
      console.log(`  Subtotal: ₹${orderData.pricing.subtotal}`);
      console.log(`  Shipping: ₹${orderData.pricing.shipping}`);
      console.log(`  Tax (18% GST): ₹${orderData.pricing.tax}`);
      console.log(`  Total: ₹${orderData.pricing.total}`);
      console.log(`  Payment Method: ${orderData.paymentMethod.toUpperCase()}`);
      console.log(`  Ordered At: ${new Date(orderData.orderedAt).toLocaleString()}`);
      if (orderData.notes) {
        console.log(`  Notes: ${orderData.notes}`);
      }
      console.log('='.repeat(80));

      // In production, send actual email here
      if (typeof Email !== 'undefined') {
        const response = await Email.send({
          SecureToken: "YOUR_SMTP_TOKEN",
          To: orderData.customer.email,
          From: "noreply@vspelectronics.com",
          Subject: `Order Confirmation - ${orderData.orderId}`,
          Body: this.getOrderConfirmationEmailTemplate(orderData)
        });

        if (response === 'OK') {
          return {
            success: true,
            message: 'Order confirmation sent successfully'
          };
        }
      }

      return {
        success: true,
        message: 'Order confirmation sent successfully (Check console)'
      };
    } catch (error) {
      console.error('Order confirmation error:', error);
      return {
        success: false,
        message: 'Failed to send order confirmation. Please contact support.'
      };
    }
  }

  private getOrderConfirmationEmailTemplate(orderData: any): string {
    const itemsHtml = orderData.items.map((item: any) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price}</td>
        <td>₹${item.total}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #667eea; color: white; }
          .total-row { background: #e8f0fe; font-weight: bold; }
          .section { margin: 25px 0; padding: 15px; background: white; border-radius: 6px; }
          .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed</h1>
            <p>Order ID: <strong>${orderData.orderId}</strong></p>
          </div>
          <div class="content">
            <p>Hello ${orderData.customer.firstName} ${orderData.customer.lastName},</p>
            <p>Thank you for your order! We've received it and will process it shortly. Here are your order details:</p>
            
            <h3>Order Items:</h3>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="2">Subtotal:</td>
                  <td></td>
                  <td>₹${orderData.pricing.subtotal}</td>
                </tr>
                <tr>
                  <td colspan="2">Shipping:</td>
                  <td></td>
                  <td>${orderData.pricing.shipping === 0 ? 'FREE' : '₹' + orderData.pricing.shipping}</td>
                </tr>
                <tr>
                  <td colspan="2">Tax (18% GST):</td>
                  <td></td>
                  <td>₹${orderData.pricing.tax}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">Order Total:</td>
                  <td></td>
                  <td>₹${orderData.pricing.total}</td>
                </tr>
              </tbody>
            </table>

            <div class="section">
              <h3>Delivery Address:</h3>
              <p>
                ${orderData.deliveryAddress.street}<br>
                ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} - ${orderData.deliveryAddress.pincode}<br>
                ${orderData.deliveryAddress.country}
              </p>
            </div>

            <div class="section">
              <h3>What's Next?</h3>
              <ul>
                <li>Your order will be processed and prepared for shipment</li>
                <li>You'll receive a shipping notification with tracking number</li>
                <li>Expected delivery: 3-5 business days</li>
                <li>Track your order using the tracking number provided</li>
              </ul>
            </div>

            <div class="section">
              <h3>Payment Method:</h3>
              <p><strong>${this.getPaymentMethodLabel(orderData.paymentMethod)}</strong></p>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              If you have any questions about your order, please don't hesitate to contact our customer support team.<br><br>
              Thank you for shopping with VSP Electronics!<br><br>
              <strong>VSP Electronics Team</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 VSP Electronics. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentMethodLabel(method: string): string {
    const methods: {[key: string]: string} = {
      'cod': 'Cash on Delivery',
      'debit': 'Debit Card',
      'credit': 'Credit Card',
      'upi': 'UPI Payment',
      'netbanking': 'Net Banking'
    };
    return methods[method] || method.toUpperCase();
  }

  async sendOrderConfirmationWhatsApp(orderData: any, templateName: string = 'premium'): Promise<{success: boolean, message: string}> {
    try {
      console.log('='.repeat(80));
      console.log('💬 WHATSAPP ORDER NOTIFICATION');
      console.log('='.repeat(80));
      console.log(`Order ID: ${orderData.orderId}`);
      console.log(`Customer Phone: +91${orderData.customer.phone}`);
      console.log(`Template: ${templateName}`);
      console.log('');

      // Get template from template service
      const template = this.templateService.getTemplateByName(templateName, orderData);
      
      console.log('WhatsApp Message:');
      console.log(template.messageText);
      if (template.imageUrl) {
        console.log(`Image URL: ${template.imageUrl}`);
      }
      console.log('');
      console.log('='.repeat(80));

      // Format phone number correctly
      const phoneNumber = this.whatsappApiService.formatPhoneNumber(orderData.customer.phone);
      
      // Validate phone number
      if (!this.whatsappApiService.validatePhoneNumber(phoneNumber)) {
        console.warn(`Invalid phone number format: ${phoneNumber}`);
        return {
          success: false,
          message: `Invalid phone number format: ${phoneNumber}`
        };
      }

      // Send via WhatsApp API service (with image support)
      const response = template.imageUrl
        ? await this.whatsappApiService.sendOrderConfirmationWithInvoice(
            phoneNumber,
            template.messageText,
            template.imageUrl,
            orderData.orderId,
            `${orderData.customer.firstName} ${orderData.customer.lastName}`
          )
        : await this.whatsappApiService.sendOrderConfirmation(
            phoneNumber,
            template.messageText,
            orderData.orderId,
            `${orderData.customer.firstName} ${orderData.customer.lastName}`,
            template.imageUrl
          );

      if (response.success) {
        console.log(`✅ WhatsApp message sent to: +${phoneNumber}`);
        return {
          success: true,
          message: `Order confirmation sent via WhatsApp to +91${orderData.customer.phone}`
        };
      } else {
        console.warn(`⚠️ WhatsApp send failed: ${response.error}`);
        return {
          success: false,
          message: response.message || 'Failed to send WhatsApp notification'
        };
      }
    } catch (error) {
      console.error('WhatsApp notification error:', error);
      return {
        success: false,
        message: 'Failed to send WhatsApp notification. Please contact support.'
      };
    }
  }

  /**
   * Get available template names for manual selection
   */
  getAvailableWhatsAppTemplates(): string[] {
    return this.templateService.getAllTemplateNames();
  }

  private getWhatsAppOrderMessage(orderData: any): string {
    const itemsList = orderData.items
      .map((item: any) => `• ${item.productName} (Qty: ${item.quantity}) - ₹${item.total}`)
      .join('\n');

    return `🎉 *Order Confirmed!*

Order ID: ${orderData.orderId}
Order Date: ${new Date(orderData.orderedAt).toLocaleDateString('en-IN')}

📦 *Items Ordered:*
${itemsList}

💰 *Price Breakdown:*
Subtotal: ₹${orderData.pricing.subtotal}
Shipping: ${orderData.pricing.shipping === 0 ? 'FREE' : '₹' + orderData.pricing.shipping}
Tax (18% GST): ₹${orderData.pricing.tax}
*Total Amount: ₹${orderData.pricing.total}*

🏠 *Delivery Address:*
${orderData.customer.firstName} ${orderData.customer.lastName}
${orderData.deliveryAddress.street}
${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} - ${orderData.deliveryAddress.pincode}

📞 *Customer Support:*
For queries, contact us at support@vspelectronics.com
Phone: +91-XXX-XXX-XXXX

⏱️ *Expected Delivery:* 3-5 business days

Thank you for shopping with VSP Electronics! 🙏`;
  }
}
