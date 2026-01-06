import { Injectable } from '@angular/core';

export interface PhoneOTP {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class PhoneVerificationService {
  private readonly PHONE_OTP_KEY = 'drone_shop_phone_otps';
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly COOLDOWN_MINUTES = 5; // Cooldown after max attempts

  // Simulated SMS service - in production, use Twilio/AWS SNS
  sendOTP(phone: string): { success: boolean; message: string; otp?: string } {
    try {
      // Validate phone format (E.164)
      if (!this.isValidPhone(phone)) {
        return { success: false, message: 'Invalid phone number format' };
      }

      // Check if user is in cooldown
      const cooldownStatus = this.checkCooldown(phone);
      if (cooldownStatus.inCooldown) {
        return { 
          success: false, 
          message: `Too many attempts. Please try again after ${cooldownStatus.remainingMinutes} minutes`
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = Date.now() + (this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP
      const otps = this.getPhoneOTPs();
      otps[phone] = {
        phone,
        otp,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: Date.now()
      };
      localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));

      // In production, send actual SMS here
      // Example: await twilioService.sendSMS(phone, `Your VSP Electronics OTP is: ${otp}`);
      
      console.log('📱 OTP SENT', {
        phone,
        otp,
        expiresIn: `${this.OTP_EXPIRY_MINUTES} minutes`
      });

      return { 
        success: true, 
        message: 'OTP sent to your phone',
        otp // Return OTP for testing - remove in production
      };
    } catch (error) {
      console.error('OTP generation error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  verifyOTP(phone: string, otp: string): { success: boolean; message: string } {
    try {
      const otps = this.getPhoneOTPs();
      const phoneOTP = otps[phone];

      if (!phoneOTP) {
        return { success: false, message: 'No OTP requested for this phone' };
      }

      if (phoneOTP.verified) {
        return { success: false, message: 'Phone already verified' };
      }

      // Check expiration
      if (Date.now() > phoneOTP.expiresAt) {
        delete otps[phone];
        localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));
        return { success: false, message: 'OTP expired. Request a new one' };
      }

      // Check attempts
      if (phoneOTP.attempts >= this.MAX_ATTEMPTS) {
        return { 
          success: false, 
          message: 'Too many failed attempts. Please request a new OTP' 
        };
      }

      // Verify OTP
      if (phoneOTP.otp !== otp) {
        phoneOTP.attempts++;
        otps[phone] = phoneOTP;
        localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));
        
        const remaining = this.MAX_ATTEMPTS - phoneOTP.attempts;
        return { 
          success: false, 
          message: remaining > 0 
            ? `Invalid OTP. ${remaining} attempts remaining`
            : 'Too many failed attempts. Request a new OTP'
        };
      }

      // Mark as verified
      phoneOTP.verified = true;
      otps[phone] = phoneOTP;
      localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));

      console.log('✅ Phone verified:', phone);
      return { success: true, message: 'Phone verified successfully' };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, message: 'Failed to verify OTP' };
    }
  }

  isPhoneVerified(phone: string): boolean {
    const otps = this.getPhoneOTPs();
    const phoneOTP = otps[phone];
    return phoneOTP ? phoneOTP.verified : false;
  }

  resendOTP(phone: string): { success: boolean; message: string; otp?: string } {
    const otps = this.getPhoneOTPs();
    delete otps[phone]; // Clear old OTP
    localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));
    
    return this.sendOTP(phone);
  }

  getOTPStatus(phone: string): { status: string; remainingTime: number; attempts: number } | null {
    const otps = this.getPhoneOTPs();
    const phoneOTP = otps[phone];

    if (!phoneOTP) {
      return null;
    }

    const remainingTime = Math.max(0, Math.ceil((phoneOTP.expiresAt - Date.now()) / 1000));
    return {
      status: phoneOTP.verified ? 'verified' : 'pending',
      remainingTime,
      attempts: phoneOTP.attempts
    };
  }

  clearOTP(phone: string): void {
    const otps = this.getPhoneOTPs();
    delete otps[phone];
    localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isValidPhone(phone: string): boolean {
    // E.164 format validation: +[1-9]{1,15}
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    // Also accept 10-digit format: +91XXXXXXXXXX
    const indianRegex = /^\+91[6-9]\d{9}$/;
    
    return e164Regex.test(phone) || indianRegex.test(phone);
  }

  private checkCooldown(phone: string): { inCooldown: boolean; remainingMinutes: number } {
    const otps = this.getPhoneOTPs();
    const phoneOTP = otps[phone];

    if (!phoneOTP || phoneOTP.attempts < this.MAX_ATTEMPTS) {
      return { inCooldown: false, remainingMinutes: 0 };
    }

    const cooldownEnd = phoneOTP.createdAt + (this.COOLDOWN_MINUTES * 60 * 1000);
    const now = Date.now();

    if (now < cooldownEnd) {
      const remainingMs = cooldownEnd - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { inCooldown: true, remainingMinutes };
    }

    // Cooldown expired, clear OTP
    delete otps[phone];
    localStorage.setItem(this.PHONE_OTP_KEY, JSON.stringify(otps));
    return { inCooldown: false, remainingMinutes: 0 };
  }

  private getPhoneOTPs(): { [key: string]: PhoneOTP } {
    const data = localStorage.getItem(this.PHONE_OTP_KEY);
    return data ? JSON.parse(data) : {};
  }
}
