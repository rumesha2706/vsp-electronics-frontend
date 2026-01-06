import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginationState } from '../../services/pagination.service';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="pagination-container" *ngIf="paginationState && paginationState.totalPages > 1">
      <!-- Previous Button -->
      <button 
        class="pagination-btn pagination-prev"
        (click)="onPreviousPage()"
        [disabled]="paginationState.currentPage === 1"
        aria-label="Previous page">
        <i class="fas fa-chevron-left"></i>
        Previous
      </button>

      <!-- Page Numbers -->
      <div class="pagination-numbers">
        <button 
          *ngFor="let page of pageNumbers"
          class="pagination-number"
          [class.active]="page === paginationState.currentPage"
          (click)="onPageClick(page)"
          [attr.aria-label]="'Go to page ' + page"
          [attr.aria-current]="page === paginationState.currentPage ? 'page' : null">
          {{ page }}
        </button>
      </div>

      <!-- Next Button -->
      <button 
        class="pagination-btn pagination-next"
        (click)="onNextPage()"
        [disabled]="paginationState.currentPage === paginationState.totalPages"
        aria-label="Next page">
        Next
        <i class="fas fa-chevron-right"></i>
      </button>

      <!-- Page Info -->
      <div class="pagination-info">
        Page {{ paginationState.currentPage }} of {{ paginationState.totalPages }}
        ({{ paginationState.totalItems }} items)
      </div>
    </div>
  `,
  styles: [`
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 30px 0;
      flex-wrap: wrap;
    }

    .pagination-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 16px;
      background-color: #0056b3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .pagination-btn:hover:not(:disabled) {
      background-color: #0041a3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .pagination-btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .pagination-numbers {
      display: flex;
      gap: 5px;
    }

    .pagination-number {
      width: 40px;
      height: 40px;
      padding: 0;
      background-color: white;
      color: #0056b3;
      border: 2px solid #0056b3;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .pagination-number:hover:not(.active) {
      background-color: #f0f0f0;
    }

    .pagination-number.active {
      background-color: #0056b3;
      color: white;
    }

    .pagination-info {
      font-size: 14px;
      color: #666;
      padding: 0 10px;
      white-space: nowrap;
    }

    @media (max-width: 600px) {
      .pagination-container {
        gap: 5px;
      }

      .pagination-btn {
        padding: 6px 12px;
        font-size: 12px;
      }

      .pagination-number {
        width: 35px;
        height: 35px;
        font-size: 12px;
      }

      .pagination-info {
        font-size: 12px;
        width: 100%;
        text-align: center;
        order: 4;
      }
    }
  `]
})
export class PaginationComponent {
  @Input() paginationState: PaginationState | null = null;
  @Input() pageNumbers: number[] = [];
  @Output() pageChanged = new EventEmitter<number>();

  onPageClick(page: number) {
    this.pageChanged.emit(page);
  }

  onPreviousPage() {
    if (this.paginationState && this.paginationState.currentPage > 1) {
      this.pageChanged.emit(this.paginationState.currentPage - 1);
    }
  }

  onNextPage() {
    if (this.paginationState && this.paginationState.currentPage < this.paginationState.totalPages) {
      this.pageChanged.emit(this.paginationState.currentPage + 1);
    }
  }
}
