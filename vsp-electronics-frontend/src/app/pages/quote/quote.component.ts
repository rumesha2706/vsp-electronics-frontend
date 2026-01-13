import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quote',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.css']
})
export class QuoteComponent {
  quoteService = inject(QuoteService);
  router = inject(Router);

  updateQuantity(productId: string, quantity: number) {
    this.quoteService.updateQuantity(productId, quantity);
  }

  removeItem(productId: string) {
    this.quoteService.removeFromQuote(productId);
  }

  clearQuote() {
    if (confirm('Are you sure you want to clear the quote?')) {
      this.quoteService.clearQuote();
    }
  }

  proceedToCheckout() {
    this.router.navigate(['/quote-checkout']);
  }
}

