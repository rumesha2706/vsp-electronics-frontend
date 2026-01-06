import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhoneVerificationService } from '../../services/phone-verification.service';

@Component({
  selector: 'app-phone-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-verification-modal.component.html',
  styleUrls: ['./phone-verification-modal.component.css']
})
export class PhoneVerificationModalComponent implements OnInit {
  @Input() phoneNumber: string = '';
  @Input() userName: string = '';
  @Output() verified = new EventEmitter<boolean>();
  @Output() skipped = new EventEmitter<boolean>();

  private phoneVerificationService = inject(PhoneVerificationService);

  step: 'request' | 'verify' = 'request';
  otp: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  otpSent: boolean = false;
  timerSeconds: number = 300; // 5 minutes
  timerInterval: any;
  canResend: boolean = false;
  resendCount: number = 0;
  maxResends: number = 3;
  maskedPhone: string = '';

  ngOnInit() {
    this.maskPhoneNumber();
  }

  requestOTP() {
    if (!this.phoneNumber.trim()) {
      this.errorMessage = 'Please enter a phone number';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Validate and format phone number
    const formattedPhone = this.formatPhoneNumber(this.phoneNumber);
    if (!formattedPhone) {
      this.errorMessage = 'Please enter a valid phone number in format +91XXXXXXXXXX or 10 digits';
      this.loading = false;
      return;
    }

    const result = this.phoneVerificationService.sendOTP(formattedPhone);
    
    if (result.success) {
      this.successMessage = 'OTP sent to your phone! Check SMS/WhatsApp';
      this.otpSent = true;
      this.step = 'verify';
      this.phoneNumber = formattedPhone;
      this.startTimer();
      
      // Show test OTP in console (remove in production)
      if (result.otp) {
        console.log('📱 TEST OTP:', result.otp);
      }
    } else {
      this.errorMessage = result.message || 'Failed to send OTP';
    }

    this.loading = false;
  }

  verifyOTP() {
    if (!this.otp.trim()) {
      this.errorMessage = 'Please enter the OTP';
      return;
    }

    if (this.otp.length !== 6) {
      this.errorMessage = 'OTP must be 6 digits';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const result = this.phoneVerificationService.verifyOTP(this.phoneNumber, this.otp);

    if (result.success) {
      this.successMessage = 'Phone verified successfully! ✅';
      this.stopTimer();
      setTimeout(() => {
        this.verified.emit(true);
      }, 1500);
    } else {
      this.errorMessage = result.message || 'Verification failed';
    }

    this.loading = false;
  }

  resendOTP() {
    if (this.resendCount >= this.maxResends) {
      this.errorMessage = 'Maximum resend attempts reached. Please try again later.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const result = this.phoneVerificationService.resendOTP(this.phoneNumber);

    if (result.success) {
      this.successMessage = 'OTP resent to your phone!';
      this.otp = '';
      this.canResend = false;
      this.resendCount++;
      this.timerSeconds = 300;
      this.startTimer();

      // Show test OTP
      if (result.otp) {
        console.log('📱 TEST OTP (Resend):', result.otp);
      }
    } else {
      this.errorMessage = result.message || 'Failed to resend OTP';
    }

    this.loading = false;
  }

  skipVerification() {
    this.skipped.emit(true);
  }

  closeModal() {
    this.stopTimer();
  }

  private maskPhoneNumber() {
    if (this.phoneNumber.length >= 10) {
      const phone = this.phoneNumber.replace(/\D/g, '');
      const lastFour = phone.slice(-4);
      this.maskedPhone = `***${lastFour}`;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +, keep it, otherwise add +91 for Indian numbers
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      // Add +91 for 10-digit Indian numbers
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      }
    }

    // Validate format
    if (/^\+[1-9]\d{1,14}$/.test(cleaned)) {
      return cleaned;
    }

    return '';
  }

  private startTimer() {
    this.timerSeconds = 300; // 5 minutes
    this.canResend = false;

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;

      if (this.timerSeconds <= 0) {
        this.stopTimer();
        this.canResend = true;
        this.errorMessage = 'OTP expired. Please request a new one.';
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getFormattedTime(): string {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
