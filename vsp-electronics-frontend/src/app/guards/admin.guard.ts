import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();
  
  if (currentUser && currentUser.role === 'admin') {
    return true;
  }

  // Redirect to home if not admin
  router.navigate(['/']);
  return false;
};
