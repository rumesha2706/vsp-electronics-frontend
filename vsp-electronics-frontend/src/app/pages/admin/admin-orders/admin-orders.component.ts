import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { Order, OrderStatus } from '../../../models/order.model';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-admin-orders',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './admin-orders.component.html',
    styleUrls: ['./admin-orders.component.css']
})
export class AdminOrdersComponent implements OnInit {
    orderService = inject(OrderService);
    private titleService = inject(Title);

    orders = signal<Order[]>([]);
    isLoading = signal(false);
    currentPage = signal(1);
    totalOrders = signal(0);
    statusFilter = signal<string>(''); // empty = all
    searchQuery = signal<string>('');
    startDate = signal<string>('');
    endDate = signal<string>('');
    paymentStatusFilter = signal<string>('');
    paymentMethodFilter = signal<string>('');
    minAmount = signal<number | null>(null);
    maxAmount = signal<number | null>(null);

    // Modal State
    showConfirmModal = signal(false);
    selectedOrder = signal<Order | null>(null);
    selectedStatus = signal<OrderStatus | null>(null);

    orderStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

    constructor() {
        this.titleService.setTitle('Manage Orders | VSP Electronics Admin');
    }

    ngOnInit() {
        this.loadOrders();
    }

    loadOrders() {
        this.isLoading.set(true);
        this.orderService.getAllOrders({
            limit: 20,
            page: this.currentPage(),
            status: this.statusFilter(),
            startDate: this.startDate(),
            endDate: this.endDate(),
            search: this.searchQuery(),
            paymentStatus: this.paymentStatusFilter(),
            paymentMethod: this.paymentMethodFilter(),
            minTotal: this.minAmount() || undefined,
            maxTotal: this.maxAmount() || undefined
        }).subscribe({
            next: (response) => {
                this.orders.set(response.orders);
                this.totalOrders.set(response.total);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading orders:', err);
                this.isLoading.set(false);
            }
        });
    }

    applyFilters() {
        this.currentPage.set(1);
        this.loadOrders();
    }

    resetFilters() {
        this.searchQuery.set('');
        this.startDate.set('');
        this.endDate.set('');
        this.statusFilter.set('');
        this.paymentStatusFilter.set('');
        this.paymentMethodFilter.set('');
        this.minAmount.set(null);
        this.maxAmount.set(null);
        this.currentPage.set(1);
        this.loadOrders();
    }

    onStatusFilterChange(status: string) {
        this.statusFilter.set(status);
        this.currentPage.set(1);
        this.loadOrders();
    }

    updateStatus(order: Order, newStatus: string) {
        this.selectedOrder.set(order);
        this.selectedStatus.set(newStatus as OrderStatus);
        this.showConfirmModal.set(true);
    }

    confirmUpdate() {
        const order = this.selectedOrder();
        const newStatus = this.selectedStatus();

        if (!order || !newStatus) return;

        this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
            next: (updatedOrder) => {
                // Update local list
                const currentOrders = this.orders();
                const index = currentOrders.findIndex(o => o.id === order.id);
                if (index !== -1) {
                    currentOrders[index].status = newStatus;
                    this.orders.set([...currentOrders]);
                }
                this.closeModal();
            },
            error: (err) => {
                console.error('Error updating status:', err);
                alert('Failed to update status. Please try again.');
                this.closeModal();
            }
        });
    }

    closeModal() {
        this.showConfirmModal.set(false);
        this.selectedOrder.set(null);
        this.selectedStatus.set(null);
    }

    getStatusColor(status: string): string {
        return this.orderService.getOrderStatusColor(status as OrderStatus);
    }

    getStatusIcon(status: string): string {
        return this.orderService.getOrderStatusIcon(status as OrderStatus);
    }

    nextPage() {
        if (this.orders().length === 20) { // Simple check, could use total match
            this.currentPage.update(p => p + 1);
            this.loadOrders();
        }
    }

    prevPage() {
        if (this.currentPage() > 1) {
            this.currentPage.update(p => p - 1);
            this.loadOrders();
        }
    }
}
