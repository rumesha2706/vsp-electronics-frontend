import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DroneImage {
  id: number;
  src: string;
  alt: string;
}

@Component({
  selector: 'app-drone-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drone-carousel.component.html',
  styleUrls: ['./drone-carousel.component.css']
})
export class DroneCarouselComponent implements OnInit, OnDestroy {
  droneImages: DroneImage[] = [
    { id: 1, src: 'assets/images/drones/Agri.png', alt: 'Drone Agriculture Photography' },
    { id: 2, src: 'assets/images/drones/Building.png', alt: 'Drone Building Photography' },
    { id: 3, src: 'assets/images/drones/forest.jpg', alt: 'Drone Forest Photography' },
    { id: 4, src: 'assets/images/drones/Golconda.png', alt: 'Golconda Drone Photography' },
    { id: 5, src: 'assets/images/drones/HussianSagar.png', alt: 'Hussian Sagar Drone Photography' },
    { id: 6, src: 'assets/images/drones/Sea Bridge.png', alt: 'Sea Bridge Drone Photography' }
  ];

  currentIndex = 0;
  autoScrollInterval: any;

  ngOnInit() {
    this.startAutoScroll();
  }

  ngOnDestroy() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      this.nextSlide();
    }, 4000); // Change image every 4 seconds
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.droneImages.length;
  }

  prevSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.droneImages.length) % this.droneImages.length;
  }

  goToSlide(index: number) {
    this.currentIndex = index;
  }
}
