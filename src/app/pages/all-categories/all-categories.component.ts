import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Category } from '../../models/product.model';

@Component({
  selector: 'app-all-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './all-categories.component.html',
  styleUrls: ['./all-categories.component.css']
})
export class AllCategoriesComponent implements OnInit {
  private productService = inject(ProductService);
  categories: Category[] = [];

  ngOnInit() {
    const allCategories = this.productService.getCategories();
    // Display only the last 4 main categories
    const categoryIds = ['15', '16', '17', '18'];
    this.categories = allCategories.filter(cat => categoryIds.includes(cat.id));
  }
}
