import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-expiration-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-expiration-modal.component.html',
  styleUrls: ['./session-expiration-modal.component.css']
})
export class SessionExpirationModalComponent implements OnInit, OnDestroy {
  @Output() loginClicked = new EventEmitter<void>();
  @Input() isOpen: boolean = false;

  countdownSeconds: number = 10;
  private countdownInterval: any;

  ngOnInit() {
    if (this.isOpen) {
      this.startCountdown();
    }
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  onLoginClick() {
    this.stopCountdown();
    this.loginClicked.emit();
  }

  private startCountdown() {
    this.countdownSeconds = 10;
    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        this.onLoginClick();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
