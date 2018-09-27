// Note: THIS FILE IS NOT CHECKED INTO GITHUB, SO PASSWORDS ARE OK HERE

import {PortsOfCall} from "./ports-of-call";
import {Observable} from "rxjs/Rx";
import {Logger} from "@bitblit/ratchet/dist/common/logger";
import {Subscription} from "rxjs/Subscription";
import {EchoDevice} from "./devices/echo/echo-device";
import {SerialDeviceType} from "./model/serial-device-type";

process.env['DEBUG'] = 'serialport:main node myapp.js';

Logger.setLevelByName('debug');

let timer : Observable<number> = Observable.timer(0,5000);

let poc : PortsOfCall = PortsOfCall.Instance;
poc.start();

let sub : Subscription = timer.subscribe((t)=>{
   Logger.info("Timer : %s",poc.status);

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


