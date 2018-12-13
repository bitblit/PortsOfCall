//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {SerialDevice} from "../model/serial-device";
import {Observable, Subscription} from "rxjs";
import {SerialDeviceState} from "../model/serial-device-state";
import {SerialDeviceType} from "../model/serial-device-type";

export class AbstractSerialDevice implements SerialDevice{
    private port: any;
    private timeStarted: number;
    private testingStarted: number;
    private okStarted: number;
    private pingSubscription : Subscription;
    private lastError: any;
    private myState:SerialDeviceState = SerialDeviceState.NEW;

    private parser: any;

    summary() : string
    {
        return new Date()+" : "+this.currentState()+" : AbstractSerialDevice";
    }

    currentState() : SerialDeviceState
    {
        return this.myState;
    }

    cleanShutdown() : void {
        Logger.debug("Performing clean shutdown of port %s",this.portName());
        //debugger;
        try {
            this.port.close();
        }
        catch (err)
        {
            Logger.warn("Error closing port %s : %s",this.portName,err);
        }
        if (this.pingSubscription)
        {
            this.pingSubscription.unsubscribe();
        }
    }

    setParser(newParser: any) : void
    {
        this.parser = newParser;
    }

    getParser() : any
    {
        return this.parser;
    }

    deviceType(): SerialDeviceType {
        return null; // Override in subclass
    }

    portName(): string {
        return this.port.path;
    }

    updateState(tick:number) : void {
        Logger.silly("Updating state, cur: %s, tick: %d",this.myState, tick);
        this.onTick(tick);
        let now : number = new Date().getTime();
        switch (this.myState)
        {
            case SerialDeviceState.NEW : this.myState = SerialDeviceState.OPENING;break;
            case SerialDeviceState.OPENING :
                if (this.port && this.port.portIsOpen)
                {
                    this.__startTesting();
                }
                else if (now-this.timeStarted>5000)
                {
                    Logger.debug("Gave up waiting for %s",this.portName());
                    this.myState = SerialDeviceState.FAIL;
                    this.cleanShutdown();
                }
                else
                {
                    Logger.silly("Still waiting for open");
                }
                break;
            case SerialDeviceState.TESTING :
                if (this.deviceMatchesPort())
                {
                    Logger.info("Acquired device of type "+this.deviceType()+" on port "+this.portName());
                    this.okStarted = new Date().getTime();
                    this.myState = SerialDeviceState.OK;
                }
                else if (now-this.testingStarted>5000)
                {
                    Logger.debug("Gave up waiting on test for %s",this.portName());
                    this.myState = SerialDeviceState.FAIL;
                    this.cleanShutdown();
                }
                else
                {
                    Logger.silly("Still waiting on test");
                }
                break;
            case SerialDeviceState.FAIL: break; // this is an end state
            case SerialDeviceState.ERROR: break; // this is an end state
            case SerialDeviceState.STALLED: break; // this is an end state
            case SerialDeviceState.OK:
                if (this.deviceIsStalled())
                {
                    Logger.warn("Device %s is stalled - closing up", this.portName());
                    this.cleanShutdown();
                    this.myState = SerialDeviceState.STALLED;
                }
                break;
            default : Logger.warn("Unrecognized state : %s",this.myState);
        }
    }

    onTick(tick:number) : void
    {
        // Override me in subclass if you need to do something interesting
    }


    deviceMatchesPort() : boolean
    {
        return false; // override me in the subclass
    }

    deviceIsStalled() : boolean
    {
        return false; // override me in the subclass
    }

    portConfig() : any
    {
        return {
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1
            //parity: 'None'
        };
    }

    initialize(portName:string, ping:Observable<number>): void
    {
        this.port = new serialport(portName, this.portConfig());

        this.port.on('open', ()=>this.onOpen());
        this.port.on('close', ()=>this.onClose());
        this.port.on('error', (err)=>this.onError(err));

        if (this.parser)
        {
            Logger.debug("Using parser : %j",this.parser);
            // Open up the port and wire the callbacks
            this.port.pipe(this.parser);
            this.parser.on('data', (data) => this.onData(data));
        }
        else
        {
            Logger.info("Using raw data");
            this.port.on('data',(data)=>this.onData(data));
        }

        this.timeStarted = new Date().getTime();
        this.pingSubscription = ping.subscribe((t)=>this.updateState(t));
        this.myState = SerialDeviceState.OPENING;
    }

    private __startTesting()
    {
        Logger.debug("Port opened : %s, starting testing",this.portName());
        this.testingStarted = new Date().getTime();
        this.myState = SerialDeviceState.TESTING;
    }

    onOpen(): any {
        Logger.info("%s:Open:%s", this.deviceType(),this.portName());
        if (this.myState==SerialDeviceState.OPENING)
        {
            this.__startTesting();
        }
    }

    onData(data: any): any {
        Logger.silly("%s:Data:%s", this.deviceType(), data);
    }

    onClose(): any {
        Logger.info("%s:Close:%s", this.deviceType(), this.portName());
    }

    onError(error: any): any {
        this.lastError = error;
        Logger.info("%s:Error:%s:%s",this.deviceType(),this.portName(),error);

        if (this.myState==SerialDeviceState.OPENING)
        {
            Logger.debug("Error while opening : %s : giving up",this.portName());
            this.myState = SerialDeviceState.FAIL;
            this.cleanShutdown();
        }
    }

    clearLastError() : void
    {
        this.lastError = null;
    }

    getLastError() : any
    {
        return this.lastError;
    }

    getPort() : any
    {
        return this.port;
    }


}

