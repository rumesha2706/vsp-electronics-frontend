import { Injectable } from '@angular/core';

export interface DailyStats {
  date: string;
  activeUsers: number;
  transactions: number;
  pageViews: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: 'order' | 'quote' | 'cart';
  amount?: number;
  items: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly ANALYTICS_KEY = 'drone_shop_analytics';
  private readonly TRANSACTIONS_KEY = 'drone_shop_transactions';
  private readonly DAILY_USERS_KEY = 'drone_shop_daily_users';

  constructor() {
    this.initializeAnalytics();
  }

  private initializeAnalytics() {
    if (!localStorage.getItem(this.ANALYTICS_KEY)) {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.TRANSACTIONS_KEY)) {
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify([]));
    }
    this.trackPageView();
  }

  // Track daily active user
  trackActiveUser(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const dailyUsersJson = localStorage.getItem(this.DAILY_USERS_KEY);
    const dailyUsers = dailyUsersJson ? JSON.parse(dailyUsersJson) : {};

    if (!dailyUsers[today]) {
      dailyUsers[today] = [];
    }

    if (!dailyUsers[today].includes(userId)) {
      dailyUsers[today].push(userId);
      localStorage.setItem(this.DAILY_USERS_KEY, JSON.stringify(dailyUsers));
    }
  }

  // Track page view
  trackPageView() {
    const analytics = this.getAnalytics();
    const today = new Date().toISOString().split('T')[0];
    
    const todayStats = analytics.find(stat => stat.date === today);
    if (todayStats) {
      todayStats.pageViews++;
    } else {
      analytics.push({
        date: today,
        activeUsers: 0,
        transactions: 0,
        pageViews: 1
      });
    }

    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
  }

  // Track transaction
  trackTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>) {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    transactions.push(newTransaction);
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));

    // Update daily stats
    const analytics = this.getAnalytics();
    const today = new Date().toISOString().split('T')[0];
    const todayStats = analytics.find(stat => stat.date === today);
    
    if (todayStats) {
      todayStats.transactions++;
    } else {
      analytics.push({
        date: today,
        activeUsers: 0,
        transactions: 1,
        pageViews: 0
      });
    }

    localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
  }

  // Get analytics data
  getAnalytics(): DailyStats[] {
    const analyticsJson = localStorage.getItem(this.ANALYTICS_KEY);
    return analyticsJson ? JSON.parse(analyticsJson) : [];
  }

  // Get all transactions
  getTransactions(): Transaction[] {
    const transactionsJson = localStorage.getItem(this.TRANSACTIONS_KEY);
    return transactionsJson ? JSON.parse(transactionsJson) : [];
  }

  // Get daily active users count
  getDailyActiveUsers(date?: string): number {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dailyUsersJson = localStorage.getItem(this.DAILY_USERS_KEY);
    const dailyUsers = dailyUsersJson ? JSON.parse(dailyUsersJson) : {};
    
    return dailyUsers[targetDate]?.length || 0;
  }

  // Get total transactions count
  getTotalTransactions(): number {
    return this.getTransactions().length;
  }

  // Get today's transactions
  getTodayTransactions(): Transaction[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getTransactions().filter(t => 
      t.timestamp.startsWith(today)
    );
  }

  // Get transactions by date range
  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    return this.getTransactions().filter(t => {
      const transDate = t.timestamp.split('T')[0];
      return transDate >= startDate && transDate <= endDate;
    });
  }

  // Get analytics summary
  getAnalyticsSummary() {
    const today = new Date().toISOString().split('T')[0];
    const analytics = this.getAnalytics();
    const transactions = this.getTransactions();
    const dailyUsers = this.getDailyActiveUsers();

    return {
      todayActiveUsers: dailyUsers,
      todayTransactions: this.getTodayTransactions().length,
      totalTransactions: transactions.length,
      totalPageViews: analytics.reduce((sum, stat) => sum + stat.pageViews, 0),
      last7DaysUsers: this.getLast7DaysUsers(),
      last7DaysTransactions: this.getLast7DaysTransactions()
    };
  }

  // Get last 7 days users
  private getLast7DaysUsers(): number {
    const dailyUsersJson = localStorage.getItem(this.DAILY_USERS_KEY);
    const dailyUsers = dailyUsersJson ? JSON.parse(dailyUsersJson) : {};
    const last7Days = this.getLast7Days();
    
    const uniqueUsers = new Set<string>();
    last7Days.forEach(date => {
      if (dailyUsers[date]) {
        dailyUsers[date].forEach((userId: string) => uniqueUsers.add(userId));
      }
    });

    return uniqueUsers.size;
  }

  // Get last 7 days transactions
  private getLast7DaysTransactions(): number {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return this.getTransactionsByDateRange(
      sevenDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    ).length;
  }

  // Helper to get last 7 days
  private getLast7Days(): string[] {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }
}
