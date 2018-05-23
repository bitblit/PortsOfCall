import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {AbstractSerialDevice} from "../abstract-serial-device";
import {SerialDeviceType} from "../../model/serial-device-type";
import {SerialDeviceState} from "../../model/serial-device-state";

export class EchoDevice extends AbstractSerialDevice{
    public static FLAG_TEXT : string='THIS IS A TEST';
    private last: string;
    private echoState : string = 'NEW';

    constructor()
    {
        super();

        let parser: any = new serialport['parsers'].Readline({
            delimiter: '\r\n'
        });

        this.setParser(parser);
    }

    summary() : string
    {
        if (this.currentState()==SerialDeviceState.OK)
        {
            return "Echo, last value was : "+this.last;
        }
        else
        {
            return new Date()+" : "+this.last;
        }

    }

    deviceType(): SerialDeviceType {
        return SerialDeviceType.ECHO;
    }

    deviceMatchesPort() : boolean
    {
        return this.echoState!='NEW';
    }

    deviceIsStalled() : boolean
    {
        return false;
    }

    onData(inData: string): any {
        let data : string = inData.trim();
        if (this.echoState=='NEW')
        {
            // When new, I'm only looking for one piece of text
            if (data=='Echo:'+EchoDevice.FLAG_TEXT)
            {
                Logger.info("TEST DATA RECEIVED");
                this.echoState='WAITING_FOR_INPUT';
            }
            else
            {
                Logger.debug("Ignoring data %s - may not be a echo device",data);
            }
        }
        else
        {
            Logger.info("%s:Data:%s", this.deviceType(), data);
            this.last = data;
        }
    }

    onTick(tick:number) : void
    {
        if ((tick%5)==0)
        {
            if (this.echoState=='NEW')
            {
                Logger.debug("a-Ontick : %d %s",tick,this.portName());
                this.sendLine(EchoDevice.FLAG_TEXT);
            }

        }
    }

    sendLine(data:string)
    {
        this.getPort().write(data+"\n");
    }

}

