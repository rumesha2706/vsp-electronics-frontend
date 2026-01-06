import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private paginationState = new BehaviorSubject<PaginationState>({
    currentPage: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1
  });

  public pagination$ = this.paginationState.asObservable();

  constructor() { }

  /**
   * Calculate pagination details
   */
  calculatePagination(totalItems: number, pageSize: number = 12): PaginationState {
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentPage = this.paginationState.value.currentPage;

    const state: PaginationState = {
      currentPage: currentPage > totalPages ? 1 : currentPage,
      pageSize,
      totalItems,
      totalPages
    };

    this.paginationState.next(state);
    return state;
  }

  /**
   * Set current page
   */
  setCurrentPage(page: number) {
    const state = this.paginationState.value;
    if (page >= 1 && page <= state.totalPages) {
      this.paginationState.next({ ...state, currentPage: page });
    }
  }

  /**
   * Get paginated items from array
   */
  getPaginatedItems<T>(items: T[]): T[] {
    const state = this.paginationState.value;
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return items.slice(startIndex, endIndex);
  }

  /**
   * Get current pagination state
   */
  getCurrentState(): PaginationState {
    return this.paginationState.value;
  }

  /**
   * Reset pagination to page 1
   */
  resetPagination() {
    const state = this.paginationState.value;
    this.paginationState.next({ ...state, currentPage: 1 });
  }

  /**
   * Generate page numbers for display (e.g., [1, 2, 3, 4, 5])
   */
  getPageNumbers(): number[] {
    const state = this.paginationState.value;
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(state.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
