import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface Category {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  display_on_home?: boolean;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css']
})
export class AdminCategoriesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}`;

  categories: Category[] = [];
  showForm = false;
  editingId: number | null = null;
  loading = false;
  error = '';
  success = '';

  formData: Category = {
    name: '',
    description: '',
    image_url: '',
    display_order: 0,
    display_on_home: false
  };

  imagePreview: string | null = null;
  selectedFile: File | null = null;

  ngOnInit() {
    this.loadCategories();
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  loadCategories() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/categories`)
      .subscribe(
        (response) => {
          this.categories = Array.isArray(response) ? response : response.data || [];
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to load categories';
          this.loading = false;
        }
      );
  }

  openForm(category?: Category) {
    if (category) {
      this.editingId = category.id || null;
      this.formData = { ...category };
      this.imagePreview = category.image_url || null;
    } else {
      this.editingId = null;
      this.formData = {
        name: '',
        description: '',
        image_url: '',
        display_order: 0,
        display_on_home: false
      };
      this.imagePreview = null;
    }
    this.showForm = true;
    this.error = '';
    this.success = '';
    this.selectedFile = null;
  }

  closeForm() {
    this.showForm = false;
    this.selectedFile = null;
    this.imagePreview = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveCategory() {
    if (!this.formData.name) {
      this.error = 'Category name is required';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // Upload image if selected
      if (this.selectedFile) {
        const imageUrl = await this.uploadImage(this.selectedFile);
        this.formData.image_url = imageUrl;
      }

      // Convert field names to match backend API expectations
      const payload = {
        name: this.formData.name,
        slug: this.formData.slug || this.slugify(this.formData.name),
        description: this.formData.description,
        imageUrl: this.formData.image_url,
        displayOnHome: this.formData.display_on_home,
        displayOrder: this.formData.display_order
      };

      const url = this.editingId
        ? `${this.apiUrl}/categories/admin/${this.editingId}`
        : `${this.apiUrl}/categories/admin/create`;

      const method = this.editingId ? 'PUT' : 'POST';

      this.http.request(method, url, { body: payload })
        .subscribe(
          (response: any) => {
            this.success = this.editingId ? 'Category updated successfully' : 'Category created successfully';
            this.loadCategories();
            this.closeForm();
            this.loading = false;
          },
          (error) => {
            console.error('Save error:', error);
            this.error = error.error?.error || 'Failed to save category';
            this.loading = false;
          }
        );
    } catch (err: any) {
      console.error('Upload/Save error:', err);
      this.error = err.message || 'Failed to upload image or save category';
      this.loading = false;
    }
  }

  deleteCategory(id?: number) {
    if (!id || !confirm('Are you sure you want to delete this category?')) {
      return;
    }

    this.loading = true;
    this.http.delete(`${this.apiUrl}/categories/admin/${id}`)
      .subscribe(
        () => {
          this.success = 'Category deleted successfully';
          this.loadCategories();
          this.loading = false;
        },
        (error) => {
          this.error = 'Failed to delete category';
          this.loading = false;
        }
      );
  }

  private uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Save image locally and get path
          const base64Data = reader.result as string;
          const response = await this.http.post<any>(
            `${this.apiUrl}/upload/image`,
            { base64Data: base64Data, type: 'category' }
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
