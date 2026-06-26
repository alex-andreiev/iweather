import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';

@Injectable()
export class WeatherProvider {
  private readonly geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly forecastUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(public http: HttpClient) {
    console.log('Hello WeatherProvider Provider');
  }

  getWeather(city: string, state: string, days: number, coordinates?: { latitude: number; longitude: number }): Observable<any> {
    if (coordinates && coordinates.latitude != null && coordinates.longitude != null) {
      return this.http.get(this.buildForecastUrl(coordinates.latitude, coordinates.longitude, days)).map((response: any) => {
        return this.normalizeWeather(response, {
          name: 'Current location',
          country: ''
        }, city, state, days);
      }).catch((error: any) => {
        return Observable.of(this.createFallbackWeather(city, state, days, error, 'Current location'));
      });
    }

    return this.resolveLocation(city, state).switchMap((location: any) => {
      if (!location) {
        return Observable.of(this.createFallbackWeather(city, state, days));
      }

      return this.http.get(this.buildForecastUrl(location.latitude, location.longitude, days)).map((response: any) => {
        return this.normalizeWeather(response, location, city, state, days);
      });
    }).catch((error: any) => {
      return Observable.of(this.createFallbackWeather(city, state, days, error));
    });
  }

  private resolveLocation(city: string, state: string): Observable<any> {
    var query = encodeURIComponent(city || '');
    var url = this.geocodingUrl + '?name=' + query + '&count=1&language=en&format=json';

    if (state && state.length === 2) {
      url += '&countryCode=' + encodeURIComponent(state.toUpperCase());
    }

    return this.http.get(url).map((response: any) => {
      if (!response || !response.results || !response.results.length) {
        return null;
      }

      return response.results[0];
    });
  }

  private buildForecastUrl(latitude: number, longitude: number, days: number): string {
    var forecastDays = days || 1;
    return this.forecastUrl + '?latitude=' + latitude + '&longitude=' + longitude + '&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=' + forecastDays + '&temperature_unit=celsius&windspeed_unit=kmh';
  }

  private normalizeWeather(response: any, location: any, city: string, state: string, days: number) {
    var currentWeather = response && response.current_weather ? response.current_weather : {};
    var currentWeatherCode = this.pickNumber(currentWeather, ['weathercode', 'weather_code'], 0);
    var currentMeta = this.weatherMetaForCode(currentWeatherCode);
    var currentTemp = this.pickValue(currentWeather, ['temperature', 'temperature_2m'], 'N/A');
    var daily = response && response.daily ? response.daily : {};
    var forecast = this.buildForecastDays(daily, days);

    return {
      display_location: {
        full: this.buildLocationLabel(location, city, state)
      },
      current: {
        icon: currentMeta.icon,
        description: currentMeta.label,
        temp_c: currentTemp,
        temperature_string: currentTemp + '°C',
        humidity: this.pickValue(currentWeather, ['relativehumidity_2m', 'relative_humidity_2m'], 'N/A'),
        apparent_temperature: this.pickValue(currentWeather, ['apparent_temperature'], 'N/A'),
        windspeed: this.pickValue(currentWeather, ['windspeed', 'wind_speed_10m'], 'N/A'),
        winddirection: this.pickValue(currentWeather, ['winddirection', 'wind_direction_10m'], 'N/A')
      },
      forecast: forecast,
      mode_days: days
    };
  }

  private buildForecastDays(daily: any, days: number): any[] {
    var times = daily && daily.time ? daily.time : [];
    var maxTemps = daily && daily.temperature_2m_max ? daily.temperature_2m_max : [];
    var minTemps = daily && daily.temperature_2m_min ? daily.temperature_2m_min : [];
    var codes = daily && daily.weathercode ? daily.weathercode : [];
    var precip = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max : [];
    var limit = days || times.length;
    var forecast = [];

    for (var i = 0; i < times.length && i < limit; i++) {
      var code = this.pickNumber(codes, [i], 0);
      var meta = this.weatherMetaForCode(code);
      var maxTemp = this.pickValue(maxTemps, [i], 'N/A');
      var minTemp = this.pickValue(minTemps, [i], 'N/A');

      forecast.push({
        date: times[i],
        icon: meta.icon,
        description: meta.label,
        max_temp_c: maxTemp,
        min_temp_c: minTemp,
        precipitation_probability_max: this.pickValue(precip, [i], 'N/A')
      });
    }

    return forecast;
  }

  private buildLocationLabel(location: any, city: string, state: string): string {
    var parts = [];

    if (location && location.name) {
      parts.push(location.name);
    } else if (city) {
      parts.push(city);
    }

    if (location && location.admin1) {
      parts.push(location.admin1);
    } else if (state) {
      parts.push(state.toUpperCase());
    }

    if (location && location.country && parts.indexOf(location.country) === -1) {
      parts.push(location.country);
    }

    if (!parts.length) {
      return 'Current location';
    }

    return parts.join(', ');
  }

  private pickNumber(source: any, keys: any[], fallback: number): number {
    if (Array.isArray(source)) {
      var index = keys[0];
      var valueFromArray = source[index];
      return typeof valueFromArray === 'number' ? valueFromArray : parseInt(valueFromArray, 10) || fallback;
    }

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (source && source[key] !== undefined && source[key] !== null) {
        return typeof source[key] === 'number' ? source[key] : parseInt(source[key], 10) || fallback;
      }
    }

    return fallback;
  }

  private pickValue(source: any, keys: any[], fallback: any): any {
    if (Array.isArray(source)) {
      var index = keys[0];
      return source[index] !== undefined && source[index] !== null ? source[index] : fallback;
    }

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (source && source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }

    return fallback;
  }

  private weatherMetaForCode(code: number) {
    if (code === 0) {
      return { label: 'Clear sky', icon: '☀' };
    }

    if (code === 1 || code === 2 || code === 3) {
      return { label: 'Partly cloudy', icon: '⛅' };
    }

    if (code === 45 || code === 48) {
      return { label: 'Fog', icon: '🌫' };
    }

    if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
      return { label: 'Drizzle', icon: '🌦' };
    }

    if (code === 61 || code === 63 || code === 65 || code === 80 || code === 81 || code === 82) {
      return { label: 'Rain', icon: '🌧' };
    }

    if (code === 66 || code === 67) {
      return { label: 'Freezing rain', icon: '🧊' };
    }

    if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
      return { label: 'Snow', icon: '❄' };
    }

    if (code === 95 || code === 96 || code === 99) {
      return { label: 'Thunderstorm', icon: '⛈' };
    }

    return { label: 'Weather', icon: '●' };
  }

  private createFallbackWeather(city: string, state: string, days: number, error?: any, label?: string) {
    return {
      display_location: {
        full: label || (city + (state ? ', ' + state.toUpperCase() : ''))
      },
      current: {
        icon: '–',
        description: 'Unavailable',
        temp_c: 'N/A',
        temperature_string: 'N/A',
        humidity: 'N/A',
        apparent_temperature: 'N/A',
        windspeed: 'N/A',
        winddirection: 'N/A'
      },
      forecast: [],
      mode_days: days,
      error: error
    };
  }
}
