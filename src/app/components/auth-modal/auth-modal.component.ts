import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SignupData, LoginCredentials } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';
import { EmailVerificationService } from '../../services/email-verification.service';
// import { GOOGLE_OAUTH_CONFIG } from '../../config/google-oauth.config';

declare const google: any;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Input() message: string = 'Please login to continue';
  @Input() initialTab: 'login' | 'signup' | 'forgot' = 'login';
  
  private authService = inject(AuthService);
  private emailService = inject(EmailService);
  private emailVerificationService = inject(EmailVerificationService);
  private router = inject(Router);

  activeTab: 'login' | 'signup' | 'forgot' = 'login';
  showPassword = false;
  rememberMe = false;

  // Email verification
  emailVerificationStep: 'signup-form' | 'verify-email' = 'signup-form';
  emailVerificationCode = '';
  emailVerificationToken = '';
  pendingSignupData: SignupData | null = null;
  
  // Forgot password
  forgotPasswordStep = 1; // 1: enter email, 2: enter code, 3: new password
  forgotPasswordData = {
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: ''
  };
  
  // Login form
  loginData: LoginCredentials = {
    email: '',
    password: ''
  };

  // Signup form
  signupData: SignupData = {
    firstName: '',
    email: '',
    phone: '',
    password: ''
  };

  confirmPassword = '';
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    // Set the active tab based on initialTab input or login state
    this.activeTab = this.initialTab;
  }

  ngAfterViewInit() {
    // Delay Google Sign-In initialization to ensure DOM is ready
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 200);
  }

  private initializeGoogleSignIn() {
    // Check if google is available
    if (typeof google === 'undefined') {
      console.warn('Google SDK not loaded yet, retrying...');
      setTimeout(() => this.initializeGoogleSignIn(), 500);
      return;
    }

    if (!google.accounts) {
      console.warn('Google accounts not available, retrying...');
      setTimeout(() => this.initializeGoogleSignIn(), 500);
      return;
    }

    try {
      // Initialize Google Sign-In with your Client ID
      google.accounts.id.initialize({
        client_id: 'your-google-oauth-client-id.apps.googleusercontent.com',
        callback: this.handleGoogleSignIn.bind(this),
        auto_select: false,
        itp_support: true,
        use_fedcm_for_prompt: true
      });

      // Render button for the active tab
      const buttonId = this.activeTab === 'login' ? 'google-signin-login' : 'google-signin-signup';
      const buttonElement = document.getElementById(buttonId);
      
      if (buttonElement) {
        // Clear previous content and render fresh button
        buttonElement.innerHTML = '';
        google.accounts.id.renderButton(
          buttonElement,
          { 
            theme: 'outline', 
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'en_US'
          }
        );
        console.log('Google Sign-In button rendered for:', buttonId);
      } else {
        console.warn('Button element not found:', buttonId);
      }
    } catch (error) {
      console.error('Google Sign-In initialization failed:', error);
    }
  }

  private handleGoogleSignIn(response: any) {
    console.log('Google Sign-In response received:', !!response.credential);
    
    try {
      if (!response.credential) {
        console.error('No credential in response');
        this.errorMessage = 'Google Sign-In failed: No credential received';
        return;
      }

      console.log('Decoding JWT token...');
      // Decode the JWT token to get user info
      const parts = response.credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      let decoded = atob(base64);
      const jsonPayload = decodeURIComponent(
        decoded
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      console.log('Decoded payload:', { email: payload.email, name: payload.name });
      
      // Create user data from Google response
      const googleUser: SignupData = {
        firstName: payload.name || '',
        email: payload.email || '',
        phone: '', // Google doesn't provide phone
        password: 'google_' + payload.sub // Use Google ID as password
      };

      if (!googleUser.email) {
        console.error('No email in payload');
        this.errorMessage = 'Unable to retrieve email from Google Sign-In';
        return;
      }

      console.log('Attempting login with Google email:', googleUser.email);
      
      // Try to login first, if fails then signup
      const loginResult = this.authService.login({
        email: googleUser.email,
        password: googleUser.password
      });

      // Use Observable-based login
      this.authService.login({
        email: googleUser.email,
        password: googleUser.password
      }).subscribe({
        next: (loginResult: any) => {
          console.log('Google login successful');
          this.successMessage = 'Signed in successfully with Google!';
          // Store Google user info
          localStorage.setItem('google_user_' + googleUser.email, JSON.stringify(payload));
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (loginError: any) => {
          console.log('Login failed, attempting signup...');
          // User doesn't exist, create account
          this.authService.register(googleUser).subscribe({
            next: (signupResult: any) => {
              console.log('Google signup successful');
              this.successMessage = 'Account created and signed in successfully with Google!';
              // Store Google user info
              localStorage.setItem('google_user_' + googleUser.email, JSON.stringify(payload));
              setTimeout(() => this.closeModal(), 1500);
            },
            error: (signupError: any) => {
              console.error('Signup failed:', signupError.message);
              this.errorMessage = signupError.message || 'Failed to create account. Please try again.';
            }
          });
        }
      });
    } catch (error) {
      console.error('Google Sign-In error:', error);
      this.errorMessage = 'Google Sign-In failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  switchTab(tab: 'login' | 'signup' | 'forgot') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetForms();
    
    // Reset forgot password step when switching to forgot tab
    if (tab === 'forgot') {
      this.forgotPasswordStep = 1;
    }
    
    // Re-initialize Google Sign-In for the new tab (only for login/signup)
    if (tab === 'login' || tab === 'signup') {
      setTimeout(() => {
        this.initializeGoogleSignIn();
      }, 200);
    }
  }

  resetForms() {
    this.loginData = { email: '', password: '' };
    this.signupData = { firstName: '', email: '', phone: '', password: '' };
    this.confirmPassword = '';
    this.showPassword = false;
    this.forgotPasswordData = {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
      resetToken: ''
    };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';

    // Trim whitespace
    this.loginData.email = this.loginData.email.trim();

    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    // Validate email format (not phone number)
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.loginData.email)) {
      this.errorMessage = 'Please enter a valid email address (phone numbers not accepted)';
      return;
    }

    // Check if it looks like a phone number
    const phonePattern = /^[0-9]{10,}$/;
    if (phonePattern.test(this.loginData.email.replace(/[@._-]/g, ''))) {
      this.errorMessage = 'Please use email address for login, not phone number';
      return;
    }

    this.authService.login(this.loginData).subscribe({
      next: (result: any) => {
        this.successMessage = result.message || 'Login successful!';
        setTimeout(() => {
          this.closeModal();
        }, 500);
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  onSignup() {
    this.errorMessage = '';
    this.successMessage = '';

    // Trim whitespace from all fields
    this.signupData.firstName = this.signupData.firstName.trim();
    this.signupData.email = this.signupData.email.trim();
    if (this.signupData.phone) this.signupData.phone = this.signupData.phone.trim();

    // Validation - all required fields
    if (!this.signupData.firstName || !this.signupData.email || !this.signupData.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    // Validate name (at least 2 characters, only letters and spaces)
    if (this.signupData.firstName.length < 2) {
      this.errorMessage = 'First name must be at least 2 characters long';
      return;
    }

    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(this.signupData.firstName)) {
      this.errorMessage = 'First name should contain only letters and spaces';
      return;
    }

    // Validate email format (strict - no phone numbers)
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.signupData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Check if email looks like a phone number
    const phonePattern = /^[0-9]{10,}$/;
    if (phonePattern.test(this.signupData.email.replace(/[@._-]/g, ''))) {
      this.errorMessage = 'Email cannot be a phone number';
      return;
    }

    // Validate phone number (Indian format: 10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (this.signupData.phone && !phoneRegex.test(this.signupData.phone)) {
      this.errorMessage = 'Phone number must be 10 digits starting with 6, 7, 8, or 9';
      return;
    }

    // Validate passwords match
    if (this.signupData.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Password strength validation
    if (this.signupData.password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters long';
      return;
    }

    // Check for uppercase
    if (!/[A-Z]/.test(this.signupData.password)) {
      this.errorMessage = 'Password must contain at least one uppercase letter';
      return;
    }

    // Check for lowercase
    if (!/[a-z]/.test(this.signupData.password)) {
      this.errorMessage = 'Password must contain at least one lowercase letter';
      return;
    }

    // Check for number
    if (!/[0-9]/.test(this.signupData.password)) {
      this.errorMessage = 'Password must contain at least one number';
      return;
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.signupData.password)) {
      this.errorMessage = 'Password must contain at least one special character (!@#$%^&*...)';
      return;
    }

    this.authService.register(this.signupData).subscribe({
      next: (result: any) => {
        // Send verification email
        const verificationResult = this.emailVerificationService.sendVerificationEmail(
          this.signupData.email,
          this.signupData.firstName,
          'email_verification'
        );

        if (verificationResult.success) {
          // Store signup data and token for verification
          this.pendingSignupData = { ...this.signupData };
          this.emailVerificationToken = verificationResult.token || '';
          this.emailVerificationStep = 'verify-email';
          this.emailVerificationCode = '';
          this.successMessage = 'Verification email sent! Please check your inbox.';
        }
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Registration failed. Please try again.';
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  // Email Verification Methods
  onVerifyEmail() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.emailVerificationCode || this.emailVerificationCode.length !== 6) {
      this.errorMessage = 'Please enter a valid 6-digit verification code';
      return;
    }

    // Verify the code
    const verifyResult = this.emailVerificationService.verifyEmailWithCode(
      this.pendingSignupData?.email || '',
      this.emailVerificationCode
    );

    if (verifyResult.success) {
      this.successMessage = '✅ Email verified successfully! Account activated.';
      setTimeout(() => {
        // Reset verification form
        this.emailVerificationStep = 'signup-form';
        this.emailVerificationCode = '';
        this.pendingSignupData = null;
        this.signupData = { firstName: '', email: '', phone: '', password: '' };
        this.confirmPassword = '';
        
        // Close modal and navigate
        this.closeModal();
        this.router.navigate(['/']);
      }, 1000);
    } else {
      this.errorMessage = verifyResult.message || 'Invalid verification code. Please try again.';
    }
  }

  onResendVerificationEmail() {
    if (!this.pendingSignupData) {
      this.errorMessage = 'No pending signup found';
      return;
    }

    const resendResult = this.emailVerificationService.resendVerificationEmail(
      this.pendingSignupData.email,
      this.pendingSignupData.firstName
    );

    if (resendResult.success) {
      this.successMessage = '✅ Verification email resent! Check your inbox.';
      this.emailVerificationCode = '';
    } else {
      this.errorMessage = 'Failed to resend email. Please try again.';
    }
  }

  onBackToSignupForm() {
    this.emailVerificationStep = 'signup-form';
    this.emailVerificationCode = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Forgot Password Methods
  onRequestResetCode() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate email
    if (!this.forgotPasswordData.email) {
      this.errorMessage = 'Please enter your email address';
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.forgotPasswordData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Check if user exists
    // Check if user exists
    this.authService.getUserByEmail(this.forgotPasswordData.email).subscribe({
      next: (result: any) => {
        const userExists = result.user;
        if (!userExists) {
          this.errorMessage = 'No account found with this email address. Please create an account first.';
          return;
        }

        // Send password reset email using EmailVerificationService
        const emailResult = this.emailVerificationService.sendVerificationEmail(
          this.forgotPasswordData.email,
          userExists.firstName || userExists.name || 'User',
          'password_reset'
        );

        if (emailResult.success) {
          this.forgotPasswordData.resetToken = emailResult.token || '';
          this.successMessage = '✅ Reset code sent! Check your inbox for the verification code.';
          this.forgotPasswordStep = 2;
        } else {
          this.errorMessage = emailResult.message;
        }
      },
      error: (error: any) => {
        this.errorMessage = 'No account found with this email address. Please create an account first.';
      }
    });
  }

  onVerifyResetCode() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.forgotPasswordData.code) {
      this.errorMessage = 'Please enter the reset code';
      return;
    }

    if (this.forgotPasswordData.code.length !== 6) {
      this.errorMessage = 'Reset code must be 6 digits';
      return;
    }

    // Verify code using EmailVerificationService
    const result = this.emailVerificationService.verifyEmailWithCode(
      this.forgotPasswordData.email,
      this.forgotPasswordData.code
    );

    if (result.success) {
      this.successMessage = '✅ Code verified! Please set your new password.';
      this.forgotPasswordStep = 3;
    } else {
      this.errorMessage = result.message;
    }
  }

  onResetPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate passwords
    if (!this.forgotPasswordData.newPassword || !this.forgotPasswordData.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.forgotPasswordData.newPassword !== this.forgotPasswordData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Password strength validation
    if (this.forgotPasswordData.newPassword.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters long';
      return;
    }

    if (!/[A-Z]/.test(this.forgotPasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one uppercase letter';
      return;
    }

    if (!/[a-z]/.test(this.forgotPasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one lowercase letter';
      return;
    }

    if (!/[0-9]/.test(this.forgotPasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one number';
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.forgotPasswordData.newPassword)) {
      this.errorMessage = 'Password must contain at least one special character';
      return;
    }

    // Reset password
    this.authService.resetPassword(
      this.forgotPasswordData.resetToken,
      this.forgotPasswordData.newPassword
    ).subscribe({
      next: (result: any) => {
        this.successMessage = (result.message || 'Password reset successful!') + ' - Redirecting to login...';
        setTimeout(() => {
          this.switchTab('login');
          this.successMessage = 'Password reset successful! Please login with your new password.';
        }, 2000);
      },
      error: (error: any) => {
        this.errorMessage = error.message || 'Password reset failed. Please try again.';
      }
    });
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
