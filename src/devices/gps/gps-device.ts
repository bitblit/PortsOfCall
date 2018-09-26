//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {AbstractSerialDevice} from "../abstract-serial-device";
import * as GPS from 'gps';
import {SerialDeviceType} from "../../model/serial-device-type";
import {SerialDeviceState} from "../../model/serial-device-state";
import {GpsState} from "./gps-state";

export class GpsDevice extends AbstractSerialDevice{
    private gps : GPS;
    private lastUpdate : Date;
    private timeError: number;

    constructor()
    {
        super();
        this.gps = new GPS();
        this.gps.on('data', (d)=>this.handleGPSData(d));

        let parser: any = new serialport['parsers'].Readline({
            delimiter: '\r\n'
        });

        this.setParser(parser);
    }

    summary() : string
    {
        if (this.currentState()==SerialDeviceState.OK)
        {
            return "GPS TE:"+this.timeError+"ms Location : "+JSON.stringify(this.currentGpsState());
        }
        else
        {
            return new Date()+" : "+this.currentState()+" : GPS";
        }

    }

    handleGPSData(data)
    {
        Logger.silly("Received GPS data>%j %j",data, this.gps.state);
        this.lastUpdate = new Date();
        this.timeError = (this.gps.state.time)?this.lastUpdate.getTime()-this.gps.state.time.getTime():null;
    }

    deviceType(): SerialDeviceType {
        return SerialDeviceType.GPS;
    }

    deviceMatchesPort() : boolean
    {
        return this.lastUpdate !=null;
    }

    deviceIsStalled() : boolean
    {
        let now = new Date().getTime();
        return (this.lastUpdate)?(now-this.lastUpdate.getTime())>30000:false;
    }

    onData(data: any): any {
        super.onData(data);
        this.gps.update(data);
    }

    currentGpsState() : GpsState
    {
        return (this.currentState()==SerialDeviceState.OK)?this.gps.state as GpsState:null;
    }

}

