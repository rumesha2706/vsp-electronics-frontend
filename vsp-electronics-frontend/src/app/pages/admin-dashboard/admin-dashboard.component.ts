import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private productService = inject(ProductService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  analyticsSummary: any = null;
  totalProducts = 0;
  totalUsers = 0;
  recentTransactions: any[] = [];

  ngOnInit() {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadDashboardData();
  }

  loadDashboardData() {
    // Get analytics summary
    this.analyticsSummary = this.analyticsService.getAnalyticsSummary();
    
    // Get total products
    this.totalProducts = this.productService.getAllProducts().length;
    
    // Get total users - getAllUsers now returns an empty array as a placeholder
    // This should be fetched from the backend API
    this.totalUsers = 0; // Placeholder value
    
    // Get recent transactions
    this.recentTransactions = this.analyticsService.getTodayTransactions().slice(0, 10);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
