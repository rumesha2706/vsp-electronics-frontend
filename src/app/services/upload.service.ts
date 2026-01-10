import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    private apiUrl = `${environment.apiUrl}/upload`;

    constructor(private http: HttpClient) { }

    /**
     * Upload an image (Base64 or URL)
     * type: 'category' | 'subcategory' | 'brand' | 'product' | 'general'
     */
    uploadImage(data: { base64Data?: string, imageUrl?: string, type: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/image`, data);
    }

    /**
     * Helper to convert File to Base64
     */
    fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
}
