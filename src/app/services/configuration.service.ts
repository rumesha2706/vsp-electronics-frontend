/**
 * Secure Configuration Service
 * Loads non-sensitive configuration from backend API
 * Replaces hardcoded config files in src/app/config/
 * 
 * IMPORTANT: Sensitive data (passwords, secrets) MUST NEVER be stored on frontend
 * These should only be in environment variables on the backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';

export interface SecurityConfig {
  recaptcha?: {
    siteKey: string;
    scoreThreshold: number;
    enabledForms: {
      login: boolean;
      signup: boolean;
      contactForm: boolean;
      quote: boolean;
      checkout: boolean;
    };
  };
  csp?: any;
  cors?: any;
}

export interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  scopes: string[];
}

export interface EmailConfig {
  senderName: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private configUrl = '/api/config';
  
  private securityConfig$ = new BehaviorSubject<SecurityConfig | null>(null);
  private oauthConfig$ = new BehaviorSubject<OAuthConfig | null>(null);
  private emailConfig$ = new BehaviorSubject<EmailConfig | null>(null);

  constructor(private http: HttpClient) {
    this.loadConfigurations();
  }

  /**
   * Load all configurations from backend
   */
  private loadConfigurations(): void {
    this.loadSecurityConfig();
    this.loadOAuthConfig();
    this.loadEmailConfig();
  }

  /**
   * Get security configuration (reCAPTCHA, CSP, etc.)
   * Cached and shared across all subscribers
   */
  getSecurityConfig(): Observable<SecurityConfig | null> {
    if (this.securityConfig$.value) {
      return of(this.securityConfig$.value);
    }

    return this.http
      .get<SecurityConfig>(`${this.configUrl}/security`)
      .pipe(
        tap(config => this.securityConfig$.next(config)),
        catchError(error => {
          console.error('Error loading security config:', error);
          return of(null);
        }),
        shareReplay(1)
      );
  }

  /**
   * Get reCAPTCHA site key specifically
   */
  getRecaptchaSiteKey(): string {
    return this.securityConfig$.value?.recaptcha?.siteKey || '';
  }

  /**
   * Check if reCAPTCHA is enabled for a form
   */
  isRecaptchaEnabled(formType: string): boolean {
    const forms = this.securityConfig$.value?.recaptcha?.enabledForms;
    return forms ? (forms[formType as keyof typeof forms] || false) : false;
  }

  /**
   * Get OAuth configuration
   * NOTE: Frontend should never have clientId - backend will provide it via API
   */
  getOAuthConfig(): Observable<OAuthConfig | null> {
    if (this.oauthConfig$.value) {
      return of(this.oauthConfig$.value);
    }

    return this.http
      .get<OAuthConfig>(`${this.configUrl}/oauth`)
      .pipe(
        tap(config => this.oauthConfig$.next(config)),
        catchError(error => {
          console.error('Error loading OAuth config:', error);
          return of(null);
        }),
        shareReplay(1)
      );
  }

  /**
   * Get email configuration (non-sensitive parts only)
   * Password MUST NOT be stored on frontend
   */
  getEmailConfig(): Observable<EmailConfig | null> {
    if (this.emailConfig$.value) {
      return of(this.emailConfig$.value);
    }

    return this.http
      .get<EmailConfig>(`${this.configUrl}/email`)
      .pipe(
        tap(config => this.emailConfig$.next(config)),
        catchError(error => {
          console.error('Error loading email config:', error);
          return of(null);
        }),
        shareReplay(1)
      );
  }

  /**
   * Reload configurations (admin action)
   */
  reloadConfigurations(): void {
    this.loadConfigurations();
  }

  /**
   * Private method to load security config
   */
  private loadSecurityConfig(): void {
    this.getSecurityConfig().subscribe();
  }

  /**
   * Private method to load OAuth config
   */
  private loadOAuthConfig(): void {
    this.getOAuthConfig().subscribe();
  }

  /**
   * Private method to load email config
   */
  private loadEmailConfig(): void {
    this.getEmailConfig().subscribe();
  }

  /**
   * Get current values synchronously (after loading)
   */
  getSecurityConfigSync(): SecurityConfig | null {
    return this.securityConfig$.value;
  }

  getOAuthConfigSync(): OAuthConfig | null {
    return this.oauthConfig$.value;
  }

  getEmailConfigSync(): EmailConfig | null {
    return this.emailConfig$.value;
  }
}
