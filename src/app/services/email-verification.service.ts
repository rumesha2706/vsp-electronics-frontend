import { Injectable, inject } from '@angular/core';
import { EmailService } from './email.service';
import { GmailVerificationService } from './gmail-verification.service';

export interface EmailVerificationToken {
  token: string;
  email: string;
  newEmail?: string; // For email change verification
  expiresAt: number;
  used: boolean;
  createdAt: number;
  purpose: 'email_verification' | 'email_change' | 'password_reset';
}

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationService {
  private readonly EMAIL_TOKENS_KEY = 'drone_shop_email_verification_tokens';
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private emailService = inject(EmailService);
  private gmailService = inject(GmailVerificationService);

  /**
   * Generate and send email verification link
   */
  sendVerificationEmail(email: string, userName: string, purpose: 'email_verification' | 'email_change' | 'password_reset' = 'email_verification', newEmail?: string): { success: boolean; message: string; token?: string } {
    try {
      // Generate unique token
      const token = this.generateToken();
      const expiresAt = Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      // Store token
      const tokens = this.getTokens();
      tokens[token] = {
        token,
        email,
        newEmail,
        expiresAt,
        used: false,
        createdAt: Date.now(),
        purpose
      };
      localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));

      // Send email
      const emailResult = this.sendVerificationEmailNotification(email, token, userName, purpose, newEmail);

      return {
        success: emailResult.success,
        message: emailResult.message || 'Verification email sent',
        token // Return for testing
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Failed to send verification email' };
    }
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): { success: boolean; message: string; email?: string } {
    try {
      const tokens = this.getTokens();
      const emailToken = tokens[token];

      if (!emailToken) {
        return { success: false, message: 'Invalid verification link' };
      }

      // Check if already used
      if (emailToken.used) {
        return { success: false, message: 'This link has already been used' };
      }

      // Check expiration
      if (Date.now() > emailToken.expiresAt) {
        delete tokens[token];
        localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));
        return { success: false, message: 'Verification link expired. Request a new one' };
      }

      // Mark as used
      emailToken.used = true;
      tokens[token] = emailToken;
      localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));

      console.log('✅ Email verified:', emailToken.email);
      return { 
        success: true, 
        message: 'Email verified successfully',
        email: emailToken.newEmail || emailToken.email
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Failed to verify email' };
    }
  }

  /**
   * Verify email with code (alternative to link)
   */
  verifyEmailWithCode(email: string, code: string): { success: boolean; message: string } {
    try {
      const tokens = this.getTokens();
      
      // Find matching token for this email
      let matchingToken: EmailVerificationToken | null = null;
      let matchingKey: string | null = null;

      for (const [key, token] of Object.entries(tokens)) {
        if (token.email === email && !token.used && token.token.endsWith(code)) {
          if (Date.now() <= token.expiresAt) {
            matchingToken = token;
            matchingKey = key;
            break;
          }
        }
      }

      if (!matchingToken || !matchingKey) {
        return { success: false, message: 'Invalid verification code' };
      }

      // Mark as used
      matchingToken.used = true;
      tokens[matchingKey] = matchingToken;
      localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));

      console.log('✅ Email verified with code:', email);
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Code verification error:', error);
      return { success: false, message: 'Failed to verify code' };
    }
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(email: string): boolean {
    const tokens = this.getTokens();
    
    for (const token of Object.values(tokens)) {
      if ((token.email === email || token.newEmail === email) && token.used && token.purpose === 'email_verification') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get verification status for an email
   */
  getVerificationStatus(email: string): { status: string; expiresIn: number; purpose: string } | null {
    const tokens = this.getTokens();
    
    for (const token of Object.values(tokens)) {
      if (token.email === email && !token.used) {
        const expiresIn = Math.max(0, Math.ceil((token.expiresAt - Date.now()) / 1000));
        return {
          status: 'pending',
          expiresIn,
          purpose: token.purpose
        };
      }
    }

    return null;
  }

  /**
   * Resend verification email
   */
  resendVerificationEmail(email: string, userName: string): { success: boolean; message: string; token?: string } {
    // Clear old tokens for this email
    const tokens = this.getTokens();
    for (const [key, token] of Object.entries(tokens)) {
      if (token.email === email && !token.used) {
        delete tokens[key];
      }
    }
    localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));

    // Send new verification email
    return this.sendVerificationEmail(email, userName, 'email_verification');
  }

  /**
   * Cleanup expired tokens
   */
  cleanupExpiredTokens(): void {
    const tokens = this.getTokens();
    const now = Date.now();

    for (const [key, token] of Object.entries(tokens)) {
      if (now > token.expiresAt) {
        delete tokens[key];
      }
    }

    localStorage.setItem(this.EMAIL_TOKENS_KEY, JSON.stringify(tokens));
  }

  /**
   * Private helper methods
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private sendVerificationEmailNotification(email: string, token: string, userName: string, purpose: string, newEmail?: string): { success: boolean; message?: string } {
    try {
      // Get last 6 characters of token as code
      const code = token.slice(-6);

      // Create verification link (for reference)
      const verificationLink = `${window.location.origin}/verify-email?token=${token}`;

      // Map purpose to Gmail service purpose
      const gmailPurpose = purpose === 'email_verification' ? 'signup' : 
                           purpose === 'email_change' ? 'email-change' : 
                           'password-reset' as const;

      // Send via Gmail (async, but we'll return success immediately for UX)
      this.gmailService.sendVerificationEmail(email, code, gmailPurpose, userName).then(result => {
        console.log('Gmail verification email result:', result);
      }).catch(error => {
        console.error('Gmail verification email error:', error);
      });

      // Return success to user immediately
      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, message: 'Failed to send email' };
    }
  }

  private getEmailVerificationTemplate(userName: string, code: string, verificationLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #667eea; margin: 0 0 20px 0;">Welcome to VSP Electronics! 🎉</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Thank you for creating an account. Please verify your email address to activate your account.
          </p>

          <div style="margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Or use this code:</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 15px 0;">
            <code style="font-size: 24px; letter-spacing: 3px; color: #667eea; font-weight: bold;">${code}</code>
          </div>

          <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong>This link expires in 24 hours</strong>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2025 VSP Electronics. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  private getEmailChangeTemplate(userName: string, code: string, verificationLink: string, newEmail?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #667eea; margin: 0 0 20px 0;">Email Change Request 🔐</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            You recently requested to change the email address associated with your account.
          </p>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">New Email Address:</p>
            <p style="margin: 5px 0 0 0; color: #333; font-weight: bold;">${newEmail}</p>
          </div>

          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Please verify this new email address by clicking the button below:
          </p>

          <div style="margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify New Email
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Or use this code:</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 15px 0;">
            <code style="font-size: 24px; letter-spacing: 3px; color: #667eea; font-weight: bold;">${code}</code>
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; font-size: 14px;">
              <li>This link expires in 24 hours</li>
              <li>Your account email will be updated once verified</li>
              <li>If you didn't make this request, you can safely ignore this email</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2025 VSP Electronics. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  private getPasswordResetTemplate(userName: string, code: string, verificationLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #667eea; margin: 0 0 20px 0;">Password Reset Request 🔐</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Please verify your email first by clicking the button below:
          </p>

          <div style="margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify & Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Or use this code:</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 15px 0;">
            <code style="font-size: 24px; letter-spacing: 3px; color: #667eea; font-weight: bold;">${code}</code>
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; font-size: 14px;">
              <li>This verification link expires in 24 hours</li>
              <li>You can only use this link once</li>
              <li>If you didn't request a password reset, contact support immediately</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            © 2025 VSP Electronics. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  private getTokens(): { [key: string]: EmailVerificationToken } {
    const data = localStorage.getItem(this.EMAIL_TOKENS_KEY);
    return data ? JSON.parse(data) : {};
  }
}
