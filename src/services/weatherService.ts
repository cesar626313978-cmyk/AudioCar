// Service for fetching local weather via browser Geolocation, IP fallback, and Open-Meteo API

export interface LocalWeather {
  city: string;
  temperature: number;
  apparentTemperature: number;
  description: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  windSpeed: number;
  humidity: number;
  roadNotice?: string;
  fetchedAt: number;
}

// Translate WMO Weather interpretation codes (WW) into Spanish + Icon + Road alert
export function parseWeatherCode(code: number): { description: string; icon: string; roadNotice?: string } {
  if (code === 0) {
    return { description: 'Cielo despejado', icon: '☀️', roadNotice: 'Excelente visibilidad en carretera' };
  }
  if (code === 1 || code === 2) {
    return { description: 'Parcialmente nublado', icon: '⛅' };
  }
  if (code === 3) {
    return { description: 'Nuboso', icon: '☁️' };
  }
  if (code === 45 || code === 48) {
    return { description: 'Niebla / Neblina', icon: '🌫️', roadNotice: '⚠️ Niebla: Reduce velocidad y usa luces cortas' };
  }
  if (code >= 51 && code <= 55) {
    return { description: 'Llovizna leve', icon: '🌦️', roadNotice: '⚠️ Asfalto húmedo: modera la velocidad' };
  }
  if (code >= 61 && code <= 65) {
    return { description: 'Lluvia moderada', icon: '🌧️', roadNotice: '⚠️ Lluvia: Aumenta la distancia de seguridad' };
  }
  if (code >= 66 && code <= 67) {
    return { description: 'Lluvia helada', icon: '🌧️❄️', roadNotice: '🚨 Alerta: Posible placa de hielo en calzada' };
  }
  if (code >= 71 && code <= 77) {
    return { description: 'Nevada', icon: '❄️', roadNotice: '🚨 Alerta nieve: Conducción de alta precaución' };
  }
  if (code >= 80 && code <= 82) {
    return { description: 'Chubascos', icon: '🌦️', roadNotice: '⚠️ Precaución por charcos y aquaplaning' };
  }
  if (code >= 95 && code <= 99) {
    return { description: 'Tormenta eléctrica', icon: '⚡⛈️', roadNotice: '🚨 Tormenta: Extremar precaución al volante' };
  }
  return { description: 'Tiempo variable', icon: '🌤️' };
}

let cachedWeather: LocalWeather | null = null;
let isFetching = false;

async function fetchWeatherForCoords(lat: number, lon: number, cityName: string): Promise<LocalWeather | null> {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) return cachedWeather;

    const wData = await weatherRes.json();
    const current = wData.current || {};
    const daily = wData.daily || {};

    const code = current.weather_code ?? 0;
    const parsed = parseWeatherCode(code);

    const result: LocalWeather = {
      city: cityName,
      temperature: Math.round(current.temperature_2m ?? 20),
      apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 20),
      description: parsed.description,
      icon: parsed.icon,
      tempMax: Math.round(daily.temperature_2m_max?.[0] ?? current.temperature_2m ?? 24),
      tempMin: Math.round(daily.temperature_2m_min?.[0] ?? (current.temperature_2m ?? 20) - 5),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 50),
      roadNotice: parsed.roadNotice,
      fetchedAt: Date.now(),
    };

    cachedWeather = result;
    return result;
  } catch {
    return cachedWeather;
  }
}

// Automatic IP fallback so users get real weather right from the first flight
export async function fetchWeatherByIpFallback(): Promise<LocalWeather | null> {
  if (cachedWeather && Date.now() - cachedWeather.fetchedAt < 1000 * 60 * 15) {
    return cachedWeather;
  }
  try {
    const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (geoRes.ok) {
      const data = await geoRes.json();
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);
      const city = data.city || data.region || 'Tu zona';
      if (!isNaN(lat) && !isNaN(lon)) {
        return await fetchWeatherForCoords(lat, lon, city);
      }
    }
  } catch {
    // fallback
  }
  return null;
}

export async function requestAndFetchWeather(): Promise<LocalWeather | null> {
  if (cachedWeather && Date.now() - cachedWeather.fetchedAt < 1000 * 60 * 15) {
    return cachedWeather;
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return await fetchWeatherByIpFallback();
  }

  if (isFetching) return cachedWeather;
  isFetching = true;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          let cityName = 'Tu ubicación';
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'Tu ciudad';
            }
          } catch {
            // fallback
          }

          const weather = await fetchWeatherForCoords(lat, lon, cityName);
          isFetching = false;
          resolve(weather);
        } catch {
          isFetching = false;
          resolve(cachedWeather);
        }
      },
      async () => {
        // If GPS permission denied or timed out, gracefully use IP location
        const ipWeather = await fetchWeatherByIpFallback();
        isFetching = false;
        resolve(ipWeather);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

export function getCachedWeather(): LocalWeather | null {
  return cachedWeather;
}
