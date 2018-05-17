//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import {Observable} from "rxjs";
import * as serialport from "serialport";
import {SerialDevice} from "./serial-device";
import {GpsDevice} from "./devices/gps/gps-device";
import {Subscription} from "rxjs/Subscription";

export class PortsOfCall {
    private static _instance: PortsOfCall;
    private static ONE_MINUTE: number = 1000 * 60;
    private checkupTimer: Observable<number>;
    private checkupSubscription : Subscription;
    private lastCheckup : Date;

    private portsInUse : any = {};

    private constructor() {
        Logger.info("Created PortsOfCall - starting timer");

        this.checkupTimer = Observable.timer(0, PortsOfCall.ONE_MINUTE);
        this.checkupSubscription = this.checkupTimer.subscribe(t => {this.recheckPorts(t).catch(err=>{Logger.error("Error testing ports : %s",err)})});
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
    }

    public get status() : string
    {
        return "Current time : "+new Date()+" Checkup : "+this.lastCheckup;
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

    private recheckPorts(tick:number) : Promise<any>
    {
        this.lastCheckup = new Date();

        Logger.info("Searching for serial ports");

        return this.listSerialPorts().then(ports=>{
            Logger.info('Found %d serial ports', ports.length);
                if (ports.length == 0) {
                    Logger.info("No serial ports found");
                    return null;
                }
                else {
                    Logger.info("Creating wrappers");
                    let promiseArr : Promise<SerialDevice>[] = ports.map(p=>{
                        let current : SerialDevice = this.portsInUse[p];
                        if (current!=null)
                        {
                            Logger.info("Skipping %s, already open", p);
                            return Promise.resolve(current);
                        }
                        else
                        {
                            return this.testDevices(p)
                        }
                    });
                    return Promise.all(promiseArr).catch(err2=>{Logger.warn("Err2:"+err2)});
                }

        }).catch(err=>{
            Logger.warn("Outer err : %s",err);
        });
    }

    private testDevices(portName:string, idx:number=0) : Promise<SerialDevice>
    {
        let device : SerialDevice = null;
        switch (idx)
        {
            case 0 : device = new GpsDevice();break;
            default : Logger.info("No more devices to test, quitting search"); return Promise.resolve(null);
        }

        return device.test(portName).then(result=>{
            if (result)
            {
                Logger.info("Found device %s on %s, returning", device.deviceType(), portName);
                return device;
            }
            else
            {
                Logger.info("%s is not a %s, closing and moving on",portName, device.deviceType());
                device.cleanClose();
                return this.testDevices(portName, idx+1);
            }
        })
    }

}