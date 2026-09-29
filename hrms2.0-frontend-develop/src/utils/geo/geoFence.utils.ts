/**
 * Point-in-polygon algorithm using ray casting
 * Checks if a point (lat, lng) is inside a polygon defined by coordinates
 * 
 * @param point - The point to check { lat: number, lng: number }
 * @param polygon - Array of polygon vertices as [lat, lng] pairs
 * @returns true if point is inside the polygon, false otherwise
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) {
    return false; // Need at least 3 points to form a polygon
  }

  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // Polygon array contains [lat, lng] pairs
    // lat corresponds to Y (vertical), lng corresponds to X (horizontal)
    const [lat_i, lng_i] = polygon[i];
    const [lat_j, lng_j] = polygon[j];

    // Ray casting algorithm: check if horizontal ray from point intersects edge
    // Check if the ray crosses the edge between points i and j
    const intersect =
      lat_i > lat !== lat_j > lat &&
      lng < ((lng_j - lng_i) * (lat - lat_i)) / (lat_j - lat_i) + lng_i;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Parse polygon coordinates from environment variable or string
 * Expected format: "lat1,lng1;lat2,lng2;lat3,lng3;..."
 * 
 * @param coordsString - String of coordinates separated by semicolons
 * @returns Array of [lat, lng] tuples or null if invalid
 */
export function parsePolygonCoordinates(
  coordsString: string | undefined
): [number, number][] | null {
  if (!coordsString || !coordsString.trim()) {
    return null;
  }

  try {
    const points = coordsString
      .split(";")
      .map((point) => point.trim())
      .filter((point) => point.length > 0) // Filter out empty strings
      .map((point) => {
        const parts = point.split(",").map((p) => p.trim());
        if (parts.length !== 2) {
          throw new Error(`Invalid coordinate format: ${point}. Expected "lat,lng"`);
        }
        
        const lat = Number(parts[0]);
        const lng = Number(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error(`Invalid coordinate values: ${point}. Both values must be numbers`);
        }
        
        return [lat, lng] as [number, number];
      });

    if (points.length < 3) {
      console.warn("Polygon needs at least 3 points. Found:", points.length);
      return null;
    }

    return points;
  } catch (error) {
    console.error("Error parsing polygon coordinates:", error);
    return null;
  }
}

/**
 * Parse multiple polygon coordinates from environment variable or string
 * Expected format: "lat1,lng1;lat2,lng2;lat3,lng3;...||lat1,lng1;lat2,lng2;lat3,lng3;..."
 * Polygons are separated by "||" (double pipe)
 * 
 * @param coordsString - String of coordinates with polygons separated by "||"
 * @returns Array of polygon arrays, or null if invalid/empty
 */
export function parseMultiplePolygonCoordinates(
  coordsString: string | undefined
): [number, number][][] | null {
  if (!coordsString || !coordsString.trim()) {
    return null;
  }

  try {
    // Split by "||" to get individual polygons
    const polygonStrings = coordsString.split("||").map((s) => s.trim()).filter((s) => s.length > 0);
    
    if (polygonStrings.length === 0) {
      return null;
    }

    const polygons: [number, number][][] = [];
    
    for (const polygonString of polygonStrings) {
      const polygon = parsePolygonCoordinates(polygonString);
      if (polygon) {
        polygons.push(polygon);
      }
    }

    if (polygons.length === 0) {
      return null;
    }

    return polygons;
  } catch (error) {
    console.error("Error parsing multiple polygon coordinates:", error);
    return null;
  }
}

/**
 * Check if a point is inside any of the provided polygons
 * 
 * @param point - The point to check { lat: number, lng: number }
 * @param polygons - Array of polygon arrays
 * @returns true if point is inside any polygon, false otherwise
 */
export function isPointInAnyPolygon(
  point: { lat: number; lng: number },
  polygons: [number, number][][] | null
): boolean {
  if (!polygons || polygons.length === 0) {
    return false;
  }

  // Check if point is in any of the polygons
  for (const polygon of polygons) {
    if (isPointInPolygon(point, polygon)) {
      return true;
    }
  }

  return false;
}

/**
 * Get user's current location using Geolocation API
 * 
 * @param options - Geolocation options (timeout, enableHighAccuracy, etc.)
 * @returns Promise with user's location or null if error/denied
 */
export function getUserLocation(
  options: PositionOptions = {
    timeout: 10000,
    enableHighAccuracy: true,
    maximumAge: 0,
  }
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting user location:", error);
        resolve(null);
      },
      options
    );
  });
}

