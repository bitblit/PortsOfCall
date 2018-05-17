//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {SerialDevice} from "../../serial-device";
import {PromiseRatchet} from "@bitblit/ratchet/dist/common/promise-ratchet";

export class AbstractSerialDevice implements SerialDevice{
    private port: any;
    private lastError: any;

    private parser: any;

    cleanClose() : void {
        if (this.port.portIsOpen)
        {
            try {
                this.port.close();
            }
            catch (err)
            {
                Logger.warn("Error closing port %s : %s",this.portName,err);
            }
        }
        else
        {
            Logger.info("Skipping close on %s - port is not open", this.portName());
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

    deviceType(): string {
        return 'AbstractDevice';
    }

    portName(): string {
        return this.port.path;
    }

    createPortAndAwaitOpen(portName:string): Promise<boolean>
    {
        this.port = new serialport(portName, {
            autoOpen: false,
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            //parity: 'None'
        });

        this.port.on('open', ()=>this.onOpen());
        this.port.on('close', ()=>this.onClose());
        this.port.on('error', (err)=>this.onError(err));

        if (this.parser)
        {
            Logger.info("Using parser : %s",this.parser);
            // Open up the port and wire the callbacks
            this.port.pipe(this.parser);
            this.parser.on('data', (data) => this.onData(data));
        }
        else
        {
            Logger.info("Using raw data");
            this.port.on('data',(data)=>this.onData(data));
        }

        this.port.open();

        let test : (n)=>any = (t)=>this.portOpenedCorrectly();
        Logger.info("Type : %s",typeof test);

        return PromiseRatchet.waitFor(test, true, 500, 5, "Opening "+this.portName());
    }

    test(portName:string) : Promise<boolean>
    {
        return this.defaultTest(portName);
    }

    defaultTest(portName: string): Promise<boolean> {
        return this.createPortAndAwaitOpen(portName).then(isOpen=>{
            if (isOpen)
            {
                Logger.info("Opened port correctly");
            }
            else
            {
                Logger.info("Port never opened");
            }
            return false;
        }).catch(err=>{
            Logger.warn("Error while waiting for open, rejecting : %s",err);
            return false;
        })
    }

    onOpen(): any {
        Logger.info("%s:Open:%s", this.deviceType(),this.portName());
    }

    onData(data: any): any {
        Logger.info("%s:Data:%s", this.deviceType(), data);
    }

    onClose(): any {
        Logger.info("%s:Close", this.deviceType());
    }

    onError(error: any): any {
        this.lastError = error;
        if (this && this.portName)
        {
            Logger.info("%s:Error:%s:%s",this.deviceType(),this.portName(),error);
        }
        else
        {
            Logger.info("Abstract ERROR, no THIS? : "+error);
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

    portOpenedCorrectly() : boolean
    {
        if (!this || !this.port)
        {
            Logger.warn("No THIS found");
            return false;
        }
        else if (this.lastError!=null)
        {
            Logger.warn("Error found while opening - aborting");
            return null;
        }
        else
        {
            return this.port && this.port.portIsOpen;
        }
    }

    /*
    private waitForOpen(count:number = 0) : Promise<boolean>
    {
        if (!this.port)
        {
            Logger.info("NO PORT!");
            return Promise.resolve(false);
        }
        else if (this.port && this.port.portIsOpen)
        {
            Logger.info("Port open - stopping wait");
            return Promise.resolve(true);
        }
        else if (count>5) // TODO: Maxcount
        {
            Logger.info("Port still not open, giving up");
            return Promise.resolve(false);
        }
        else if (this.lastError!=null)
        {
            Logger.info("Recieved error while waiting for open, giving up on : %s",this.portName(),this.lastError);
            return Promise.resolve(false);
        }
        else
        {
            Logger.info("Port not open - waiting (count = "+count+" port="+this.portName()+")");
            return PromiseRatchet.createTimeoutPromise("PortOpenWait",1000,true).then(ignored=>{
                return this.waitForOpen(count+1);
            })
        }
    }
    */

}

