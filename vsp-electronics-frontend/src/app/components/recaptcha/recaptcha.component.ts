import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recaptcha',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recaptcha-container">
      <div class="g-recaptcha" 
           [attr.data-sitekey]="siteKey"
           [attr.data-callback]="'onRecaptchaSuccess'"
           data-callback="onRecaptchaSuccess">
      </div>
      <p class="recaptcha-notice" *ngIf="showNotice">
        This site is protected by reCAPTCHA and the Google
        <a href="https://policies.google.com/privacy" target="_blank">Privacy Policy</a> and
        <a href="https://policies.google.com/terms" target="_blank">Terms of Service</a> apply.
      </p>
    </div>
  `,
  styles: [`
    .recaptcha-container {
      margin: 15px 0;
    }

    .recaptcha-notice {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
      line-height: 1.4;
    }

    .recaptcha-notice a {
      color: #1976d2;
      text-decoration: none;
    }

    .recaptcha-notice a:hover {
      text-decoration: underline;
    }
  `]
})
export class RecaptchaComponent {
  // Replace with your actual reCAPTCHA site key
  siteKey = 'YOUR_RECAPTCHA_SITE_KEY';
  showNotice = true;

  @Output() recaptchaSuccess = new EventEmitter<string>();

  onRecaptchaSuccess(token: string) {
    this.recaptchaSuccess.emit(token);
  }

  reset() {
    const grecaptcha = (window as any)['grecaptcha'];
    if (grecaptcha) {
      grecaptcha.reset();
    }
  }
}
