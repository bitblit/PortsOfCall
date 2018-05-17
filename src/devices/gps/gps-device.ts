//    Wraps up reading any gps data
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import * as serialport from "serialport";
import {AbstractSerialDevice} from "./abstract-serial-device";
import * as GPS from 'gps';
import {PromiseRatchet} from "@bitblit/ratchet/dist/common/promise-ratchet";

export class GpsDevice extends AbstractSerialDevice{
    private gps : GPS;
    private lastUpdate : Date;

    constructor()
    {
        super();
        this.gps = new GPS();
        this.gps.on('data', (d)=>this.handleGPSData(d));
    }

    handleGPSData(data)
    {
        Logger.info("GPS--->%j %j",data, this.gps.state);
        this.lastUpdate = new Date();
    }

    deviceType(): string {
        return "GPS";
    }

    test(portName: string): Promise<boolean> {
        // Use a line parser
        // Use a `\r\n` as a line terminator
        let parser: any = new serialport['parsers'].Readline({
            delimiter: '\r\n'
        });

        this.setParser(parser);

        return super.createPortAndAwaitOpen(portName).then(opened=>{
            if (opened)
            {
                // Now wait to see if we got GPS data
                return PromiseRatchet.waitFor((t)=>{this.lastUpdate!=null},true, 1000,3,"Await GPS "+this.portName());
            }
            else
            {
                Logger.info("Port never opened, giving up");
                return false;
            }
        });

    }

    onData(data: any): any {
        super.onData(data);
        this.gps.update(data);
    }

    /*
    constructor(portName: string) {
        if (portName) {
            Logger.info("Creating GpsWrapper for %s", portName);
            this.portName = portName;
        }
        else {
            throw "Cannot create port wrapper for null/empty name";
        }
    }

    public static findGpsPort(): Promise<GpsPortWrapper> {
        Logger.info("Searching for serial ports");

        return serialport.list((err, ports) => {
            Logger.info('Found %d serial ports', ports.length);
            if (err) {
                Logger.warn("Error reading ports : %s", err.message);
                return null;
            } else {
                if (ports.length == 0) {
                    Logger.info("No serial ports found");
                    return null;
                }
                else {
                    Logger.info("Creating wrappers");
                    let allWrappers = ports.map(p => new GpsPortWrapper(p.comName));
                    Logger.info("Creating promises");
                    let allPromises = allWrappers.map(w => w.initialize());
                    return Promise.all(allPromises).then(results => {
                        Logger.info("Running filter");
                        let filtered = results.filter(r => r != null);
                        Logger.info("After filter : "+filtered);
                        if (filtered.length == 0) {
                            Logger.info("No working GPS units found");
                            return null;
                        }
                        else {
                            if (filtered.length > 1) {
                                Logger.warn("Weird : Found more than one attached GPS receiver - returning the first");
                            }
                            // TODO: Should stop/close the others?
                            return filtered[0];
                        }
                    }).catch(err => {
                        Logger.error("Error in running general port search:" + err);
                        return null;
                    });
                }
            }
        });
    }

    public static convertDMToDecimal(dm: string): number {
        let rval = null;
        if (dm != null) {
            // Format is ddmm.mmmmm
            var idx = dm.indexOf(".");
            if (idx == -1 || idx < 3) {
                throw "Value not in format of ddmm.mmmmm : " + dm;
            }

            let degrees = parseFloat(dm.substring(0, idx - 2));
            let minutes = parseFloat(dm.substring(idx - 2));

            rval = degrees + (minutes / 60);
        }
        return rval;
    }

    public getPortName(): string {
        return this.portName;
    }

    public getLastLocation(): any {
        return this.lastLocation;
    }

    public getLastSensorReading(): number {
        return this.lastSensorReading;
    }

    public getLastSensorReadingAge() : number {
        let sub : number = (this.lastSensorReading)?this.lastSensorReading:0;
        return new Date().getTime()-sub;
    }

    public cleanClosePort() : void
    {
        Logger.info("Closing port %s",this.portName);
        try {
            if (this.port)
            {
                this.port.close().then()
                this.port = null;
            }
        }
        catch (err)
        {
            Logger.warn("Error closing port %s : %s", this.portName, err);
        }
    }

    public initialize(): Promise<GpsPortWrapper> {
        try {
            Logger.info("Starting port for %s", this.portName);
            this.port = new serialport(this.portName, {
                autoOpen: true,
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                //parity: 'None'
            });

            // Use a `\r\n` as a line terminator
            let parser: any = new serialport['parsers'].Readline({
                delimiter: '\r\n'
            });
            // Open up the port and wire the callbacks
            this.port.pipe(parser);
            this.port.on('open', () => Logger.info('Port open : %s', this.portName));
            this.port.on('close', () => {
                Logger.info('Port closed : %s', this.portName);
                this.port = null;
            });
            this.port.on('error', (err) => {
                Logger.info('Port error : %s : %s', this.portName, err);
            });
            parser.on('data', (data) => {
                this.processGPSLine(data);
            });
        }
        catch (err) {
            Logger.warn("Error while opening %s : %s", this.portName, err);
            //this.cleanClosePort();
            return Promise.resolve(null);
        }

        // Then wait 2 seconds and see if we got any data inbound
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                let dataFound = (this.lastSensorReading != null);
                Logger.info("Port: %s data found : %s", this.portName, dataFound);
                if (!dataFound) {
                    //this.cleanClosePort();
                    return null;
                }
                return this;
            }.bind(this), 4000);
        }.bind(this));
    }

    processGPSLine(line: string): any {
        let rval: any = null;
        if (line && line.startsWith("$G")) {
            this.lastSensorReading = new Date().getTime();
            if (line.startsWith("$GPRMC")) {
                this.lastSensorReading = new Date().getTime(); // Either way we are getting data - dont detach
                let t: string[] = line.split(",");

                if (t.length > 6 && "A" == t[2].toUpperCase()) {
                    let lat = GpsPortWrapper.convertDMToDecimal(t[3]);//  new BigDecimal(t[3]).divide(new BigDecimal(100));
                    let lng = GpsPortWrapper.convertDMToDecimal(t[5]); //new BigDecimal(t[5]).divide(new BigDecimal(100));
                    if ("W" == t[6].toUpperCase()) {
                        lng *= -1;
                    }
                    if ("S" == t[4].toUpperCase()) {
                        lat *= -1;
                    }

                    this.lastLocation = {
                        lat: lat,
                        lng: lng,
                        timestamp: this.lastSensorReading
                    };
                    Logger.silly("Updated location to :" + JSON.stringify(this.lastLocation));
                    rval = this.lastLocation;
                }
                else {
                    Logger.debug("Not updating location - unclear signal");
                }
            }
            return rval;
        }

    }
    */
}

