import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {
  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add security headers to all requests
    const securedRequest = request.clone({
      setHeaders: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json'
      }
    });

    return next.handle(securedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle security-related errors
        if (error.status === 403) {
          console.error('Access Forbidden - Possible security violation');
          // Optionally redirect to login or error page
        }
        if (error.status === 401) {
          console.error('Unauthorized - Authentication required');
          // Optionally redirect to login
        }
        return throwError(() => error);
      })
    );
  }
}
