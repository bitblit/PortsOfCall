import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {AbstractSerialDevice} from "../abstract-serial-device";
import {SerialDeviceType} from "../../serial-device-type";
import {SerialDeviceState} from "../../serial-device-state";

export class Obd2Device extends AbstractSerialDevice{
    private static SPEED_CMD: string = "010D\r\n";
    private static ENGINE_RPM_CMD: string = "010C\r\n"; // pulls in 1/4 rpms
    private static FLAG_TEXT_PREFIX: string = "ELM327 v";

    private static INIT_COMMANDS: string[] =
        ["ATZ\r\n",
            "ATSP0\r\n",
            "0100\r\n"];

    private obdState : string = 'NEW';

    private pendingCommand : string;

    private trackSpeed : boolean = true;

    private speedUpdated : number = null;
    private speedInMph : number = null;

    constructor()
    {
        super();

        let parser: any = new serialport['parsers'].Readline({
            delimiter: '\r\r'
        });

        // \n is 10, \r is 13

        this.setParser(parser);
    }


    portConfig() : any
    {
        return {
            baudRate: 38400,
            dataBits: 8,
            stopBits: 1
            //parity: 'None'
        };
    }

    summary() : string
    {
        if (this.currentState()==SerialDeviceState.OK)
        {
            return "OBD, last value was : ";//+this.last;
        }
        else
        {
            return new Date()+" : ";//+this.last;
        }

    }

    deviceType(): SerialDeviceType {
        return SerialDeviceType.OBD2;
    }

    deviceMatchesPort() : boolean
    {
        return this.obdState!='NEW';
    }

    deviceIsStalled() : boolean
    {
        return false;
    }

    onData(inData: string): any {

        debugger;
        let data: string = inData.trim().replace(/[\r]+/g, '');

        if (this.obdState=='NEW')
        {
            //if (this.inBuffer.)

            // When new, I'm only looking for one piece of text
            if (data.startsWith(Obd2Device.FLAG_TEXT_PREFIX))
            {
                Logger.info("Found flag text");
                this.obdState='WAITING_FOR_INPUT';
            }
            else
            {
                Logger.debug("Ignoring data %s - may not be a obd2 device %d",data,data.charCodeAt(0));
            }
        }
        else
        {
            Logger.info("%s:Data:%s", this.deviceType(), data);
            //this.last = data;
            this.processResponse(data);
        }
    }

    onTick(tick:number) : void
    {
        if ((tick%5)==0)
        {
            if (this.obdState=='NEW')
            {
                Logger.debug("Ontick : %d %s",tick,this.portName());
                Obd2Device.INIT_COMMANDS.forEach(l=>this.getPort().write(l));
            }
        }

        if (this.obdState=='WAITING_FOR_INPUT' && (tick%2==0) && this.trackSpeed)
        {
            this.sendCommand(Obd2Device.SPEED_CMD);
        }

    }

    sendCommand(command:string) : void
    {
        if (command==null)
        {
            Logger.warn("Ignoring null command");
        }
        else
        {
            if (this.pendingCommand)
            {
                Logger.warn("Sending new command while still waiting for last results");
            }
            this.pendingCommand = command;
            this.getPort().write(command);
        }
    }

    processResponse(data:string) : void
    {
        Logger.info("Processing : %s",data);
        if (this.pendingCommand)
        {
            if (this.pendingCommand==Obd2Device.SPEED_CMD)
            {
                this.processSpeedResult(data);
            }
            else if (this.pendingCommand==Obd2Device.ENGINE_RPM_CMD)
            {
                Logger.info("TBD: Processing rpm command");
            }
            else
            {
                Logger.warn("Cannot process - unrecognized command : %s",this.pendingCommand);
            }
            this.pendingCommand = null;
        }
        else
        {
            Logger.warn("Cannot process response, no pending command set");

        }
    }

    private processSpeedResult(data: string) : void
    {
        this.speedUpdated = new Date().getTime();

        if (data=="NO DATA")
        {
            Logger.info("Ignoring - no data reported");
            this.speedInMph=0;
        }
        else if (data=="CAN ERROR")
        {
            Logger.info("Ignoring - CAN error reported");
            this.speedInMph=0;
        }
        else
        {
            Logger.debug("Speed data : %s", data);
            let kph : number = this.extractResultAsNumber(data);
            this.speedInMph = kph*0.621371;
            Logger.debug("Updated speed to %d",this.speedInMph);
        }
    }

    private extractResultAsNumber(data:string) : number
    {
        debugger;
        let rval : number = null;

        try {
            let toParse = data.substring(data.length-2);
            Logger.debug("Parsed : %s",toParse);
            rval = parseInt(toParse);
        }
        catch (err)
        {
            Logger.debug("Error extracting result : %s",err);
        }
        return rval;
    }

    public speedData() : any
    {
        return {
            speedInMph:this.speedInMph,
            updated:this.speedUpdated,
            timestamp:new Date().getTime()
        };
    }
}

