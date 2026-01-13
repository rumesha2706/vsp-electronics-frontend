import { Injectable } from '@angular/core';
// import { GMAIL_CONFIG } from '../config/gmail.config';

declare const Email: any;

@Injectable({
  providedIn: 'root'
})
export class GmailVerificationService {

  // Check if Gmail is configured
  isGmailConfigured(): boolean {
    // Gmail config not available - always return false
    return false;
  }

  /**
   * Send verification email via Gmail
   */
  async sendVerificationEmail(to: string, verificationCode: string, purpose: 'signup' | 'email-change' | 'password-reset', userName?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if Email.send is available
      if (typeof Email === 'undefined') {
        console.warn('SMTP.js not loaded, falling back to console');
        return this.logEmailToConsole(to, verificationCode, purpose, userName);
      }

      // If Gmail not configured, use console
      if (!this.isGmailConfigured()) {
        console.warn('Gmail app password not configured, using console for testing');
        return this.logEmailToConsole(to, verificationCode, purpose, userName);
      }

      // Prepare email content
      const emailTemplate = this.getEmailTemplate(verificationCode, purpose, userName);
      const subject = this.getEmailSubject(purpose);

      // Send via Gmail using SMTP.js
      const response = await Email.send({
        SecureToken: 'your-app-password-here',
        To: to,
        From: 'your-email@gmail.com',
        FromName: 'VSP Electronics',
        Subject: subject,
        Body: emailTemplate,
        Host: 'smtp.gmail.com',
        Port: 587,
        SecureConnection: false // Use STARTTLS for port 587
      });

      if (response === 'OK') {
        console.log(`✅ Verification email sent to ${to}`);
        return {
          success: true,
          message: `Verification email sent to ${to}`
        };
      } else {
        console.error('Gmail send failed:', response);
        return {
          success: false,
          message: 'Failed to send verification email. Please try again.'
        };
      }
    } catch (error) {
      console.error('Gmail verification error:', error);
      // Fallback to console logging
      return this.logEmailToConsole(to, verificationCode, purpose, userName);
    }
  }

  /**
   * Fallback: Log email to console for testing
   */
  private logEmailToConsole(to: string, code: string, purpose: string, userName?: string): { success: boolean; message: string } {
    console.log('');
    console.log('═'.repeat(70));
    console.log('📧 VERIFICATION EMAIL (Test Mode)');
    console.log('═'.repeat(70));
    console.log(`Purpose: ${purpose.toUpperCase().replace('-', ' ')}`);
    console.log(`To: ${to}`);
    if (userName) console.log(`Name: ${userName}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Expires: 24 hours from now`);
    console.log('═'.repeat(70));
    console.log('');

    return {
      success: true,
      message: 'Verification email sent! (Check console for code in test mode)'
    };
  }

  /**
   * Get email subject based on purpose
   */
  private getEmailSubject(purpose: 'signup' | 'email-change' | 'password-reset'): string {
    const subjects = {
      'signup': '🎉 Verify Your Email - VSP Electronics',
      'email-change': '🔒 Confirm Email Change - VSP Electronics',
      'password-reset': '🔐 Reset Your Password - VSP Electronics'
    };
    return subjects[purpose];
  }

  /**
   * Get HTML email template
   */
  private getEmailTemplate(code: string, purpose: 'signup' | 'email-change' | 'password-reset', userName?: string): string {
    const titles = {
      'signup': 'Email Verification',
      'email-change': 'Confirm Email Change',
      'password-reset': 'Password Reset'
    };

    const messages = {
      'signup': 'Welcome! Please verify your email address to activate your account.',
      'email-change': 'We received a request to change your email address. Please verify by entering this code.',
      'password-reset': 'We received a request to reset your password. Please verify by entering this code.'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
      font-weight: 600;
    }
    
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .greeting {
      margin-bottom: 20px;
      font-size: 16px;
    }
    
    .greeting strong {
      color: #667eea;
    }
    
    .message {
      margin: 20px 0;
      color: #555;
      line-height: 1.8;
      font-size: 15px;
    }
    
    .code-section {
      margin: 35px 0;
      text-align: center;
    }
    
    .code-label {
      color: #777;
      font-size: 13px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .code-box {
      background: linear-gradient(135deg, #f5f7fa 0%, #eff2f8 100%);
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 25px;
      margin: 15px 0;
    }
    
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 4px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
    }
    
    .warning {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .warning strong {
      color: #ff9800;
    }
    
    .warning ul {
      margin: 10px 0 0 20px;
      padding-left: 0;
    }
    
    .warning li {
      margin: 5px 0;
      color: #666;
    }
    
    .instructions {
      background: #f0f4ff;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      font-size: 14px;
      color: #555;
      line-height: 1.8;
    }
    
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: transform 0.2s;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
    }
    
    .footer {
      background: #f9f9f9;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
    
    .footer p {
      margin: 5px 0;
    }
    
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    .divider {
      height: 1px;
      background: #eee;
      margin: 30px 0;
    }
    
    .security-note {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 12px;
      margin: 15px 0;
      font-size: 13px;
      color: #2e7d32;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${titles[purpose]}</h1>
      <p>VSP Electronics</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${userName ? `<div class="greeting">Hello <strong>${userName}</strong>,</div>` : ''}
      
      <div class="message">
        ${messages[purpose]}
      </div>
      
      <!-- Verification Code -->
      <div class="code-section">
        <div class="code-label">Your Verification Code</div>
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        <p style="color: #777; font-size: 13px;">
          This code will expire in <strong>24 hours</strong>
        </p>
      </div>
      
      <!-- Instructions -->
      <div class="instructions">
        <strong>How to use this code:</strong><br>
        1. Go to the verification page<br>
        2. Enter the code above<br>
        3. Your account will be verified
      </div>
      
      <!-- Warning -->
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul>
          <li>Never share this code with anyone</li>
          <li>VSP Electronics staff will never ask for your code</li>
          <li>If you didn't request this, please ignore</li>
        </ul>
      </div>
      
      <!-- Security Note -->
      <div class="security-note">
        🔒 <strong>Account Security:</strong> This is an automated security email. Do not reply to this message.
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #555; font-size: 14px; text-align: center; margin: 20px 0;">
        If you have any questions, please contact our support team at <br>
        <a href="mailto:support@vspelectronics.com" style="color: #667eea;">support@vspelectronics.com</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>&copy; 2025 VSP Electronics. All rights reserved.</p>
      <p><a href="https://vspelectronics.com">Visit our website</a></p>
      <p>This is an automated message from VSP Electronics</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
