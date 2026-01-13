import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface SavedAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  label?: string; // Home, Office, etc.
  isDefault?: boolean;
  savedAt: string;
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private readonly ADDRESSES_KEY = 'drone_shop_addresses';
  private authService = inject(AuthService);

  // Get all saved addresses for current user
  getSavedAddresses(): SavedAddress[] {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

    const allAddresses = this.getAllAddresses();
    return allAddresses.filter(addr => addr.userId === currentUser.id);
  }

  // Save new address
  saveAddress(address: Omit<SavedAddress, 'id' | 'savedAt'>): SavedAddress {
    const allAddresses = this.getAllAddresses();
    
    const newAddress: SavedAddress = {
      ...address,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    };

    allAddresses.push(newAddress);
    localStorage.setItem(this.ADDRESSES_KEY, JSON.stringify(allAddresses));

    return newAddress;
  }

  // Delete address
  deleteAddress(addressId: string): void {
    let allAddresses = this.getAllAddresses();
    allAddresses = allAddresses.filter(addr => addr.id !== addressId);
    localStorage.setItem(this.ADDRESSES_KEY, JSON.stringify(allAddresses));
  }

  // Set default address
  setDefaultAddress(addressId: string): void {
    const allAddresses = this.getAllAddresses();
    allAddresses.forEach(addr => {
      addr.isDefault = addr.id === addressId;
    });
    localStorage.setItem(this.ADDRESSES_KEY, JSON.stringify(allAddresses));
  }

  // Get default address
  getDefaultAddress(): SavedAddress | null {
    const addresses = this.getSavedAddresses();
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  }

  private getAllAddresses(): SavedAddress[] {
    const addressesJson = localStorage.getItem(this.ADDRESSES_KEY);
    return addressesJson ? JSON.parse(addressesJson) : [];
  }
}
