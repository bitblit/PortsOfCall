//    Wraps up reading any gps data
import {Logger} from '@bitblit/ratchet/dist/common/logger';
import * as serialport from 'serialport';
import {Observable} from 'rxjs';
import {SerialDeviceState} from './serial-device-state';
import {SerialDeviceType} from './serial-device-type';

export interface SerialDevice {

    // Should return TRUE if this is that kind of device, false otherwise
    initialize(portName:string, ping:Observable<number>) : void;

    currentState() : SerialDeviceState;

    onOpen() : any;
    onData(data:any) : any;
    onClose() : any;
    onError(error:any) : any;

    cleanShutdown() : void;

    deviceType() : SerialDeviceType;

    summary() : string;
}