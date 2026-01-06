import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PhoneVerificationService } from '../../services/phone-verification.service';
import { EmailVerificationService } from '../../services/email-verification.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.css']
})
export class MyAccountComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private emailVerificationService = inject(EmailVerificationService);

  // State signals
  editMode = signal<'view' | 'edit-profile' | 'edit-phone' | 'change-password'>('view');
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal(false);

  // Form data
  editFormData = signal({
    name: '',
    email: ''
  });

  phoneFormData = signal({
    phone: ''
  });

  passwordFormData = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  get currentUser() {
    return this.authService.currentUser();
  }

  get isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  ngOnInit() {
    // Redirect to home if not logged in
    if (!this.isLoggedIn) {
      this.router.navigate(['/']);
    }
  }

  // Profile Edit Methods
  startEditProfile() {
    const user = this.currentUser;
    if (user) {
      this.editFormData.set({
        name: user.name || '',
        email: user.email || ''
      });
      this.editMode.set('edit-profile');
      this.clearMessages();
    }
  }

  cancelEdit() {
    this.editMode.set('view');
    this.clearMessages();
  }

  saveProfileChanges() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.editFormData();
    if (!formData.name || !formData.email) {
      this.errorMessage.set('Please fill in all fields');
      this.isLoading.set(false);
      return;
    }

    const user = this.currentUser;
    if (!user) return;

    // Update user profile
    const updatedUser = {
      ...user,
      name: formData.name,
      email: formData.email
    };

    setTimeout(() => {
      this.authService.updateProfile(updatedUser).subscribe({
        next: (result) => {
          this.successMessage.set('✅ Profile updated successfully');
          this.editMode.set('view');
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set('Failed to update profile');
          this.isLoading.set(false);
        }
      });
    }, 500);
  }

  // Phone Update Methods
  startPhoneUpdate() {
    this.editMode.set('edit-phone');
    this.phoneFormData.set({ phone: this.currentUser?.phone || '' });
    this.clearMessages();
  }

  savePhoneNumber() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const phone = this.phoneFormData().phone.trim();

    if (!phone) {
      this.errorMessage.set('Please enter a phone number');
      this.isLoading.set(false);
      return;
    }

    // Simple validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      this.errorMessage.set('Please enter a valid 10-digit phone number');
      this.isLoading.set(false);
      return;
    }

    const user = this.currentUser;
    if (user) {
      const updatedUser = {
        ...user,
        phone: phone
      };
      
      this.authService.updateProfile(updatedUser).subscribe({
        next: (result) => {
          this.successMessage.set('✅ Phone number updated successfully');
          this.editMode.set('view');
          this.phoneFormData.set({ phone: '' });
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set('Failed to update phone number');
          this.isLoading.set(false);
        }
      });
    }
  }

  cancelPhoneUpdate() {
    this.editMode.set('view');
    this.phoneFormData.set({ phone: '' });
    this.clearMessages();
  }

  // Password Change Methods
  startPasswordChange() {
    this.editMode.set('change-password');
    this.passwordFormData.set({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    this.clearMessages();
  }

  changePassword() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.passwordFormData();

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      this.errorMessage.set('Please fill in all password fields');
      this.isLoading.set(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      this.errorMessage.set('New passwords do not match');
      this.isLoading.set(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters');
      this.isLoading.set(false);
      return;
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      this.errorMessage.set('Password must contain uppercase, lowercase, number and special character');
      this.isLoading.set(false);
      return;
    }

    // Note: Password changes should be handled separately via a backend service
    // For now, show a message that password changes are managed separately
    this.errorMessage.set('Password changes should be handled through a secure backend process. Please contact support.');
    this.isLoading.set(false);
  }

  cancelPasswordChange() {
    this.editMode.set('view');
    this.clearMessages();
  }

  clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
