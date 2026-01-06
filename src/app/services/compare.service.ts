import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class CompareService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/compare`;
    private compareItems = signal<Product[]>([]);

    constructor() {
        effect(() => {
            if (this.authService.currentUser()) {
                this.loadCompareList();
            } else {
                this.compareItems.set([]);
            }
        }, { allowSignalWrites: true });
    }

    getCompareItems() {
        return this.compareItems.asReadonly();
    }

    loadCompareList() {
        this.http.get<any>(this.apiUrl).subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data.items)) {
                    const items = res.data.items.map((item: any) => ({
                        id: item.product_id,
                        name: item.name,
                        image: item.image,
                        price: parseFloat(item.price),
                        category: item.category,
                        brand: item.brand,
                        inStock: item.in_stock,
                        description: item.description,
                        // specs/features for comparison if available
                    } as Product));
                    this.compareItems.set(items);
                }
            },
            error: (err) => console.error('Error loading compare list', err)
        });
    }

    addToCompare(product: Product) {
        const items = this.compareItems();
        if (items.length >= 4) {
            // Logic handled by backend too to manage limit, but UI should probably warn.
            // For now, let's assume backend handles rotation or rejection.
            // Backend (my compare-model) deletes oldest if full.
            // So here we can just add optimistically or reload.
            // Optimistic behavior for rotation is tricky without complex logic. 
            // Let's just rely on reload after add.
        }

        if (!items.find(p => p.id === product.id)) {
            // Optimistic add (if not full)
            if (items.length < 4) {
                this.compareItems.set([...items, product]);
            }

            this.http.post<any>(`${this.apiUrl}/add`, { productId: product.id }).subscribe({
                next: (res) => {
                    this.loadCompareList(); // Reload to get correct state (processed by backend logic)
                },
                error: (err) => {
                    console.error('Add to compare failed', err);
                    this.loadCompareList();
                }
            });
        }
    }

    removeFromCompare(productId: string) {
        // Optimistic
        this.compareItems.set(this.compareItems().filter(p => p.id !== productId));

        this.http.delete<any>(`${this.apiUrl}/${productId}`).subscribe({
            error: (err) => {
                console.error('Remove from compare failed', err);
                this.loadCompareList();
            }
        });
    }

    clearCompare() {
        this.compareItems.set([]);
        this.http.delete(`${this.apiUrl}/all/clear`).subscribe();
    }

    isInCompare(productId: string): boolean {
        return this.compareItems().some(p => p.id === productId);
    }

    getCompareCount() {
        return this.compareItems().length;
    }
}
