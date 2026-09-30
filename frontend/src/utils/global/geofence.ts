export interface Point {
    lat: number;
    lng: number;
}

/**
 * Checks if a point is inside a polygon using the Ray Casting algorithm.
 */
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat,
            yi = polygon[i].lng;
        const xj = polygon[j].lat,
            yj = polygon[j].lng;

        const intersect =
            yi > point.lng !== yj > point.lng &&
            point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

/**
 * Parses the polygon string from environment variables.
 * Format: "lat,lng;lat,lng;||lat,lng;lat,lng;"
 */
export const parseGeoFencePolygons = (polygonStr: string): Point[][] => {
    if (!polygonStr) return [];

    return polygonStr
        .split("||")
        .map((poly) => {
            return poly
                .split(";")
                .filter((p) => p.trim() !== "")
                .map((p) => {
                    const [lat, lng] = p.split(",").map(Number);
                    return { lat, lng };
                });
        })
        .filter((poly) => poly.length > 0);
};

/**
 * Checks if the user's current position is within any of the defined geo-fences.
 */
export const checkGeoFence = (
    userLat: number,
    userLng: number,
    geoFenceStr: string
): boolean => {
    const polygons = parseGeoFencePolygons(geoFenceStr);
    const userPoint = { lat: userLat, lng: userLng };

    return polygons.some((polygon) => isPointInPolygon(userPoint, polygon));
};
