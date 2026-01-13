import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface WhatsAppMessagePayload {
  phoneNumber: string; // Format: 91XXXXXXXXXX (country code + number)
  message: string;
  imageUrl?: string; // Optional image URL
  mediaType?: 'image' | 'document' | 'video'; // Type of media
  orderId?: string;
  customerName?: string;
  messageType: 'order_confirmation' | 'order_update' | 'inquiry_response' | 'general';
}

export interface WhatsAppSendResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappApiService {
  private apiBaseUrl = '/api'; // Backend API endpoint

  constructor(private http: HttpClient) {}

  /**
   * Send WhatsApp message with optional image/media to customer via backend API
   * Supports Twilio, WhatsApp Business API, or custom SMS gateway
   */
  async sendWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResponse> {
    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post<WhatsAppSendResponse>(
          `${this.apiBaseUrl}/whatsapp/send`,
          payload,
          { headers }
        )
      );

      return response;
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send WhatsApp message via API'
      };
    }
  }

  /**
   * Send order confirmation WhatsApp message with optional image
   */
  async sendOrderConfirmation(
    phoneNumber: string,
    message: string,
    orderId: string,
    customerName: string,
    imageUrl?: string
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      imageUrl,
      orderId,
      customerName,
      messageType: 'order_confirmation'
    });
  }

  /**
   * Send message with image attachment
   */
  async sendMessageWithImage(
    phoneNumber: string,
    message: string,
    imageUrl: string,
    mediaType: 'image' | 'document' | 'video' = 'image'
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      imageUrl,
      mediaType,
      messageType: 'general'
    });
  }

  /**
   * Send order confirmation with invoice image
   */
  async sendOrderConfirmationWithInvoice(
    phoneNumber: string,
    message: string,
    invoiceImageUrl: string,
    orderId: string,
    customerName: string
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      imageUrl: invoiceImageUrl,
      mediaType: 'document',
      orderId,
      customerName,
      messageType: 'order_confirmation'
    });
  }

  /**
   * Send order status update
   */
  async sendOrderUpdate(
    phoneNumber: string,
    message: string,
    orderId: string
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      orderId,
      messageType: 'order_update'
    });
  }

  /**
   * Send inquiry response
   */
  async sendInquiryResponse(
    phoneNumber: string,
    message: string
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      messageType: 'inquiry_response'
    });
  }

  /**
   * Send general WhatsApp message
   */
  async sendGeneralMessage(
    phoneNumber: string,
    message: string
  ): Promise<WhatsAppSendResponse> {
    return this.sendWhatsAppMessage({
      phoneNumber,
      message,
      messageType: 'general'
    });
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBaseUrl}/whatsapp/status/${messageId}`)
      );
      return response;
    } catch (error) {
      console.error('Failed to get message status:', error);
      return null;
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Check if format is 91XXXXXXXXXX (Indian format)
    const phoneRegex = /^91\d{10}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to WhatsApp format (91XXXXXXXXXX)
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If already starts with 91, return as is
    if (cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // If 10 digits, add 91 prefix
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    
    // If 12 digits starting with +91, remove + and return
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    return cleaned;
  }
}
