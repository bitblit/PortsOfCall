export class GpsState {
    time : number; // Current time
    lat: number; // Latitude
    lon: number; // Longitude
    alt: number; // Altitude
    satsActive: number; // Array of active satellites
    speed: number; // Speed over ground in km/h
    track: number; // Track in degrees
    satsVisible: number; // Array of all visible satellites
}