import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';

export interface UserAnalytics {
  user: User;
  totalPurchases: number;
  totalAmount: number;
  lastPurchaseDate: string;
  browsingScore: number;
  purchaseScore: number;
  overallGrade: string;
  gradeColor: string;
  activityDays: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private router = inject(Router);
  private location = inject(Location);
  private http = inject(HttpClient);

  users: UserAnalytics[] = [];
  filteredUsers: UserAnalytics[] = [];
  searchTerm: string = '';
  sortBy: 'name' | 'email' | 'grade' | 'purchases' | 'amount' | 'activity' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  // Push notification
  showNotificationModal: boolean = false;
  notificationTitle: string = '';
  notificationMessage: string = '';
  selectedUsers: Set<string> = new Set();
  selectAll: boolean = false;

  // Delete confirmation
  showDeleteConfirmModal: boolean = false;
  userToDelete: User | null = null;
  isMultiDelete: boolean = false;
  usersToDelete: User[] = [];

  // Delete result modal
  showDeleteResultModal: boolean = false;
  deleteResultMessage: string = '';
  deleteResultType: 'success' | 'error' | 'mixed' = 'success';
  deleteResultDetails: { successCount: number; failCount: number } = { successCount: 0, failCount: 0 };

  // Create user modal
  showCreateUserModal: boolean = false;
  newUserForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  };
  createUserErrors: { [key: string]: string } = {};
  createUserSuccess: boolean = false;

  ngOnInit() {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return;
    }
    
    this.loadUsers();
  }

  goBack() {
    this.location.back();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.http.get<{ success: boolean; data: any[] }>('/api/users/admin/all', { headers }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const allUsers = response.data;
          const transactions = this.analyticsService.getTransactions();
          
          this.users = allUsers.map((user: any) => {
            // Calculate user metrics
            const userTransactions = transactions.filter(t => t.userId === user.id);
            const totalPurchases = userTransactions.filter(t => t.type === 'order').length;
            const totalAmount = userTransactions
              .filter(t => t.type === 'order' && t.amount)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            const lastPurchase = userTransactions
              .filter(t => t.type === 'order')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            
            const lastPurchaseDate = lastPurchase ? lastPurchase.timestamp : user.created_at;
            
            // Calculate activity days (unique days with transactions)
            const uniqueDays = new Set(
              userTransactions.map(t => t.timestamp.split('T')[0])
            );
            const activityDays = uniqueDays.size;
            
            // Calculate scores
            const browsingScore = Math.min(100, activityDays * 10);
            const purchaseScore = Math.min(100, totalPurchases * 20);
            const amountScore = Math.min(100, (totalAmount / 1000) * 10);
            
            const overallScore = (browsingScore * 0.3) + (purchaseScore * 0.4) + (amountScore * 0.3);
            
            // Determine grade
            let grade = 'F';
            let gradeColor = '#dc3545';
            
            if (overallScore >= 90) {
              grade = 'A+';
              gradeColor = '#28a745';
            } else if (overallScore >= 80) {
              grade = 'A';
              gradeColor = '#5cb85c';
            } else if (overallScore >= 70) {
              grade = 'B+';
              gradeColor = '#5bc0de';
            } else if (overallScore >= 60) {
              grade = 'B';
              gradeColor = '#0275d8';
            } else if (overallScore >= 50) {
              grade = 'C';
              gradeColor = '#f0ad4e';
            } else if (overallScore >= 40) {
              grade = 'D';
              gradeColor = '#ff8c00';
            }
            
            return {
              user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                name: user.first_name || user.email
              },
              totalPurchases,
              totalAmount,
              lastPurchaseDate,
              browsingScore,
              purchaseScore,
              overallGrade: grade,
              gradeColor,
              activityDays
            };
          });
          
          this.applyFilters();
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  applyFilters() {
    // Apply search filter
    let filtered = this.users;
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        (u.user.name || u.user.firstName || '').toLowerCase().includes(term) ||
        u.user.email.toLowerCase().includes(term) ||
        (u.user.phone || '').includes(term)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          const nameA = (a.user.name || a.user.firstName || '').toLowerCase();
          const nameB = (b.user.name || b.user.firstName || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'email':
          comparison = a.user.email.localeCompare(b.user.email);
          break;
        case 'grade':
          const gradeOrder = { 'A+': 7, 'A': 6, 'B+': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
          comparison = (gradeOrder[a.overallGrade as keyof typeof gradeOrder] || 0) - 
                      (gradeOrder[b.overallGrade as keyof typeof gradeOrder] || 0);
          break;
        case 'purchases':
          comparison = a.totalPurchases - b.totalPurchases;
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'activity':
          comparison = a.activityDays - b.activityDays;
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    this.filteredUsers = filtered;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  getPaginatedUsers(): UserAnalytics[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  sortTable(column: 'name' | 'email' | 'grade' | 'purchases' | 'amount' | 'activity') {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.applyFilters();
  }

  onSearch() {
    this.currentPage = 1;
    this.applyFilters();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }

  toggleUserSelection(userId: string | undefined) {
    if (!userId) return;
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    
    if (this.selectAll) {
      this.getPaginatedUsers().forEach(ua => {
        if (ua.user.id) {
          this.selectedUsers.add(ua.user.id);
        }
      });
    } else {
      this.getPaginatedUsers().forEach(ua => {
        if (ua.user.id) {
          this.selectedUsers.delete(ua.user.id);
        }
      });
    }
  }

  updateSelectAllState() {
    const paginatedUsers = this.getPaginatedUsers();
    this.selectAll = paginatedUsers.length > 0 && 
                     paginatedUsers.every(ua => ua.user.id && this.selectedUsers.has(ua.user.id));
  }

  isSelected(userId: string | undefined): boolean {
    return userId ? this.selectedUsers.has(userId) : false;
  }

  openNotificationModal() {
    if (this.selectedUsers.size === 0) {
      alert('Please select at least one user to send notification');
      return;
    }
    this.showNotificationModal = true;
  }

  closeNotificationModal() {
    this.showNotificationModal = false;
    this.notificationTitle = '';
    this.notificationMessage = '';
  }

  sendNotification() {
    if (!this.notificationTitle.trim() || !this.notificationMessage.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    // In a real app, this would call a backend API to send push notifications
    // For now, we'll store it in localStorage as a log
    const notifications = this.getNotificationLogs();
    const newNotification = {
      id: Date.now().toString(),
      title: this.notificationTitle,
      message: this.notificationMessage,
      recipients: Array.from(this.selectedUsers),
      recipientCount: this.selectedUsers.size,
      timestamp: new Date().toISOString()
    };
    
    notifications.push(newNotification);
    localStorage.setItem('drone_shop_notifications', JSON.stringify(notifications));
    
    alert(`Notification sent to ${this.selectedUsers.size} user(s)`);
    
    // Clear selection and close modal
    this.selectedUsers.clear();
    this.selectAll = false;
    this.closeNotificationModal();
  }

  private getNotificationLogs(): any[] {
    const logs = localStorage.getItem('drone_shop_notifications');
    return logs ? JSON.parse(logs) : [];
  }

  viewUserDetails(user: User) {
    // Navigate to user detail page or show modal
  }

  exportToCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Grade', 'Purchases', 'Total Amount', 'Activity Days', 'Last Purchase'];
    const rows = this.filteredUsers.map(ua => [
      ua.user.name,
      ua.user.email,
      ua.user.phone,
      ua.overallGrade,
      ua.totalPurchases.toString(),
      ua.totalAmount.toString(),
      ua.activityDays.toString(),
      this.formatDate(ua.lastPurchaseDate)
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getPremiumUsersCount(): number {
    return this.users.filter(u => u.overallGrade === 'A+' || u.overallGrade === 'A').length;
  }

  getTotalPurchases(): number {
    return this.users.reduce((sum, u) => sum + u.totalPurchases, 0);
  }

  getTotalRevenue(): number {
    return this.users.reduce((sum, u) => sum + u.totalAmount, 0);
  }

  openDeleteConfirmModal(user: User) {
    this.userToDelete = user;
    this.isMultiDelete = false;
    this.usersToDelete = [];
    this.showDeleteConfirmModal = true;
  }

  openMultiDeleteConfirmModal() {
    if (this.selectedUsers.size === 0) {
      alert('Please select at least one user to delete');
      return;
    }

    // Get the list of users to delete
    this.usersToDelete = this.users
      .filter(u => u.user.id && u.user.id && this.selectedUsers.has(u.user.id))
      .map(u => u.user);

    this.isMultiDelete = true;
    this.userToDelete = null;
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.userToDelete = null;
    this.usersToDelete = [];
    this.isMultiDelete = false;
  }

  confirmDeleteUser() {
    if (this.isMultiDelete) {
      this.confirmDeleteMultipleUsers();
    } else {
      this.confirmDeleteSingleUser();
    }
  }

  confirmDeleteSingleUser() {
    if (!this.userToDelete?.id) return;

    this.authService.deleteUser(this.userToDelete.id).subscribe({
      next: (result: any) => {
        this.deleteResultType = 'success';
        this.deleteResultMessage = `User "${this.userToDelete?.name}" has been deleted successfully`;
        this.deleteResultDetails = { successCount: 1, failCount: 0 };
        this.closeDeleteConfirmModal();
        
        // Reload users after a small delay to ensure localStorage is updated
        setTimeout(() => {
          this.loadUsers();
          this.showDeleteResultModal = true;
        }, 300);
      },
      error: (error: any) => {
        this.deleteResultType = 'error';
        this.deleteResultMessage = 'Error: ' + (error.message || 'Failed to delete user');
        this.deleteResultDetails = { successCount: 0, failCount: 1 };
        this.showDeleteResultModal = true;
      }
    });
  }

  confirmDeleteMultipleUsers() {
    if (this.usersToDelete.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let completed = 0;

    for (const user of this.usersToDelete) {
      if (!user.id) continue;
      this.authService.deleteUser(user.id).subscribe({
        next: (result: any) => {
          successCount++;
          completed++;
          if (completed === this.usersToDelete.length) {
            this.updateDeleteResults(successCount, failCount);
          }
        },
        error: (error: any) => {
          failCount++;
          completed++;
          if (completed === this.usersToDelete.length) {
            this.updateDeleteResults(successCount, failCount);
          }
        }
      });
    }
  }

  private updateDeleteResults(successCount: number, failCount: number) {

    // Determine result type
    if (failCount === 0) {
      this.deleteResultType = 'success';
      this.deleteResultMessage = `Successfully deleted ${successCount} user(s)`;
    } else if (successCount === 0) {
      this.deleteResultType = 'error';
      this.deleteResultMessage = `Failed to delete ${failCount} user(s)`;
    } else {
      this.deleteResultType = 'mixed';
      this.deleteResultMessage = `Deleted ${successCount} user(s) with ${failCount} failure(s)`;
    }

    this.deleteResultDetails = { successCount, failCount };
    // Clear selection and reload
    this.selectedUsers.clear();
    this.selectAll = false;
    this.closeDeleteConfirmModal();
    
    // Reload users after a small delay to ensure localStorage is updated
    setTimeout(() => {
      this.loadUsers();
      this.showDeleteResultModal = true;
    }, 300);
  }

  closeDeleteResultModal() {
    this.showDeleteResultModal = false;
    this.deleteResultMessage = '';
    this.deleteResultDetails = { successCount: 0, failCount: 0 };
  }

  openCreateUserModal() {
    this.showCreateUserModal = true;
    this.resetCreateUserForm();
  }

  closeCreateUserModal() {
    this.showCreateUserModal = false;
    this.resetCreateUserForm();
  }

  resetCreateUserForm() {
    this.newUserForm = {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user'
    };
    this.createUserErrors = {};
    this.createUserSuccess = false;
  }

  validateCreateUserForm(): boolean {
    this.createUserErrors = {};
    
    // Validate name
    if (!this.newUserForm.name.trim()) {
      this.createUserErrors['name'] = 'Name is required';
    }
    
    // Validate email
    if (!this.newUserForm.email.trim()) {
      this.createUserErrors['email'] = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.newUserForm.email)) {
        this.createUserErrors['email'] = 'Invalid email format';
      }
    }
    
    // Validate password
    if (!this.newUserForm.password) {
      this.createUserErrors['password'] = 'Password is required';
    } else if (this.newUserForm.password.length < 6) {
      this.createUserErrors['password'] = 'Password must be at least 6 characters';
    }
    
    return Object.keys(this.createUserErrors).length === 0;
  }

  createNewUser() {
    if (!this.validateCreateUserForm()) {
      console.error('Form validation failed:', this.createUserErrors);
      return;
    }

    console.log('Creating user with:', {
      firstName: this.newUserForm.name,
      email: this.newUserForm.email,
      password: '***'
    });

    // Call the backend API to create user
    const userData = {
      firstName: this.newUserForm.name,
      email: this.newUserForm.email,
      password: this.newUserForm.password
    };

    // Get the auth token
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.http.post<{ success: boolean; message: string; user: any }>('/api/users/admin/create', userData, { headers }).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        if (response.success) {
          this.createUserSuccess = true;
          // After 1500ms, reload users and close modal
          setTimeout(() => {
            this.loadUsers();
            this.closeCreateUserModal();
          }, 1500);
        }
      },
      error: (error) => {
        console.error('Error creating user:', error);
        console.error('Error details:', error.error);
        if (error.status === 401) {
          this.createUserErrors['general'] = 'Authentication failed. Please login again.';
        } else if (error.error?.error === 'Email already exists') {
          this.createUserErrors['email'] = 'Email already in use';
        } else {
          this.createUserErrors['general'] = error.error?.error || 'Failed to create user: ' + error.message;
        }
      }
    });
  }
}