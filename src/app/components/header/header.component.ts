import { Component, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { QuoteService } from '../../services/quote.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AuthModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  cartService = inject(CartService);
  quoteService = inject(QuoteService);
  wishlistService = inject(WishlistService);
  authService = inject(AuthService);
  router = inject(Router);

  menuOpen = false;
  searchOpen = false;
  searchQuery = '';
  compareCount = 0;
  showAuthModal = false;
  authModalMessage = '';
  authModalTab: 'login' | 'signup' | 'forgot' = 'login';
  showUserDropdown = false;
  currentTheme: 'default' | 'blue' = 'default';

  ngOnInit() {
    const theme = localStorage.getItem('vsl-theme') || 'default';
    this.applyTheme(theme as 'default' | 'blue');
  }

  applyTheme(theme: 'default' | 'blue') {
    if (theme === 'blue') {
      document.body.setAttribute('data-theme', 'blue');
      this.currentTheme = 'blue';
      localStorage.setItem('vsl-theme', 'blue');
    } else {
      document.body.removeAttribute('data-theme');
      this.currentTheme = 'default';
      localStorage.setItem('vsl-theme', 'default');
    }
  }

  toggleTheme() {
    this.applyTheme(this.currentTheme === 'blue' ? 'default' : 'blue');
  }

  resetTheme() {
    localStorage.removeItem('vsl-theme');
    this.applyTheme('default');
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  openAuthModal(message: string = '', tab: 'login' | 'signup' = 'login') {
    this.authModalMessage = message;
    this.authModalTab = tab;
    this.showAuthModal = true;
  }

  closeAuthModal() {
    this.showAuthModal = false;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/shop'], {
        queryParams: { search: this.searchQuery.trim() }
      });
      // Close search bar on mobile if open
      this.searchOpen = false;
    }
  }

  closeQuoteSidebar() {
    this.quoteService.closeSidebar();
  }

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
  }

  onLogout() {
    this.authService.logout();
    this.showUserDropdown = false;
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
      this.showUserDropdown = false;
    }
  }
}
