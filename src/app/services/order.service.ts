import { Injectable, inject, signal, computed } from '@angular/core';
import { Order, OrderTracking, OrderListResponse, OrderStatus } from '../models/order.model';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private orders = signal<Order[]>([]);
  private selectedOrder = signal<Order | null>(null);
  private orderTracking = signal<OrderTracking | null>(null);
  private loading = signal(false);
  private error = signal<string | null>(null);

  // Observable streams for backward compatibility
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$ = this.ordersSubject.asObservable();

  // Computed values
  public ordersList = computed(() => this.orders());
  public currentOrder = computed(() => this.selectedOrder());
  public trackingInfo = computed(() => this.orderTracking());
  public isLoading = computed(() => this.loading());
  public errorMessage = computed(() => this.error());

  /**
   * Create a new order - saves to database and auto-sends notifications
   */
  /**
   * Create a new order - saves to database and auto-sends notifications
   */
  createOrder(orderData: any): Observable<Order> {
    this.loading.set(true);

    try {
      // Prepare order payload for API (matching orders-router.js /create)
      const apiPayload = {
        shippingAddress: {
          firstName: orderData.customer?.firstName,
          lastName: orderData.customer?.lastName,
          email: orderData.customer?.email,
          phone: orderData.customer?.phone,
          company: orderData.customer?.company,
          designation: orderData.customer?.designation,
          address: orderData.deliveryAddress?.street,
          city: orderData.deliveryAddress?.city,
          state: orderData.deliveryAddress?.state,
          zipCode: orderData.deliveryAddress?.pincode,
          country: orderData.deliveryAddress?.country || 'India'
        },
        items: Array.isArray(orderData.items) ? orderData.items : [],
        paymentMethod: orderData.paymentMethod || 'cod',
        notifyVia: 'both' // Trigger both email and whatsapp
      };

      console.log('🔄 OrderService: Creating order with payload:', apiPayload);

      // Call backend API to create order
      return this.http.post<any>(`${environment.apiUrl}/orders/create`, apiPayload).pipe(
        map((response: any) => {
          console.log('✅ API Response received:', response);

          // Map backend response to Order model
          const savedOrder = response.data?.order;

          const order: Order = {
            id: savedOrder?.id ? String(savedOrder.id) : `ORD-${Date.now()}`,
            userId: orderData.userId || null,
            customer: {
              firstName: apiPayload.shippingAddress.firstName,
              lastName: apiPayload.shippingAddress.lastName,
              email: apiPayload.shippingAddress.email,
              phone: apiPayload.shippingAddress.phone || ''
            },
            items: apiPayload.items || [],
            deliveryAddress: {
              street: apiPayload.shippingAddress.address,
              city: apiPayload.shippingAddress.city,
              state: apiPayload.shippingAddress.state,
              country: apiPayload.shippingAddress.country,
              pincode: apiPayload.shippingAddress.zipCode
            },
            pricing: {
              total: savedOrder?.total || 0,
              subtotal: savedOrder?.subtotal || 0,
              tax: savedOrder?.tax || 0,
              shipping: savedOrder?.shipping || 0
            },
            paymentMethod: apiPayload.paymentMethod,
            paymentStatus: savedOrder?.payment_status || 'pending',
            status: savedOrder?.status || 'pending',
            createdAt: savedOrder?.created_at || new Date().toISOString(),
            updatedAt: savedOrder?.updated_at || new Date().toISOString()
          };

          // Update local state
          const currentOrders = this.orders();
          this.orders.set([order, ...currentOrders]);
          this.ordersSubject.next(this.orders());
          this.loading.set(false);

          return order;
        }),
        catchError(error => {
          this.error.set('Failed to create order');
          this.loading.set(false);
          console.error('Error creating order:', error);
          throw error;
        })
      );
    } catch (error) {
      this.error.set('Failed to create order');
      this.loading.set(false);
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get all orders for the current user - from database
   */
  getUserOrders(userId?: string, limit: number = 20, page: number = 1): Observable<OrderListResponse> {
    this.loading.set(true);

    try {
      const offset = (page - 1) * limit;
      return this.http.get<any>(`${environment.apiUrl}/orders/history`, {
        params: { limit: limit.toString(), offset: offset.toString() }
      }).pipe(
        map((response: any) => {
          const backendOrders = response.data?.orders || [];

          // Map backend orders to frontend model
          const orders: Order[] = backendOrders.map((o: any) => ({
            id: String(o.id),
            userId: String(o.user_id),
            customer: {
              email: o.user_email || '',
              firstName: o.first_name || '',
              lastName: o.last_name || ''
            },
            items: [], // Items usually fetched in detail view to save bandwidth, or mapped if provided
            deliveryAddress: {}, // Might need detail fetch
            pricing: {
              total: parseFloat(o.total),
              subtotal: parseFloat(o.subtotal),
              tax: parseFloat(o.tax),
              shipping: parseFloat(o.shipping)
            },
            paymentMethod: o.payment_method,
            paymentStatus: o.payment_status,
            status: o.status,
            createdAt: o.created_at,
            updatedAt: o.updated_at
          }));

          this.orders.set(orders);
          this.ordersSubject.next(orders);
          this.loading.set(false);

          return {
            orders: orders,
            total: response.data?.pagination?.total || orders.length,
            page,
            limit
          };
        })
      );
    } catch (error) {
      console.error('Error loading orders:', error);
      this.error.set('Failed to load orders');
      this.loading.set(false);
      return of({
        orders: [],
        total: 0,
        page,
        limit
      });
    }
  }

  /**
   * Get past shipping addresses
   */
  getPastAddresses(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/orders/addresses`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Get single order by ID
   */
  /**
   * Get single order by ID
   */
  getOrder(orderId: string): Observable<Order> {
    const storedOrder = this.orders().find(o => o.id === orderId);
    if (storedOrder) {
      this.selectedOrder.set(storedOrder);
      return of(storedOrder);
    }

    return this.http.get<any>(`${environment.apiUrl}/orders/${orderId}`).pipe(
      map(response => {
        const o = response.data;
        // Map backend order to frontend model
        const order: Order = {
          id: String(o.id),
          userId: String(o.user_id),
          customer: {
            email: o.user_email || '', // fields might vary based on join
            firstName: o.first_name || '',
            lastName: o.last_name || '',
            phone: o.shipping?.phone || ''
          },
          items: o.items || [], // Backend getOrder returns items
          deliveryAddress: {
            street: o.shipping?.address || '',
            city: o.shipping?.city || '',
            state: o.shipping?.state || '',
            pincode: o.shipping?.zip_code || '',
            country: o.shipping?.country || ''
          },
          pricing: {
            total: parseFloat(o.total),
            subtotal: parseFloat(o.subtotal),
            tax: parseFloat(o.tax),
            shipping: parseFloat(o.shipping)
          },
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          status: o.status,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        };
        this.selectedOrder.set(order);
        return order;
      }),
      catchError(error => {
        console.error('Error loading order:', error);
        this.error.set('Failed to load order');
        return of(null as any);
      })
    );
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Observable<Order> {
    try {
      const storedOrders = this.getOrdersFromStorage();
      const orderIndex = storedOrders.findIndex(o => o.id === orderId);

      if (orderIndex !== -1) {
        const order = storedOrders[orderIndex];
        order.status = 'cancelled' as OrderStatus;
        order.updatedAt = new Date().toISOString();

        // Update the orders array (create new array to trigger signal change)
        this.orders.set([...storedOrders]);
        this.ordersSubject.next([...storedOrders]);

        // Save to localStorage
        this.saveOrdersToStorage();
        return of(order);
      }

      this.error.set('Order not found');
      return of(null as any);
    } catch (error) {
      this.error.set('Failed to cancel order');
      return of(null as any);
    }
  }

  /**
   * Get tracking information for an order
   */
  getOrderTracking(orderId: string): Observable<OrderTracking> {
    try {
      const storedOrders = this.getOrdersFromStorage();
      const order = storedOrders.find(o => o.id === orderId);

      // Generate mock tracking data
      const mockTracking: OrderTracking = {
        orderId,
        status: order?.status || 'pending',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        events: [
          {
            status: 'pending',
            timestamp: order?.createdAt || new Date().toISOString(),
            description: 'Order placed successfully',
            location: 'Processing center'
          }
        ]
      };

      this.orderTracking.set(mockTracking);
      return of(mockTracking);
    } catch (error) {
      this.error.set('Failed to load tracking');
      return of(null as any);
    }
  }

  private saveOrdersToStorage(): void {
    try {
      // Always save to both user-specific and guest key for flexibility
      const userId = localStorage.getItem('userId');
      const orders = this.orders();

      // Save to guest key (always)
      localStorage.setItem('orders_guest', JSON.stringify(orders));

      // Also save to user-specific key if userId exists
      if (userId) {
        const storageKey = `orders_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(orders));
      }

      // Debug logging
      console.log('Orders saved to localStorage:', {
        userId: userId || 'guest',
        count: orders.length,
        guestKey: 'orders_guest',
        userKey: userId ? `orders_${userId}` : 'N/A'
      });
    } catch (error) {
      console.warn('Failed to save orders to localStorage:', error);
    }
  }

  private getOrdersFromStorage(): Order[] {
    try {
      const userId = localStorage.getItem('userId');

      // Try user-specific orders first
      if (userId) {
        const storageKey = `orders_${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Loaded orders from user key:', {
            userId,
            storageKey,
            count: parsed.length
          });
          return parsed;
        }
      }

      // Fallback to guest orders
      const guestStored = localStorage.getItem('orders_guest');
      if (guestStored) {
        const parsed = JSON.parse(guestStored);
        console.log('Loaded orders from guest key:', {
          count: parsed.length
        });
        return parsed;
      }

      // Debug: List all available keys
      console.log('Available localStorage keys:', {
        allKeys: Object.keys(localStorage),
        orderKeys: Object.keys(localStorage).filter(k => k.includes('order'))
      });

      return [];
    } catch (error) {
      console.warn('Failed to read orders from localStorage:', error);
    }
    return [];
  }

  private getOrderFromStorage(orderId: string): Order | null {
    const orders = this.getOrdersFromStorage();
    return orders.find(o => o.id === orderId) || null;
  }

  /**
   * Load orders from localStorage on init
   */
  loadOrdersFromStorage(): void {
    const orders = this.getOrdersFromStorage();
    if (orders.length > 0) {
      this.orders.set(orders);
      this.ordersSubject.next(orders);
    }
  }

  /**
   * Utility methods
   */
  getOrderStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  getOrderStatusIcon(status: OrderStatus): string {
    const icons: Record<OrderStatus, string> = {
      'pending': '⏳',
      'confirmed': '✓',
      'processing': '⚙️',
      'shipped': '📦',
      'out_for_delivery': '🚚',
      'delivered': '✅',
      'cancelled': '❌'
    };
    return icons[status] || '•';
  }

  getOrderStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      'pending': '#ffc107',
      'confirmed': '#17a2b8',
      'processing': '#007bff',
      'shipped': '#6c63ff',
      'out_for_delivery': '#fd7e14',
      'delivered': '#28a745',
      'cancelled': '#dc3545'
    };
    return colors[status] || '#999';
  }

  /**
   * Clear state
   */
  clear(): void {
    this.orders.set([]);
    this.selectedOrder.set(null);
    this.orderTracking.set(null);
    this.error.set(null);
  }
}
