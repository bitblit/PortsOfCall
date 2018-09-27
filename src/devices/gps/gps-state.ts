import {GpsStateVisibleSat} from './gps-state-visible-sat';

export class GpsState {
    time : string; // Current time format 2018-09-27T20:47:20.000Z
    lat: number; // Latitude
    lon: number; // Longitude
    alt: number; // Altitude
    satsActive: number; // Array of active satellites
    speed: number; // Speed over ground in km/h
    track: number; // Track in degrees
    satsVisible: GpsStateVisibleSat[]; // Array of all visible satellites
}