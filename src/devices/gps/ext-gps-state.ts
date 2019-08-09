

// This interface includes any extra fields I tack on to what I get from the GPS library

import {GPSState} from 'gps';

export interface ExtGpsState extends GPSState{
    timestampEpochMS?: number;
}