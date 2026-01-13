import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { WhatsappService, WhatsAppMessage } from '../../services/whatsapp.service';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp.component.html',
  styleUrls: ['./whatsapp.component.css']
})
export class WhatsappComponent implements OnInit {
  private authService = inject(AuthService);
  private whatsappService = inject(WhatsappService);
  
  currentUser: User | null = null;
  isUserLoggedIn = false;
  currentUserPhone: string | null = null;
  
  // Message templates
  messageTemplates: WhatsAppMessage[] = [];
  selectedTemplate: WhatsAppMessage | null = null;
  customMessage = '';
  selectedMessageType = 'predefined';
  
  ngOnInit() {
    // Check if user is logged in
    this.currentUser = this.authService.currentUser();
    if (this.currentUser && this.currentUser.phone) {
      this.isUserLoggedIn = true;
      this.currentUserPhone = this.currentUser.phone;
    }
    
    // Load message templates
    this.messageTemplates = this.whatsappService.getMessageTemplates();
    if (this.messageTemplates.length > 0) {
      this.selectedTemplate = this.messageTemplates[0];
    }
  }

  selectMessageType(type: 'predefined' | 'custom') {
    this.selectedMessageType = type;
  }

  selectTemplate(template: WhatsAppMessage) {
    this.selectedTemplate = template;
  }

  // Get the current message to send
  getCurrentMessage(): string {
    if (this.selectedMessageType === 'custom') {
      return this.customMessage;
    }
    
    if (this.selectedTemplate && this.currentUser) {
      return this.selectedTemplate.generateMessage(this.currentUser);
    }
    
    return '';
  }

  // Send message to business WhatsApp
  sendMessageToBusinessNumber() {
    const message = this.getCurrentMessage();
    if (message.trim()) {
      this.whatsappService.sendToBusinessNumber(message);
    }
  }

  // Send message to customer (for admin/business use)
  sendMessageToCustomer() {
    if (!this.isUserLoggedIn || !this.currentUserPhone) {
      alert('Please login to receive messages');
      return;
    }
    
    const message = this.getCurrentMessage();
    if (message.trim()) {
      this.whatsappService.sendToUserNumber(this.currentUserPhone, message);
    }
  }

  // Get preview of the message
  getMessagePreview(): string {
    return this.getCurrentMessage();
  }

  // Get user orders info
  getUserOrders() {
    return this.whatsappService.getUserOrders();
  }

  // Get user cart items
  getUserCart() {
    return this.whatsappService.getUserCart();
  }
}
