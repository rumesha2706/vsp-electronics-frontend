import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AppConfig } from '../config/app.config';

export interface ViewerStats {
  globalActiveUsers: number;
  productViewers: number;
  currentProductId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeViewersService {
  private socket: Socket | null = null;
  private viewerStats = new BehaviorSubject<ViewerStats>({
    globalActiveUsers: 0,
    productViewers: 0
  });

  public viewerStats$ = this.viewerStats.asObservable();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    // Connect to the server
    this.socket = io(AppConfig.prodApiEndpoint, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Listen for global active users update
    this.socket.on('activeUsers', (count: number) => {
      const current = this.viewerStats.value;
      this.viewerStats.next({
        ...current,
        globalActiveUsers: count
      });
    });

    // Listen for product viewers update
    this.socket.on('productViewers', (data: { productId: number; count: number }) => {
      const current = this.viewerStats.value;
      if (current.currentProductId === data.productId) {
        this.viewerStats.next({
          ...current,
          productViewers: data.count
        });
      }
    });

    // Listen for connection status
    this.socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Tell the server that a user is viewing a specific product
   */
  viewProduct(productId: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('viewProduct', productId);

      // Update local state
      const current = this.viewerStats.value;
      this.viewerStats.next({
        ...current,
        currentProductId: productId
      });
    }
  }

  /**
   * Tell the server that a user has stopped viewing the product
   */
  stopViewingProduct(productId: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stopViewingProduct', productId);

      // Update local state
      const current = this.viewerStats.value;
      this.viewerStats.next({
        ...current,
        currentProductId: undefined,
        productViewers: 0
      });
    }
  }

  /**
   * Get current viewer stats
   */
  getViewerStats(): ViewerStats {
    return this.viewerStats.value;
  }

  /**
   * Get viewer stats as observable
   */
  getViewerStats$(): Observable<ViewerStats> {
    return this.viewerStats$;
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Reconnect to the server
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * Get the server URL
   */
  private getServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const host = window.location.hostname;
    const port = window.location.port;

    // Use the same port for socket server
    if (port) {
      return `${protocol}://${host}:${port}`;
    }

    // Default ports
    if (protocol === 'https') {
      return `${protocol}://${host}`;
    } else {
      return `${protocol}://${host}:4200`;
    }
  }
}
