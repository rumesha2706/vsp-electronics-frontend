import { Component, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuoteService } from '../../services/quote.service';

@Component({
  selector: 'app-quote-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quote-sidebar.component.html',
  styleUrls: ['./quote-sidebar.component.css']
})
export class QuoteSidebarComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  
  quoteService = inject(QuoteService);

  get quoteItems() {
    return this.quoteService.getQuoteItems();
  }

  get quoteCount() {
    return this.quoteService.quoteCount();
  }

  closeSidebar() {
    this.close.emit();
  }

  removeItem(productId: string) {
    this.quoteService.removeFromQuote(productId);
  }

  updateQuantity(productId: string, change: number) {
    const item = this.quoteService.getQuoteItems().find(i => i.product.id === productId);
    if (item) {
      this.quoteService.updateQuantity(productId, item.quantity + change);
    }
  }

  submitQuoteRequest() {
    const quoteItems = this.quoteService.getQuoteItems();
    
    if (quoteItems.length === 0) {
      alert('Please add items to your quote before submitting.');
      return;
    }
    
    // Send quote request via email or WhatsApp
    const message = this.formatQuoteMessage(quoteItems);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Clear the quote after submission
    this.quoteService.clearQuote();
    this.closeSidebar();
    
    alert('Quote request sent! Thank you for your interest.');
  }

  private formatQuoteMessage(items: any[]): string {
    const itemsText = items
      .map(item => `• ${item.product.name} - Qty: ${item.quantity} (₹${item.product.price}/unit)`)
      .join('\n');
    
    return `*Quote Request* 📋\n\nI'm interested in the following items:\n\n${itemsText}\n\nPlease provide a quotation.\n\nThank you!`;
  }
}
