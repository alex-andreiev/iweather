import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { HomePage } from '../../pages/home/home';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {
  city: string;
  state: string;
  useAutoLocation: boolean = false;
  isDetectingLocation: boolean = false;
  locationStatus: string = '';
  coordinates: {
    latitude: number;
    longitude: number;
  };

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage) {
      this.loadSettings();
    }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

  saveForm() {
    if (this.useAutoLocation) {
      this.storage.set('locationMode', 'auto');
      this.saveAutoLocation();
      return;
    }

    var location = {
      city: this.city,
      state: this.state
    };

    this.storage.set('locationMode', 'manual');
    this.storage.set('location', JSON.stringify(location));
    this.storage.remove('locationCoords');
    this.navCtrl.push(HomePage);
  }

  onAutoLocationChange() {
    if (this.useAutoLocation) {
      this.locationStatus = 'Auto-detect will use your device location.';
    } else {
      this.locationStatus = '';
    }
  }

  private loadSettings() {
    this.storage.get('locationMode').then((mode) => {
      this.useAutoLocation = mode === 'auto';
      this.onAutoLocationChange();
    });

    this.storage.get('location').then((val) => {
      if (val != null) {
        var location = JSON.parse(val);
        this.city = location.city;
        this.state = location.state;
      } else {
        this.city = 'Kyiv';
        this.state = 'UA';
      }
    });
  }

  private saveAutoLocation() {
    this.isDetectingLocation = true;
    this.detectCurrentCoordinates().then((coords) => {
      this.coordinates = coords;
      this.storage.set('locationCoords', JSON.stringify(coords));
      this.isDetectingLocation = false;
      this.navCtrl.push(HomePage);
    }).catch(() => {
      this.isDetectingLocation = false;
      this.locationStatus = 'Unable to access your location. Manual location will be used until permission is granted.';
      this.navCtrl.push(HomePage);
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
