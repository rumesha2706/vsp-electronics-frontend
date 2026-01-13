import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { QuoteSidebarComponent } from './components/quote-sidebar/quote-sidebar.component';
import { QuoteService } from './services/quote.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, QuoteSidebarComponent],
  template: `
    <app-header></app-header>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
    <app-quote-sidebar [isOpen]="quoteService.sidebarOpen()" (close)="quoteService.closeSidebar()"></app-quote-sidebar>
    
    <!-- Floating WhatsApp Button -->
    <a href="https://wa.me/919951130198?text=Welcome%20to%20VSP%20Electronics!%20How%20can%20we%20help%20you%20today?" target="_blank" class="whatsapp-float" title="Chat with us on WhatsApp">
      <i class="fab fa-whatsapp"></i>
    </a>
  `,
  styles: [`
    main {
      min-height: calc(100vh - 400px);
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'VSP Electronics';
  
  constructor(public quoteService: QuoteService, private router: Router) {}

  ngOnInit() {
    // Scroll to top on route change
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo(0, 0);
      });
  }
}
