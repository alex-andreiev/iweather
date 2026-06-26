# iweather

Legacy Ionic weather app.

## Install

```bash
npm install
```

## Run

```bash
npm run ionic:serve
```

## Build

```bash
npm run build
```

## Notes

- This project uses the Ionic 3 / Angular 5 stack it was originally built on.
- `src/providers/weather/weather.ts` already uses `HttpClient`, so the old `@angular/http` package is no longer listed.
- The app is intentionally pinned to a compatible dependency set so `npm install` can resolve cleanly.
