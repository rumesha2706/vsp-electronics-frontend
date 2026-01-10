import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { AboutUsComponent } from './pages/about-us/about-us.component';
import { ContactUsComponent } from './pages/contact-us/contact-us.component';
import { CartComponent } from './pages/cart/cart.component';
import { QuoteComponent } from './pages/quote/quote.component';
import { QuoteCheckoutComponent } from './pages/quote-checkout/quote-checkout.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { OrderConfirmationComponent } from './pages/order-confirmation/order-confirmation.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { CompareComponent } from './pages/compare/compare.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { WhatsappComponent } from './pages/whatsapp/whatsapp.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { ProductManagementComponent } from './pages/product-management/product-management.component';
import { ProductAddComponent } from './pages/product-add/product-add.component';
import { UserManagementComponent } from './pages/user-management/user-management.component';
import { AllCategoriesComponent } from './pages/all-categories/all-categories.component';
import { ShopComponent } from './pages/shop/shop.component';
import { CategoryProductsComponent } from './pages/category-products/category-products.component';
import { adminGuard } from './guards/admin.guard';
import { OrderHistoryComponent } from './pages/order-history/order-history.component';
import { OrdersListComponent } from './components/orders-list/orders-list.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking.component';
import { AdminCategoriesComponent } from './pages/admin/admin-categories/admin-categories.component';
import { AdminCategoryDetailsComponent } from './pages/admin/admin-category-details/admin-category-details.component';
import { AdminSubcategoriesComponent } from './pages/admin/admin-subcategories/admin-subcategories.component';
import { AdminBrandsComponent } from './pages/admin/admin-brands/admin-brands.component';
import { AdminProductEditComponent } from './pages/admin/admin-product-edit/admin-product-edit.component';
import { DebugStorageComponent } from './pages/debug/debug-storage.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'all-categories', component: AllCategoriesComponent },
  { path: 'category/:slug/:subcategorySlug', component: CategoryProductsComponent },
  { path: 'category/:slug', component: CategoryProductsComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'about-us', component: AboutUsComponent },
  { path: 'contact-us', component: ContactUsComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'quote', component: QuoteComponent },
  { path: 'quote-checkout', component: QuoteCheckoutComponent },
  { path: 'order-confirmation/:id', component: OrderConfirmationComponent },
  { path: 'orders', component: OrderHistoryComponent },
  { path: 'order/:id', component: OrderDetailsComponent },
  { path: 'order/:id/track', component: OrderTrackingComponent },
  { path: 'wishlist', component: WishlistComponent },
  { path: 'compare', component: CompareComponent },
  { path: 'my-account', component: UserProfileComponent },
  { path: 'whatsapp', component: WhatsappComponent },
  { path: 'debug/storage', component: DebugStorageComponent },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'products', component: ProductManagementComponent },
      { path: 'products/add', component: ProductAddComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'categories', component: AdminCategoriesComponent },
      { path: 'categories/:slug', component: AdminCategoryDetailsComponent },
      { path: 'subcategories', component: AdminSubcategoriesComponent },
      { path: 'brands', component: AdminBrandsComponent },
      { path: 'products/edit', component: AdminProductEditComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
