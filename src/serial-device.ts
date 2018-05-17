//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";

export interface SerialDevice {

    // Should return TRUE if this is that kind of device, false otherwise
    test(portName:string) : Promise<boolean>;

    onOpen() : any;
    onData(data:any) : any;
    onClose() : any;
    onError(error:any) : any;

    cleanClose() : void;

    deviceType() : string;
}