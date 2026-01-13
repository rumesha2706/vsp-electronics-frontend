import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  // Replace with your actual reCAPTCHA secret key
  private secretKey = 'YOUR_RECAPTCHA_SECRET_KEY';
  private verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(private http: HttpClient) { }

  /**
   * Verify reCAPTCHA token on the server side
   * @param token - The reCAPTCHA token from client
   * @returns Observable with verification result
   */
  verifyToken(token: string): Observable<any> {
    const formData = new FormData();
    formData.append('secret', this.secretKey);
    formData.append('response', token);

    return this.http.post(this.verifyUrl, formData);
  }

  /**
   * Check if reCAPTCHA verification was successful
   * @param response - The response from verifyToken
   * @returns true if verification was successful
   */
  isVerified(response: any): boolean {
    return response && response.success && response.score > 0.5;
  }
}
