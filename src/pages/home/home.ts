import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { WeatherProvider } from '../../providers/weather/weather';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  weather: any;
  location: {
    city: string;
    state: string;
  };
  locationMode: string = 'manual';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  mode: string = 'now';
  isLoading: boolean = false;

  constructor(
    public navCtrl: NavController,
    private weatherProvider: WeatherProvider,
    private storage: Storage
  ) {}

  ionViewWillEnter() {
    this.loadWeather();
  }

  onModeChange() {
    this.loadWeather();
  }

  getForecastDays(): number {
    if (this.mode === '3days') {
      return 3;
    }

    if (this.mode === 'week') {
      return 7;
    }

    return 1;
  }

  getForecastLabel(): string {
    if (this.mode === '3days') {
      return '3-day forecast';
    }

    if (this.mode === 'week') {
      return '7-day forecast';
    }

    return 'Current conditions';
  }

  loadWeather() {
    this.isLoading = true;

    this.storage.get('locationMode').then((mode) => {
      this.locationMode = mode || 'manual';

      if (this.locationMode === 'auto') {
        this.loadAutoLocation().then(() => {
          this.fetchWeather();
        }).catch(() => {
          this.loadManualLocation().then(() => {
            this.fetchWeather();
          });
        });
        return;
      }

      this.loadManualLocation().then(() => {
        this.fetchWeather();
      });
    });
  }

  private loadManualLocation(): Promise<void> {
    return this.storage.get('location').then((val) => {
      if (val != null) {
        this.location = JSON.parse(val);
      } else {
        this.location = {
          city: 'Kyiv',
          state: 'UA'
        };
      }
    });
  }

  private loadAutoLocation(): Promise<void> {
    return this.storage.get('locationCoords').then((val) => {
      if (val != null) {
        this.coordinates = JSON.parse(val);
        return;
      }

      return this.detectCurrentCoordinates().then((coords) => {
        this.coordinates = coords;
        return this.storage.set('locationCoords', JSON.stringify(coords));
      });
    });
  }

  private fetchWeather() {
    var days = this.getForecastDays();

    if (this.locationMode === 'auto' && this.coordinates) {
      this.weatherProvider.getWeather('', '', days, this.coordinates).subscribe((weather) => {
        this.weather = weather;
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
      });
      return;
    }

    this.weatherProvider.getWeather(this.location.city, this.location.state, days).subscribe((weather) => {
      this.weather = weather;
      this.isLoading = false;
    }, () => {
      this.isLoading = false;
    });
  }

  private detectCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition((position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, (error) => {
        reject(error);
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      });
    });
  }
}
