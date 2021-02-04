// Note: THIS FILE IS NOT CHECKED INTO GITHUB, SO PASSWORDS ARE OK HERE

import { PortsOfCall } from './ports-of-call';
import { Observable, Subscription, timer } from 'rxjs';
import { Logger } from '@bitblit/ratchet/dist/common/logger';
import { EchoDevice } from './devices/echo/echo-device';
import { SerialDeviceType } from './model/serial-device-type';
import { GpsDevice } from './devices/gps/gps-device';
import { Obd2Device } from './devices/obd/obd2-device';
import { BachinTA4 } from './devices/gcode/bachin-t-a4';

process.env['DEBUG'] = 'serialport:main node myapp.js';

Logger.setLevelByName('debug');

const runTimer: Observable<number> = timer(0, 5000);

const poc: PortsOfCall = PortsOfCall.Instance;
poc.start();

const sub: Subscription = runTimer.subscribe((t) => {
  Logger.info('Timer : %s', poc.status());

  const gps: GpsDevice = poc.firstDevice(SerialDeviceType.GPS) as GpsDevice;
  if (gps) {
    Logger.info('GPS Device reports : %j', gps.currentGpsState());
  }

  const obd2: Obd2Device = poc.firstDevice(SerialDeviceType.OBD2) as Obd2Device;
  if (obd2) {
    Logger.info('OBD2 Device reports : %j', obd2.vehicleState());
  }

  const echo: EchoDevice = poc.firstDevice(SerialDeviceType.ECHO) as EchoDevice;
  if (echo) {
    Logger.info('Sending timer %d as echo', t);
    echo.sendLine('Timer ' + t);
  }

  const bachin: BachinTA4 = poc.firstDevice(SerialDeviceType.BACHINTA4) as BachinTA4;
  if (echo) {
    Logger.info('Sending timer %d as echo', t);
    echo.sendLine('Timer ' + t);
  }
});

process.stdin.on('data', function (chunk) {
  Logger.info('Got stdin : ' + chunk);
  sub.unsubscribe();
  poc.abort();
  Logger.info('Calling process.exit');
  process.exit(0);
  Logger.info('Called process.exit');
});

process.on('SIGINT', function () {
  console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
  // some other closing procedures go here
  sub.unsubscribe();
  poc.abort();
  process.exit(0);
});
