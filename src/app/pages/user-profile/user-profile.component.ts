import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { AnalyticsService, Transaction } from '../../services/analytics.service';
import { PhoneVerificationService } from '../../services/phone-verification.service';
import { EmailVerificationService } from '../../services/email-verification.service';
import { PhoneVerificationModalComponent } from '../../components/phone-verification-modal/phone-verification-modal.component';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal.component';
import { OrderService } from '../../services/order.service';
import { Order, OrderStatus } from '../../models/order.model';

type EditTab = 'profile' | 'security' | 'notifications' | 'orders';
type EditMode = 'view' | 'edit-profile' | 'edit-email' | 'edit-phone' | 'change-password';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PhoneVerificationModalComponent, ConfirmationModalComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private phoneVerificationService = inject(PhoneVerificationService);
  private emailVerificationService = inject(EmailVerificationService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  // User data
  currentUser: User | null = null;
  editMode: EditMode = 'view';
  activeTab: EditTab = 'profile';
  userOrders: Order[] = [];
  totalOrderValue: number = 0;
  ordersLoading: boolean = false;

  // Form data
  editFormData = {
    name: '',
    email: '',
    phone: ''
  };

  changePasswordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // UI State
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: { current: boolean; new: boolean; confirm: boolean } = { current: false, new: false, confirm: false };

  // Phone verification
  showPhoneVerificationModal: boolean = false;
  pendingPhoneNumber: string = '';

  // Email verification
  emailChangeAwaitingVerification: boolean = false;
  pendingNewEmail: string = '';

  // Cancel order modal
  showCancelModal: boolean = false;
  cancelingOrderId: string = '';

  // Timestamps
  lastPasswordChange: string = '';
  accountCreatedDate: string = '';
  
  // WhatsApp sharing is now without hardcoded phone number
  // Users will choose their contact when clicking the link

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  loadUserData() {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    this.currentUser = user;
    this.initializeFormData();
    this.formatTimestamps();
    this.loadUserOrders();
  }

  private loadUserOrders() {
    if (!this.currentUser) return;
    
    this.ordersLoading = true;
    this.orderService.getUserOrders(this.currentUser.id).subscribe({
      next: (response) => {
        this.userOrders = response.orders;
        this.totalOrderValue = this.userOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
        this.ordersLoading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.ordersLoading = false;
      }
    });
  }

  private initializeFormData() {
    if (this.currentUser) {
      this.editFormData = {
        name: this.currentUser.firstName || this.currentUser.name || '',
        email: this.currentUser.email,
        phone: this.currentUser.phone || ''
      };
    }
  }

  private formatTimestamps() {
    if (this.currentUser?.createdAt) {
      this.accountCreatedDate = new Date(this.currentUser.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  switchTab(tab: EditTab) {
    this.activeTab = tab;
    this.clearMessages();
  }

  startEditProfile() {
    this.editMode = 'edit-profile';
    this.clearMessages();
  }

  startChangeEmail() {
    this.editMode = 'edit-email';
    this.pendingNewEmail = '';
    this.clearMessages();
  }

  startChangePhone() {
    this.editMode = 'edit-phone';
    this.pendingPhoneNumber = '';
    this.clearMessages();
  }

  startChangePassword() {
    this.editMode = 'change-password';
    this.changePasswordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.clearMessages();
  }

  saveProfileChanges() {
    if (!this.validateProfileForm()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.updateProfile({
      name: this.editFormData.name,
      email: this.editFormData.email,
      phone: this.editFormData.phone
    }).subscribe({
      next: (result: any) => {
        this.successMessage = 'Profile updated successfully!';
        this.loadUserData();
        setTimeout(() => {
          this.editMode = 'view';
          this.clearMessages();
        }, 2000);
        this.loading = false;
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Failed to update profile';
        this.loading = false;
      }
    });
  }

  requestEmailChange() {
    if (!this.pendingNewEmail.trim()) {
      this.errorMessage = 'Please enter a new email address';
      return;
    }

    if (!this.isValidEmail(this.pendingNewEmail)) {
      this.errorMessage = 'Invalid email address';
      return;
    }

    if (this.pendingNewEmail === this.currentUser?.email) {
      this.errorMessage = 'New email must be different from current email';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Send verification email for email change
    const result = this.emailVerificationService.sendVerificationEmail(
      this.currentUser!.email,
      this.currentUser!.firstName || this.currentUser!.name || '',
      'email_change',
      this.pendingNewEmail
    );

    if (result.success) {
      this.successMessage = 'Verification email sent! Check your inbox.';
      this.emailChangeAwaitingVerification = true;
      
      setTimeout(() => {
        this.editMode = 'view';
        this.clearMessages();
      }, 3000);
    } else {
      this.errorMessage = result.message || 'Failed to send verification email';
    }

    this.loading = false;
  }

  requestPhoneChange() {
    if (!this.pendingPhoneNumber.trim()) {
      this.errorMessage = 'Please enter a phone number';
      return;
    }

    // Show phone verification modal
    this.showPhoneVerificationModal = true;
  }

  onPhoneVerified(verified: boolean) {
    this.showPhoneVerificationModal = false;

    if (verified && this.currentUser) {
      // Update phone number
      this.authService.updateProfile({
        phone: this.pendingPhoneNumber
      }).subscribe({
        next: (result: any) => {
          this.successMessage = 'Phone number updated successfully!';
          this.loadUserData();
          this.editMode = 'view';
          setTimeout(() => {
            this.clearMessages();
          }, 2000);
        },
        error: (error: any) => {
          this.errorMessage = 'Failed to update phone number: ' + (error.message || '');
        }
      });
    }
  }

  changePassword() {
    if (!this.validatePasswordForm()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // In production, verify current password on backend
    const users = (this.authService as any).getUsers?.();
    const currentUserData = users?.find((u: any) => u.id === this.currentUser?.id);

    if (currentUserData?.password !== this.changePasswordData.currentPassword) {
      this.errorMessage = 'Current password is incorrect';
      this.loading = false;
      return;
    }

    // Update password
    const result = this.authService.updateProfile({
      // Password update would typically be a separate method
    });

    // For now, we'll need to update the password in auth service
    if (this.currentUser) {
      const users = (this.authService as any).getUsers?.();
      const userIndex = users?.findIndex((u: any) => u.id === this.currentUser?.id);
      
      if (userIndex !== undefined && userIndex >= 0) {
        users[userIndex].password = this.changePasswordData.newPassword;
        (this.authService as any).saveUsers?.(users);
        
        this.successMessage = 'Password changed successfully!';
        setTimeout(() => {
          this.editMode = 'view';
          this.changePasswordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
          this.clearMessages();
        }, 2000);
      }
    }

    this.loading = false;
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/']);
    }
  }

  contactSupport(orderId: string) {
    // Open WhatsApp with order tracking message
    const message = encodeURIComponent(`Hi, I need help tracking order #${orderId}`);
    const whatsappNumber = '919951130198'; // VSP Electronics
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  }

  cancelEdit() {
    this.editMode = 'view';
    this.initializeFormData();
    this.clearMessages();
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    this.showPassword[field] = !this.showPassword[field];
  }

  // Validation methods
  private validateProfileForm(): boolean {
    if (!this.editFormData.name.trim()) {
      this.errorMessage = 'Name is required';
      return false;
    }

    if (this.editFormData.name.trim().length < 2) {
      this.errorMessage = 'Name must be at least 2 characters long';
      return false;
    }

    if (!this.isValidEmail(this.editFormData.email)) {
      this.errorMessage = 'Invalid email address';
      return false;
    }

    if (!this.editFormData.phone.trim()) {
      this.errorMessage = 'Phone number is required';
      return false;
    }

    return true;
  }

  private validatePasswordForm(): boolean {
    if (!this.changePasswordData.currentPassword.trim()) {
      this.errorMessage = 'Current password is required';
      return false;
    }

    if (!this.changePasswordData.newPassword.trim()) {
      this.errorMessage = 'New password is required';
      return false;
    }

    if (!this.changePasswordData.confirmPassword.trim()) {
      this.errorMessage = 'Confirm password is required';
      return false;
    }

    if (this.changePasswordData.newPassword !== this.changePasswordData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return false;
    }

    if (this.changePasswordData.newPassword.length < 8) {
      this.errorMessage = 'New password must be at least 8 characters long';
      return false;
    }

    if (!/[A-Z]/.test(this.changePasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one uppercase letter';
      return false;
    }

    if (!/[a-z]/.test(this.changePasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one lowercase letter';
      return false;
    }

    if (!/[0-9]/.test(this.changePasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one number';
      return false;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.changePasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one special character';
      return false;
    }

    if (this.changePasswordData.currentPassword === this.changePasswordData.newPassword) {
      this.errorMessage = 'New password must be different from current password';
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  getPhoneVerificationStatus(): string {
    if (!this.currentUser?.phone) return 'Not Added';
    
    const status = this.phoneVerificationService.getOTPStatus(this.currentUser.phone);
    return status?.status === 'verified' ? '✓ Verified' : '⚠ Pending';
  }

  getEmailVerificationStatus(): string {
    if (!this.currentUser?.email) return 'Not Added';
    
    const isVerified = this.emailVerificationService.isEmailVerified(this.currentUser.email);
    return isVerified ? '✓ Verified' : '⚠ Pending';
  }

  // Order Management Methods
  viewOrderDetails(orderId: string) {
    this.router.navigate(['/order', orderId]);
  }

  trackOrder(orderId: string) {
    this.router.navigate(['/order', orderId, 'track']);
  }

  cancelOrder(orderId: string) {
    this.cancelingOrderId = orderId;
    this.showCancelModal = true;
  }

  confirmCancel() {
    if (!this.cancelingOrderId) return;

    this.ordersLoading = true;
    this.showCancelModal = false;
    
    this.orderService.cancelOrder(this.cancelingOrderId).subscribe({
      next: (response) => {
        this.successMessage = 'Order cancelled successfully!';
        this.ordersLoading = false;
        this.cancelingOrderId = '';
        this.loadUserOrders();
        setTimeout(() => this.clearMessages(), 3000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to cancel order. Please try again.';
        this.ordersLoading = false;
        this.cancelingOrderId = '';
      }
    });
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.cancelingOrderId = '';
  }

  shareViaWhatsApp(order: Order) {
    // Professional WhatsApp template with better formatting
    const message = `
*🎉 ORDER CONFIRMATION* 📦

━━━━━━━━━━━━━━━━━━━━━━

*Order Details:*
🔹 Order ID: ${order.id}
🔹 Amount: ₹${order.pricing.total}
🔹 Status: ${order.status.toUpperCase()}
🔹 Payment Method: COD

━━━━━━━━━━━━━━━━━━━━━━

*📦 Items Ordered:*
${order.items && order.items.length > 0 
  ? order.items.map((item: any) => `• ${item.name || item.productName} (₹${item.price})`).join('\n')
  : '• Order items'}

━━━━━━━━━━━━━━━━━━━━━━

*🚚 Delivery Address:*
${order.deliveryAddress.street || 'Not specified'}
${order.deliveryAddress.city}, ${order.deliveryAddress.state}
${order.deliveryAddress.pincode}

━━━━━━━━━━━━━━━━━━━━━━

⏱️ Expected Delivery: 3-5 business days
📞 Need Help? Contact our support team

Thank you for your purchase! 🙏
    `.trim();
    
    const encodedMessage = encodeURIComponent(message);
    // Use wa.me without phone number - user will choose contact
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  canCancelOrder(order: Order): boolean {
    const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing'];
    return cancellableStatuses.includes(order.status as OrderStatus);
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'processing': 'status-processing',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
  }}