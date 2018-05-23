//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import {Observable} from "rxjs";
import * as serialport from "serialport";
import {SerialDevice} from "./model/serial-device";
import {GpsDevice} from "./devices/gps/gps-device";
import {Obd2Device} from "./devices/obd/obd2-device";
import {Subscription} from "rxjs/Subscription";
import {SerialDeviceState} from "./model/serial-device-state";
import {SerialDeviceType} from "./model/serial-device-type";
import {EchoDevice} from "./devices/echo/echo-device";

export class PortsOfCall {
    private static _instance: PortsOfCall;
    private static DEFAULT_CHECKUP_RATE: number = 1000 * 15;
    private static DEFAULT_PING_RATE: number = 500;
    private checkupTimer: Observable<number>;
    private checkupSubscription : Subscription;

    private pingTimer: Observable<number>;
    private pingSubscription : Subscription;

    private lastCheckup : Date;

    private portsInUse : any = {};

    private constructor() {
        Logger.info("Created PortsOfCall - starting timer");

        this.checkupTimer = Observable.timer(0, PortsOfCall.DEFAULT_CHECKUP_RATE);
        this.checkupSubscription = this.checkupTimer.subscribe(t => {
            this.recheckPorts(t)
        });

        this.pingTimer = Observable.timer(0, PortsOfCall.DEFAULT_PING_RATE);
        this.pingSubscription = this.pingTimer.subscribe(t => {
            // For the moment do nothing
        });
    }

    public static get Instance(): PortsOfCall {
        if (!this._instance) {
            this._instance = new PortsOfCall();
        }
        return this._instance;
    }

    public abort() : void
    {
        Logger.info("Aborting ports of call");
        this.checkupSubscription.unsubscribe();
        this.pingSubscription.unsubscribe();

        Logger.info("Shutting down all ports");
        Object.keys(this.portsInUse).forEach(k=>{
            this.portsInUse[k].cleanShutdown();
        });
    }

    public get status() : string
    {
        let activeDevices : SerialDevice[] = this.devices();

        let rval : string = new Date()+" : "+this.devices.length+" ports "+activeDevices.length+" ready devices";

        activeDevices.forEach(d=>{
            rval+='\n\n'+d.summary();
        });
        return rval;
    }

    private recheckPorts(tick:number) : void
    {
        this.lastCheckup = new Date();

        Logger.info("Searching for serial ports");

        this.listSerialPorts().then(ports=>{
            Logger.info('Found %d serial ports', ports.length);
                if (ports.length == 0) {
                    Logger.info("No serial ports found");
                    return null;
                }
                else {
                    Logger.info("Checking %d ports", ports.length);

                    ports.forEach(p => {
                        let current: SerialDevice = this.portsInUse[p];

                        if (!current || this.deadState(current.currentState())) {
                            Logger.debug("Replacing device on %s (was %s)", p, current);
                            let testDevice = this.createDeviceInstanceToTest(current);
                            testDevice.initialize(p, this.pingTimer);
                            this.portsInUse[p] = testDevice;
                        }
                    });
                }
        }).catch(err=>{
            Logger.warn("Outer err : %s",err);
        });
    }

    private deadState(state:SerialDeviceState) : boolean
    {
        return state==SerialDeviceState.STALLED ||
            state==SerialDeviceState.ERROR ||
            state==SerialDeviceState.FAIL;
    }

    private waitState(state:SerialDeviceState) : boolean
    {
        return state==SerialDeviceState.NEW ||
            state==SerialDeviceState.OPENING ||
            state==SerialDeviceState.TESTING;
    }

    private createDeviceInstanceToTest(prevDevice:SerialDevice = null) : SerialDevice
    {
        let devices = [new Obd2Device(), new GpsDevice()];//,new EchoDevice()];
        let rval : SerialDevice = null;

        if (prevDevice==null)
        {
            rval = devices[0];
        }
        else
        {
            for (let i=0;i<devices.length && !rval;i++)
            {
                if (devices[i].deviceType()==prevDevice.deviceType())
                {
                    rval = devices[(i+1)%devices.length];
                }
            }
            if (!rval)
            {
                Logger.warn("Should not happen - search did not find anything");
                rval = devices[0];
            }
        }

        return rval;
    }

    private listSerialPorts() : Promise<string[]>
    {
        return new Promise<any>((resolve, reject) => {
            serialport.list((err, ports) => {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    let names : string[] = ports.map(p=>p.comName);
                    resolve(names);
                }
            });
        });
    }

    public devices(typeFilter: SerialDeviceType = null) : SerialDevice[]
    {
        let rval : SerialDevice[] = [];
        Object.keys(this.portsInUse).forEach(key=>{
            let value : SerialDevice = this.portsInUse[key];
            if (value && value.currentState()==SerialDeviceState.OK)
            {
                if (typeFilter==null || typeFilter==value.deviceType())
                {
                    rval.push(value);
                }
            }
        });
        return rval;
    }

    public firstDevice(typeFilter: SerialDeviceType) : SerialDevice
    {
        if (typeFilter==null)
        {
            throw "You must set a type filter";
        }
        let devices : SerialDevice[] = this.devices(typeFilter);

        return (devices.length==0)?null:devices[0];
    }

}