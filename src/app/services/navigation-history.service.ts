import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NavigationHistoryService {
  private router = inject(Router);
  private location = inject(Location);
  private previousUrl: string = '/';
  private currentUrl: string = '/';

  constructor() {
    this.initializeRouterHistory();
  }

  private initializeRouterHistory(): void {
    // Set the initial URL
    this.currentUrl = this.router.url || '/';
    this.previousUrl = this.currentUrl;

    // Track every navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd | any) => {
        // Update previous URL to current before setting new current
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.url;

        console.log('Navigation tracked:', {
          previousUrl: this.previousUrl,
          currentUrl: this.currentUrl
        });
      });
  }

  getPreviousUrl(): string {
    return this.previousUrl || '/all-categories';
  }

  getCurrentUrl(): string {
    return this.currentUrl || '/';
  }

  goBack(): void {
    const previousUrl = this.getPreviousUrl();
    
    console.log('Going back to:', previousUrl);
    console.log('Current URL:', this.currentUrl);

    if (previousUrl) {
      this.router.navigateByUrl(previousUrl);
    } else {
      // Default to all-categories if no previous URL exists
      this.router.navigate(['/all-categories']);
    }
  }

  clearHistory(): void {
    this.previousUrl = '/all-categories';
    this.currentUrl = this.router.url || '/';
  }
}
