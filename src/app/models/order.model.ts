/**
 * Order Models
 * Defines interfaces for orders, order items, and tracking
 */

import { Product } from './product.model';

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string;
  label?: string;
}

export interface OrderPricing {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discount?: number;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  deliveryAddress: OrderAddress;
  pricing: OrderPricing;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  estimatedDeliveryDate?: Date | string;
  actualDeliveryDate?: Date | string;
  cancellationReason?: string;
  cancellationDate?: Date | string;
  trackingUrl?: string;
  invoiceUrl?: string;
}

export interface OrderTracking {
  orderId: string;
  status: OrderStatus;
  location?: string;
  estimatedDelivery?: Date | string;
  lastUpdated: Date | string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  status: OrderStatus;
  timestamp: Date | string;
  location?: string;
  description: string;
  icon?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}
