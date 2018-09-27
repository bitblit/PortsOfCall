// Note: THIS FILE IS NOT CHECKED INTO GITHUB, SO PASSWORDS ARE OK HERE

import {PortsOfCall} from './ports-of-call';
import {Observable} from 'rxjs/Rx';
import {Logger} from '@bitblit/ratchet/dist/common/logger';
import {Subscription} from 'rxjs/Subscription';
import {EchoDevice} from './devices/echo/echo-device';
import {SerialDeviceType} from './model/serial-device-type';
import {GpsDevice} from './devices/gps/gps-device';
import {Obd2Device} from './devices/obd/obd2-device';

process.env['DEBUG'] = 'serialport:main node myapp.js';

Logger.setLevelByName('debug');

let timer : Observable<number> = Observable.timer(0,5000);

let poc : PortsOfCall = PortsOfCall.Instance;
poc.start();

let sub : Subscription = timer.subscribe((t)=>{
   Logger.info("Timer : %s",poc.status());

   let gps : GpsDevice = poc.firstDevice(SerialDeviceType.GPS) as GpsDevice;
   if (gps) {
       Logger.info("GPS Device reports : %j",gps.currentGpsState());
   }

    let obd2 : Obd2Device = poc.firstDevice(SerialDeviceType.OBD2) as Obd2Device;
    if (obd2) {
        Logger.info("OBD2 Device reports : %j",obd2.vehicleState());
    }

    let echo : EchoDevice = poc.firstDevice(SerialDeviceType.ECHO) as EchoDevice;
   if (echo)
   {
       Logger.info("Sending timer %d as echo",t);
       echo.sendLine('Timer '+t);
   }

});

process.stdin.on('data', function(chunk){
   Logger.info("Got stdin : "+chunk);
   sub.unsubscribe();
   poc.abort();
   Logger.info("Calling process.exit");
   process.exit(0);
    Logger.info("Called process.exit");
});

process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    // some other closing procedures go here
    sub.unsubscribe();
    poc.abort();
    process.exit(0);
});


