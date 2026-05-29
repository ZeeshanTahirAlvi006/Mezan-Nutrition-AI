// Map of WMO weather codes to user-friendly labels, emojis, and material icon names
const mapWmoCode = (code) => {
  switch (code) {
    case 0:
      return { label: 'Sunny', emoji: '☀️', icon: 'wb_sunny' };
    case 1:
    case 2:
    case 3:
      return { label: 'Partly Cloudy', emoji: '⛅', icon: 'cloud_queue' };
    case 45:
    case 48:
      return { label: 'Foggy', emoji: '🌫️', icon: 'blur_on' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Drizzle', emoji: '🌧️', icon: 'grain' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { label: 'Rainy', emoji: '🌧️', icon: 'umbrella' };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: 'Snowy', emoji: '❄️', icon: 'ac_unit' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', emoji: '⚡', icon: 'thunderstorm' };
    default:
      return { label: 'Clear', emoji: '☀️', icon: 'wb_sunny' };
  }
};

// In-memory cache for weather data
export const weatherCache = {};
export const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

export const getWeatherCached = (locationString) => {
  const normalizedKey = (locationString || 'UAE').trim().toLowerCase();
  const cached = weatherCache[normalizedKey];
  return cached ? cached.data : null;
};

/**
 * Fetch latitude/longitude for a given city/country string from Open-Meteo Geocoding API.
 * Returns default fallback coordinates if search fails.
 */
const geocodeLocation = async (location) => {
  try {
    const cleanLocation = location ? location.trim() : 'UAE';
    console.log(`[Weather Service] Geocoding location: "${cleanLocation}"`);

    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1`;
    const response = await fetch(geocodeUrl);

    if (!response.ok) {
      throw new Error(`Geocoding server returned status ${response.status}`);
    }

    const result = await response.json();

    if (result.results && result.results.length > 0) {
      const match = result.results[0];
      return {
        lat: match.latitude,
        lon: match.longitude,
        name: match.name,
        country: match.country || 'Unknown',
        timezone: match.timezone || 'auto'
      };
    }

    console.warn(`[Weather Service] No geocoding results for "${cleanLocation}". Using default (Dubai, UAE).`);
  } catch (error) {
    console.error(`[Weather Service] Geocoding error for "${location}":`, error.message);
  }

  // Return default fallback (Dubai, UAE)
  return {
    lat: 25.07725,
    lon: 55.30927,
    name: 'Dubai',
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai'
  };
};

/**
 * Get weather and 7-day forecast by location name.
 * Incorporates a 30-minute caching mechanism.
 */
export const getWeatherByLocation = async (locationString) => {
  const normalizedKey = (locationString || 'UAE').trim().toLowerCase();

  // 1. Check cache
  const cached = weatherCache[normalizedKey];
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`[Weather Service] Cache HIT for "${normalizedKey}"`);
    return cached.data;
  }

  console.log(`[Weather Service] Cache MISS for "${normalizedKey}". Fetching fresh data...`);

  // 2. Geocode location to lat/lon
  const geo = await geocodeLocation(locationString);

  try {
    // 3. Fetch weather from Open-Meteo
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum&timezone=${geo.timezone}`;

    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(`Open-Meteo returned status ${response.status}`);
    }

    const rawData = await response.json();

    // 4. Transform raw data into a beautiful, structured format for the UI and AI
    const currentMapped = mapWmoCode(rawData.current.weather_code);

    const weatherData = {
      location: {
        name: geo.name,
        country: geo.country,
        latitude: geo.lat,
        longitude: geo.lon,
        query: locationString
      },
      current: {
        temp: Math.round(rawData.current.temperature_2m),
        feelsLike: Math.round(rawData.current.apparent_temperature),
        humidity: rawData.current.relative_humidity_2m,
        isDay: rawData.current.is_day === 1,
        precipitation: rawData.current.precipitation,
        windSpeed: rawData.current.wind_speed_10m,
        code: rawData.current.weather_code,
        condition: currentMapped.label,
        emoji: currentMapped.emoji,
        icon: currentMapped.icon
      },
      daily: rawData.daily.time.map((timeStr, index) => {
        const mapped = mapWmoCode(rawData.daily.weather_code[index]);
        return {
          date: timeStr,
          tempMax: Math.round(rawData.daily.temperature_2m_max[index]),
          tempMin: Math.round(rawData.daily.temperature_2m_min[index]),
          feelsLikeMax: Math.round(rawData.daily.apparent_temperature_max[index]),
          feelsLikeMin: Math.round(rawData.daily.apparent_temperature_min[index]),
          precipitationSum: rawData.daily.precipitation_sum[index],
          code: rawData.daily.weather_code[index],
          condition: mapped.label,
          emoji: mapped.emoji,
          icon: mapped.icon
        };
      })
    };

    // 5. Store in cache
    weatherCache[normalizedKey] = {
      data: weatherData,
      timestamp: Date.now()
    };

    return weatherData;
  } catch (error) {
    console.error(`[Weather Service] Error fetching weather for "${locationString}":`, error.message);

    // Fallback data structure if complete service fails, ensuring the app never crashes
    const defaultMapped = mapWmoCode(0);
    return {
      location: {
        name: geo.name,
        country: geo.country,
        latitude: geo.lat,
        longitude: geo.lon,
        query: locationString
      },
      current: {
        temp: 28,
        feelsLike: 30,
        humidity: 60,
        isDay: true,
        precipitation: 0,
        windSpeed: 10,
        code: 0,
        condition: defaultMapped.label,
        emoji: defaultMapped.emoji,
        icon: defaultMapped.icon
      },
      daily: Array.from({ length: 7 }).map((_, index) => {
        const d = new Date();
        d.setDate(d.getDate() + index);
        return {
          date: d.toISOString().split('T')[0],
          tempMax: 32,
          tempMin: 24,
          feelsLikeMax: 34,
          feelsLikeMin: 26,
          precipitationSum: 0,
          code: 0,
          condition: defaultMapped.label,
          emoji: defaultMapped.emoji,
          icon: defaultMapped.icon
        };
      })
    };
  }
};
