//    Wraps up reading any gps data
import * as serialport from "serialport";
import {Logger} from "@bitblit/ratchet/dist/common/logger";

export class Obd2PortWrapper {
    private static SPEED_CMD: string = "010D\r\n";
    private static ENGINE_RPM_CMD: string = "010C\r\n"; // pulls in 1/4 rpms

    private static INIT_COMMANDS: string[] =
        ["ATZ\r\n",
            "ATSP0\r\n",
            "0100\r\n"];

    private portName: string;
    private port: any;

    /*
    private String serialPortOverride;
    private List<SpeedEventListener> listeners;
    private Long timeBetweenPingsInMs;
    private Integer maxUSBErrorsBeforeDisconnect;

        // These are built
    @Builder.Default
    private boolean aborted = false;
    @Builder.Default
    private SerialFacade serial = null;
    @Builder.Default
    private AtomicInteger usbErrors = new AtomicInteger(0);

    // THis is a mac OSX dev setting only - dont use in production
    SerialFacade sf = SerialFacade.createHelper("/dev/tty.wchusbserial1410");


    */

    constructor(portName: string) {
        if (portName) {
            Logger.info("Creating Obd2PortWrapper for %s", portName);
            this.portName = portName;
        }
        else {
            throw "Cannot create port wrapper for null/empty name";
        }
    }


    public static findObd2Port(): Promise<Obd2PortWrapper> {
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
                    //let allWrappers = ports.map(p => new Obd2PortWrapper(p.comName));
                    let allWrappers : Obd2PortWrapper[] = [new Obd2PortWrapper('/dev/tty.usbserial')];
                    Logger.info("Creating promises");
                    let allPromises = allWrappers.map(w => w.initialize());
                    return Promise.all(allPromises).then(results => {
                        Logger.info("Running filter");
                        let filtered = results.filter(r => r != null);
                        Logger.info("After filter : " + filtered);
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


    public initialize(): Promise<Obd2PortWrapper> {
        try {
            Logger.info("Starting port for %s", this.portName);
            this.port = new serialport(this.portName, {
                autoOpen: true,
                baudRate: 38400,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
            });

            // Use a `\r\n` as a line terminator
            let parser: any = new serialport['parsers'].Readline({
                delimiter: '\r'
            });
            // Open up the port and wire the callbacks
            //this.port.pipe(parser);
            this.port.on('open', () => Logger.info('Port open : %s', this.portName));
            this.port.on('close', () => {
                Logger.info('Port closed : %s', this.portName);
                this.port = null;
            });
            this.port.on('error', (err) => {
                Logger.info('Port error : %s : %s', this.portName, err);
            });
            /*
            this.port.on('data', (data)=>{
                Logger.warn("DATA:"+data);
            })
            */

            /*
            parser.on('data', (data) => {
                this.processObdLine(data);
            });
            */

            // Write the open command to the port
            return new Promise((resolve, reject) => {
                Logger.info("Writing 1");
                this.port.write(Obd2PortWrapper.INIT_COMMANDS.join(""), 'ascii', ()=>{
                    Logger.info("Write complete");
                    this.port.drain(()=> {
                        Logger.info("Drain complete");
                        let data = this.port.read();
                        Logger.info("Got:"+data);
                        //this.port.read()
                        resolve(data);
                    });
                });
            });

        }
        catch (err) {
            Logger.warn("Error while opening %s : %s", this.portName, err);
            //this.cleanClosePort();
            return Promise.resolve(null);
        }

    }

    processObdLine(line: string): any {
        Logger.info("OBD Line : " + line);
    }




}

