import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';

export interface User {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  role?: 'admin' | 'user';
  emailVerified?: boolean;
  createdAt?: string;
  // Additional profile fields from backend
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  profilePicture?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  user?: User;
  token?: string;
  accessToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'authToken';
  private readonly CURRENT_USER_KEY = 'currentUser';
  private readonly API_URL = environment.apiUrl;

  private http = inject(HttpClient);
  private analyticsService = inject(AnalyticsService);

  // Observables for reactive components
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Signal-based properties for backward compatibility
  currentUser = signal<User | null>(this.getUserFromStorage());
  isLoggedIn = signal<boolean>(this.hasValidToken());
  sessionExpired = signal<boolean>(false);

  private activityTimer: any;
  private storageListener: any;

  constructor() {
    this.loadCurrentUser();
    this.startActivityTracking();
    this.setupCrossTabSync();
  }

  private getUserFromStorage(): User | null {
    try {
      const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
    return !!token;
  }

  private loadCurrentUser() {
    const user = this.getUserFromStorage();
    if (user && this.hasValidToken()) {
      this.currentUser.set(user);
      this.currentUserSubject.next(user);
      this.isLoggedIn.set(true);
      this.isAuthenticatedSubject.next(true);
      this.analyticsService.trackActiveUser(user.id || user.userId || '');
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
  }

  private saveCurrentUser(user: User): void {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
  }

  private clearCurrentUser(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
  }

  private startActivityTracking() {
    // Update activity on user interactions
    ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, () => {
        // Activity tracking can be extended for session timeout
      }, { passive: true });
    });
  }

  private setupCrossTabSync() {
    // Listen for storage changes from other tabs
    this.storageListener = (event: StorageEvent) => {
      if (event.key === this.CURRENT_USER_KEY) {
        if (event.newValue) {
          // User logged in from another tab
          try {
            const user = JSON.parse(event.newValue);
            this.currentUser.set(user);
            this.currentUserSubject.next(user);
            this.isLoggedIn.set(true);
            this.isAuthenticatedSubject.next(true);
            this.analyticsService.trackActiveUser(user.id || user.userId || '');
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        } else {
          // User logged out from another tab
          this.currentUser.set(null);
          this.currentUserSubject.next(null);
          this.isLoggedIn.set(false);
          this.isAuthenticatedSubject.next(false);
        }
      } else if (event.key === this.AUTH_TOKEN_KEY) {
        if (!event.newValue) {
          // Token cleared from another tab
          this.clearCurrentUser();
          this.isLoggedIn.set(false);
          this.isAuthenticatedSubject.next(false);
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  /**
   * Register a new user with email verification
   */
  register(data: SignupData): Observable<AuthResponse> {
    const payload = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName || '',
      phone: data.phone || ''
    };

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, payload).pipe(
      tap(response => {
        if (response.success) {
          // Show verification email message
          console.log('Registration successful. Please check your email to verify your account.');
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.token || response.accessToken) {
          const token = (response.token || response.accessToken) as string;
          this.setToken(token);

          // Extract user info from response
          const user = (response.user || {
            email: credentials.email
          }) as User;
          this.saveCurrentUser(user);

          this.isLoggedIn.set(true);
          this.isAuthenticatedSubject.next(true);
          this.analyticsService.trackActiveUser(user.id || user.userId || '');
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Verify email with token from email link
   */
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/verify-email`, { token }).pipe(
      tap(response => {
        if (response.token || response.accessToken) {
          const authToken = (response.token || response.accessToken) as string;
          this.setToken(authToken);

          const user = (response.user || { email: '' }) as User;
          this.saveCurrentUser(user);

          this.isLoggedIn.set(true);
          this.isAuthenticatedSubject.next(true);
          this.analyticsService.trackActiveUser(user.id || user.userId || '');
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Resend verification email
   */
  resendVerification(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/resend-verification`, { email }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/forgot-password`, { email }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(resetToken: string, password: string, email?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/reset-password`, {
      resetToken,
      password,
      email
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Logout current user
   */
  logout() {
    this.clearToken();
    this.clearCurrentUser();
    this.isLoggedIn.set(false);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get user profile (protected endpoint)
   */
  getProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/users/profile`).pipe(
      tap(response => {
        const user = response.user;
        this.saveCurrentUser(user);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update user profile (protected endpoint)
   */
  updateProfile(profileData: Partial<User>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.API_URL}/users/profile`, profileData).pipe(
      tap(response => {
        const user = response.user;
        this.saveCurrentUser(user);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get public user profile by ID
   */
  getUserById(userId: string): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/users/${userId}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Legacy methods for backward compatibility with existing code
   */
  signup(data: SignupData): { success: boolean; message: string; user?: User } {
    // Note: This is synchronous and returns mock response for backward compatibility
    // Use register() Observable method for actual implementation
    return {
      success: true,
      message: 'Please use the register() method with proper async handling'
    };
  }

  /**
   * Check if user is logged in
   */
  isAuthenticated(): boolean {
    return this.hasValidToken() && !!this.currentUser();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.role === 'admin' || false;
  }

  /**
   * Require authentication
   */
  requireLogin(): boolean {
    return !this.isAuthenticated();
  }

  /**
   * Get all users (admin endpoint)
   */
  getAllUsers(): User[] {
    // Return empty array - this should be called from backend
    // This is a placeholder for backward compatibility
    return [];
  }

  /**
   * Get user by email (admin endpoint)
   */
  getUserByEmail(email: string): Observable<{ user?: User }> {
    return this.http.post<{ user?: User }>(`${this.API_URL}/users/by-email`, { email }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete user (admin endpoint)
   */
  deleteUser(userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/users/${userId}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Error handling
   */
  private handleError(error: any) {
    let errorMessage = 'An error occurred';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message || 'Network error';
      } else {
        // Server-side error
        errorMessage = error.error?.message || error.error?.error || error.statusText || errorMessage;
      }
    }

    console.error('Auth error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
