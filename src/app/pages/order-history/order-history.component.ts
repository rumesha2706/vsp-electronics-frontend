import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Order } from '../../models/order.model';

@Component({
    selector: 'app-order-history',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './order-history.component.html',
    styleUrls: ['./order-history.component.css']
})
export class OrderHistoryComponent implements OnInit {
    orderService = inject(OrderService);
    authService = inject(AuthService);

    orders: Order[] = [];
    loading = true;
    error = '';

    currentPage = 1;
    pageSize = 10;
    totalOrders = 0;

    ngOnInit() {
        if (!this.authService.isAuthenticated()) {
            this.error = 'Please login to view order history';
            this.loading = false;
            return;
        }
        this.loadOrders();
    }

    loadOrders() {
        this.loading = true;
        this.orderService.getUserOrders(this.authService.currentUser()?.id, this.pageSize, this.currentPage)
            .subscribe({
                next: (response) => {
                    this.orders = response.orders;
                    this.totalOrders = response.total;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error loading orders:', err);
                    this.error = 'Failed to load order history';
                    this.loading = false;
                }
            });
    }

    nextPage() {
        if (this.currentPage * this.pageSize < this.totalOrders) {
            this.currentPage++;
            this.loadOrders();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadOrders();
        }
    }
}
