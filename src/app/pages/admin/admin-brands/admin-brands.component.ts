import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface Brand {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  image?: string;
  logo_url?: string;
  website?: string;
  website_url?: string;
  display_order?: number;
  is_featured?: boolean;
  product_count?: number;
}

@Component({
  selector: 'app-admin-brands',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-brands.component.html',
  styleUrls: ['./admin-brands.component.css']
})
export class AdminBrandsComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}`;

  brands: Brand[] = [];
  showForm = false;
  editingId: number | null = null;
  loading = false;
  error = '';
  success = '';
  selectedFile: File | null = null;

  formData: Brand = {
    name: '',
    description: '',
    image_url: '',
    logo_url: '',
    website: '',
    website_url: '',
    display_order: 0
  };

  ngOnInit() {
    this.loadBrands();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  loadBrands() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/brands`)
      .subscribe(
        (response) => {
          console.log('Brands API Response:', response);
          const brandsData = Array.isArray(response) ? response : response.data || response.brands || [];
          console.log('Brands Data After Mapping:', brandsData);
          // Map database field names to component field names
          this.brands = brandsData.map((brand: any) => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            image: brand.image,  // Direct image field
            logo_url: brand.image,  // Also set logo_url for compatibility
            website: brand.metadata?.website_url || brand.website,
            website_url: brand.metadata?.website_url || brand.website,
            display_order: brand.metadata?.display_order || 0,
            is_featured: brand.metadata?.is_featured || false,
            product_count: brand.metadata?.product_count || 0
          }));
          console.log('Final Brands Array:', this.brands);
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to load brands';
          console.error('Error loading brands:', error);
          this.loading = false;
        }
      );
  }

  openForm(brand?: Brand) {
    if (brand) {
      this.editingId = brand.id || null;
      this.formData = { ...brand };
    } else {
      this.editingId = null;
      this.formData = {
        name: '',
        description: '',
        image_url: '',
        logo_url: '',
        website: '',
        display_order: 0
      };
    }
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  closeForm() {
    this.showForm = false;
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async saveBrand() {
    if (!this.formData.name) {
      this.error = 'Brand name is required';
      return;
    }

    this.loading = true;

    try {
      // Upload image if selected
      if (this.selectedFile) {
        const imageUrl = await this.uploadImage(this.selectedFile);
        this.formData.logo_url = imageUrl;
      }

      // Convert field names to match backend API expectations
      const payload = {
        name: this.formData.name,
        slug: this.formData.slug || this.slugify(this.formData.name),
        description: this.formData.description,
        image: this.formData.logo_url,
        metadata: {
          website_url: this.formData.website || this.formData.website_url,
          display_order: this.formData.display_order,
          is_featured: this.formData.is_featured || false,
          product_count: this.formData.product_count || 0
        }
      };

      const url = this.editingId
        ? `${this.apiUrl}/brands/${this.editingId}`
        : `${this.apiUrl}/brands`;

      const method = this.editingId ? 'PUT' : 'POST';

      this.http.request(method, url, { 
        body: payload,
        headers: this.getAuthHeaders()
      })
        .subscribe(
          (response: any) => {
            this.success = this.editingId ? 'Brand updated successfully' : 'Brand created successfully';
            this.loadBrands();
            this.closeForm();
            this.loading = false;
          },
          (error) => {
            this.error = error.error?.error || 'Failed to save brand';
            this.loading = false;
          }
        );
    } catch (err: any) {
      this.error = err.message || 'Failed to upload image';
      this.loading = false;
    }
  }

  deleteBrand(id?: number) {
    if (!id || !confirm('Are you sure you want to delete this brand?')) {
      return;
    }

    this.loading = true;
    this.http.delete(`${this.apiUrl}/brands/${id}`, { 
      headers: this.getAuthHeaders()
    })
      .subscribe(
        () => {
          this.success = 'Brand deleted successfully';
          this.loadBrands();
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to delete brand';
          this.loading = false;
        }
      );
  }

  private uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await this.http.post<any>(
            `${this.apiUrl}/upload/image`,
            { base64Data: base64Data, type: 'brand' }
          ).toPromise();
          
          resolve(response?.imageUrl || base64Data);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
