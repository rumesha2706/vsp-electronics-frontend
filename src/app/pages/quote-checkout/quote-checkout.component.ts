import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { EmailService } from '../../services/email.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-quote-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './quote-checkout.component.html',
  styleUrls: ['./quote-checkout.component.css']
})
export class QuoteCheckoutComponent implements OnInit {
  quoteService = inject(QuoteService);
  emailService = inject(EmailService);
  orderService = inject(OrderService);
  authService = inject(AuthService);
  formBuilder = inject(FormBuilder);
  router = inject(Router);

  quoteForm: FormGroup;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;
  orderNumber = '';
  currentStep: 'form' | 'confirm' | 'success' = 'form';
  sendWhatsApp = true; // Default to true based on user request "I need to get order information through both"
  pastAddresses: any[] = [];
  isLoadingAddresses = false;

  constructor() {
    this.quoteForm = this.formBuilder.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],

      // Company Information
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
      termsAccepted: [false, Validators.requiredTrue]
    });

    // If quote is empty, redirect back to quote page
    if (this.quoteService.getQuoteItems().length === 0) {
      this.router.navigate(['/quote']);
    }
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.loadPastAddresses();
      this.prefillUserInfo();
    }
  }

  prefillUserInfo() {
    const user = this.authService.currentUser();
    if (user) {
      this.quoteForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        company: user.company || ''
      });
    }
  }

  loadPastAddresses() {
    this.isLoadingAddresses = true;
    this.orderService.getPastAddresses().subscribe({
      next: (addresses) => {
        this.pastAddresses = addresses;
        this.isLoadingAddresses = false;

        // If we have addresses and form is empty, could optionally autofill the most recent one
        // But better to let user choose
      },
      error: (err) => {
        console.error('Failed to load addresses', err);
        this.isLoadingAddresses = false;
      }
    });
  }

  useAddress(index: any) {
    const address = this.pastAddresses[index];
    if (address) {
      this.quoteForm.patchValue({
        street: address.address,
        city: address.city,
        state: address.state,
        pincode: address.zip_code || address.zipCode,
        country: address.country || 'India'
      });
    }
  }

  get firstName() {
    return this.quoteForm.get('firstName');
  }

  get lastName() {
    return this.quoteForm.get('lastName');
  }

  get email() {
    return this.quoteForm.get('email');
  }

  get phone() {
    return this.quoteForm.get('phone');
  }

  get street() {
    return this.quoteForm.get('street');
  }

  get city() {
    return this.quoteForm.get('city');
  }

  get state() {
    return this.quoteForm.get('state');
  }

  get pincode() {
    return this.quoteForm.get('pincode');
  }

  get deliveryPincode() {
    return this.quoteForm.get('deliveryPincode');
  }

  get termsAccepted() {
    return this.quoteForm.get('termsAccepted');
  }

  get sameAsShipping() {
    return this.quoteForm.get('sameAsShipping');
  }

  calculateTotal(): number {
    return this.quoteService.getQuoteItems().reduce((total, item) => {
      // Handle both formats of item.product.price vs item.price
      const price = item.product?.price || (item as any).price || 0;
      return total + (price * item.quantity);
    }, 0);
  }

  onSameAsShippingChange() {
    const sameAsShipping = this.sameAsShipping?.value;
    const deliveryFields = ['deliveryStreet', 'deliveryCity', 'deliveryState', 'deliveryPincode'];

    deliveryFields.forEach(field => {
      const control = this.quoteForm.get(field);
      if (sameAsShipping) {
        control?.clearValidators();
        control?.setValue('');
      } else {
        control?.setValidators([Validators.required]);
      }
      control?.updateValueAndValidity();
    });
  }

  async submitQuote() {
    if (this.quoteForm.invalid) {
      this.markFormGroupTouched(this.quoteForm);
      return;
    }

    // Move to confirmation step
    this.currentStep = 'confirm';
  }

  async confirmOrder() {
    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = false;

    try {
      const formData = this.quoteForm.value;
      const quoteItems = this.quoteService.getQuoteItems().map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity
      }));

      const total = this.calculateTotal();

      // Prepare order data structure
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          designation: formData.designation
        },
        items: quoteItems,
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
        paymentMethod: 'cod', // Taking default as COD/Request Quote since payment gateway not explicit
        notes: formData.notes,
        userId: this.authService.currentUser()?.id // Link to user if logged in
      };

      // Call OrderService to create order in backend
      this.orderService.createOrder(orderData).subscribe({
        next: (order) => {
          this.orderNumber = order.id;
          this.quoteService.clearQuote();
          this.submitSuccess = true;
          this.currentStep = 'success';

          // No need to send client-side email/whatsapp as backend handles it now
          // (verified in orders-router.js)
        },
        error: (error) => {
          console.error('Error submitting order:', error);
          this.submitError = 'Failed to submit order. Please try again.';
          this.currentStep = 'confirm';
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });

    } catch (error) {
      console.error('Error in confirmOrder:', error);
      this.submitError = 'An unexpected error occurred.';
      this.isSubmitting = false;
    }
  }

  // sendWhatsAppMessage removed as it is now handled by backend

  goBackToForm() {
    this.currentStep = 'form';
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  goBackToQuote() {
    this.router.navigate(['/quote']);
  }
}
