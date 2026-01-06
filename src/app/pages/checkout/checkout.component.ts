import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { EmailService } from '../../services/email.service';
import { OrderService } from '../../services/order.service';
import { PincodeService } from '../../services/pincode.service';
import { NavigationHistoryService } from '../../services/navigation-history.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { AddressService, SavedAddress } from '../../services/address.service';
import { OrderStatus } from '../../models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent {
  cartService = inject(CartService);
  emailService = inject(EmailService);
  orderService = inject(OrderService);
  pincodeService = inject(PincodeService);
  formBuilder = inject(FormBuilder);
  router = inject(Router);
  navigationHistory = inject(NavigationHistoryService);
  analyticsService = inject(AnalyticsService);
  authService = inject(AuthService);
  addressService = inject(AddressService);

  checkoutForm: FormGroup;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;
  states: string[] = [];
  deliveryStates: string[] = [];
  savedAddresses: SavedAddress[] = [];
  selectedSavedAddressId: string | null = null;
  saveCurrentAddress = false;
  addressLabel = '';

  constructor() {
    this.states = this.pincodeService.getStates();
    this.deliveryStates = this.pincodeService.getStates();
    this.checkoutForm = this.formBuilder.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''], // Optional - user can edit if needed
      email: ['', [Validators.required, Validators.email]],
      phone: [''], // Optional - user can edit if needed

      // Company Information (Optional)
      company: [''],
      designation: [''],

      // Address Information
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      country: ['India', Validators.required],

      // Delivery Information
      sameAsShipping: [true],
      deliveryStreet: [''],
      deliveryCity: [''],
      deliveryState: [''],
      deliveryPincode: [''],

      // Additional Information
      notes: ['', Validators.maxLength(500)],

      // Terms
      termsAccepted: [false, Validators.requiredTrue]
    });

    // If cart is empty, redirect back to cart page
    if (this.cartService.getCartItems().length === 0) {
      this.router.navigate(['/cart']);
    }

    // Load saved addresses
    this.loadSavedAddresses();

    // Pre-fill form with user's existing data
    this.prefillUserData();
  }

  private loadSavedAddresses() {
    this.savedAddresses = this.addressService.getSavedAddresses();
  }

  private prefillUserData() {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      const nameToUse = currentUser.firstName || currentUser.name || '';
      const firstNamePart = nameToUse.split(' ')[0] || '';
      const lastNamePart = nameToUse.split(' ').slice(1).join(' ') || '';

      this.checkoutForm.patchValue({
        firstName: firstNamePart,
        lastName: lastNamePart,
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
    }
  }

  selectSavedAddress(addressId: string) {
    const address = this.savedAddresses.find(addr => addr.id === addressId);
    if (address) {
      this.selectedSavedAddressId = addressId;
      this.checkoutForm.patchValue({
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country
      });
    }
  }

  get firstName() {
    return this.checkoutForm.get('firstName');
  }

  get lastName() {
    return this.checkoutForm.get('lastName');
  }

  get email() {
    return this.checkoutForm.get('email');
  }

  get phone() {
    return this.checkoutForm.get('phone');
  }

  get street() {
    return this.checkoutForm.get('street');
  }

  get city() {
    return this.checkoutForm.get('city');
  }

  get state() {
    return this.checkoutForm.get('state');
  }

  get pincode() {
    return this.checkoutForm.get('pincode');
  }

  get deliveryPincode() {
    return this.checkoutForm.get('deliveryPincode');
  }

  get termsAccepted() {
    return this.checkoutForm.get('termsAccepted');
  }

  get sameAsShipping() {
    return this.checkoutForm.get('sameAsShipping');
  }

  calculateSubtotal(): number {
    return this.cartService.getCartItems().reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  calculateShipping(): number {
    const subtotal = this.calculateSubtotal();
    if (subtotal > 5000) {
      return 0; // Free shipping for orders above 5000
    }
    return 100; // Standard shipping
  }

  calculateTax(): number {
    return Math.round(this.calculateSubtotal() * 0.18); // 18% GST
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateShipping() + this.calculateTax();
  }

  onSameAsShippingChange() {
    const sameAsShipping = this.sameAsShipping?.value;
    const deliveryFields = ['deliveryStreet', 'deliveryCity', 'deliveryState', 'deliveryPincode'];

    deliveryFields.forEach(field => {
      const control = this.checkoutForm.get(field);
      if (sameAsShipping) {
        control?.clearValidators();
        control?.setValue('');
      } else {
        control?.setValidators([Validators.required]);
      }
      control?.updateValueAndValidity();
    });
  }

  onPincodeChange() {
    const pincode = this.checkoutForm.get('pincode')?.value;

    if (pincode && pincode.length === 6) {
      const location = this.pincodeService.getLocationByPincode(pincode);

      if (location) {
        this.checkoutForm.patchValue({
          city: location.city,
          state: location.state
        });
      } else {
        // Pincode not found in database - allow manual entry
        this.checkoutForm.patchValue({
          city: '',
          state: ''
        });
      }
    }
  }

  onDeliveryPincodeChange() {
    const pincode = this.checkoutForm.get('deliveryPincode')?.value;

    if (pincode && pincode.length === 6) {
      const location = this.pincodeService.getLocationByPincode(pincode);

      if (location) {
        this.checkoutForm.patchValue({
          deliveryCity: location.city,
          deliveryState: location.state
        });
      } else {
        // Pincode not found in database - allow manual entry
        this.checkoutForm.patchValue({
          deliveryCity: '',
          deliveryState: ''
        });
      }
    }
  }

  async submitOrder() {
    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = false;

    try {
      const formData = this.checkoutForm.value;
      const cartItems = this.cartService.getCartItems();
      const subtotal = this.calculateSubtotal();
      const shipping = this.calculateShipping();
      const tax = this.calculateTax();
      const total = this.calculateTotal();

      // Generate Order ID
      const orderId = `ORD-${Date.now()}`;

      // Prepare order data for backend API
      const orderData = {
        orderId,
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          designation: formData.designation
        },
        billingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country
        },
        deliveryAddress: formData.sameAsShipping ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country
        } : {
          street: formData.deliveryStreet,
          city: formData.deliveryCity,
          state: formData.deliveryState,
          pincode: formData.deliveryPincode,
          country: formData.country
        },
        items: cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity
        })),
        pricing: {
          subtotal,
          shipping,
          tax,
          total
        },
        paymentMethod: 'cod',
        notes: formData.notes,
        orderStatus: 'pending',
        orderedAt: new Date().toISOString()
      };

      // Save order to order service
      const currentUser = this.authService.currentUser();

      // Format payload for API - transform items structure
      const apiOrderPayload = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        items: cartItems.map(item => ({
          productId: item.product.id,
          product: item.product,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity
        })),
        deliveryAddress: formData.sameAsShipping ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country
        } : {
          street: formData.deliveryStreet,
          city: formData.deliveryCity,
          state: formData.deliveryState,
          pincode: formData.deliveryPincode,
          country: formData.country
        },
        pricing: {
          subtotal,
          shipping,
          tax,
          total
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        status: 'pending',
        userId: currentUser?.id || null
      };

      console.log('📤 Saving order to localStorage:', apiOrderPayload);

      // Save order to localStorage with unique ID
      const orderWithId = {
        ...apiOrderPayload,
        id: orderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Get existing orders
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push(orderWithId);
      localStorage.setItem('orders', JSON.stringify(existingOrders));

      console.log('✅ Order saved to localStorage:', orderId);
      sessionStorage.setItem('lastOrderId', orderId);

      // Note: We rely on localStorage or API refresh, not pushing to private signal
      // this.orderService.refreshOrders(); // If such a method existed

      // Save delivery address if needed
      if (this.saveCurrentAddress && currentUser) {
        const deliveryAddress = formData.sameAsShipping ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country
        } : {
          street: formData.deliveryStreet,
          city: formData.deliveryCity,
          state: formData.deliveryState,
          pincode: formData.deliveryPincode,
          country: formData.country
        };

        this.addressService.saveAddress({
          ...deliveryAddress,
          label: this.addressLabel || 'Saved Address',
          userId: currentUser?.id || ''
        });
      }

      // Track order in analytics
      if (currentUser) {
        this.analyticsService.trackTransaction({
          userId: currentUser?.id || '',
          userName: currentUser?.firstName || currentUser?.name || '',
          type: 'order',
          items: cartItems.length,
          amount: total
        });
      }

      // Clear cart
      this.cartService.clearCart();
      this.submitSuccess = true;
      this.isSubmitting = false;

      // Redirect after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/order-confirmation', orderId]);
      }, 2000);
    } catch (error) {
      console.error('Error submitting order:', error);
      this.submitError = 'Failed to process order. Please try again.';
      this.isSubmitting = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  goBackToCart() {
    this.router.navigate(['/cart']);
  }

  goBack() {
    this.navigationHistory.goBack();
  }
}

