
import {GpsState} from './gps-state';

// This interface includes any extra fields I tack on to what I get from the GPS library
export interface ExtGpsState extends GpsState{
    timestampEpochMS: number;
}