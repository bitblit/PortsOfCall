//    Wraps up reading any gps data
import { Observable } from 'rxjs';
import serialport from 'serialport';
import { SerialDevice } from './model/serial-device';
import { GpsDevice } from './devices/gps/gps-device';
import { Obd2Device } from './devices/obd/obd2-device';
import { Subscription, timer } from 'rxjs';
import { SerialDeviceState } from './model/serial-device-state';
import { SerialDeviceType } from './model/serial-device-type';
import { Logger } from '@bitblit/ratchet/dist/common/logger';
import { LogSnapshot } from '@bitblit/ratchet/dist/common/log-snapshot';
import SerialPort = require('serialport');

export class PortsOfCall {
  private static _instance: PortsOfCall;
  private static DEFAULT_CHECKUP_RATE: number = 1000 * 15;
  private static DEFAULT_PING_RATE: number = 500;
  private checkupTimer: Observable<number>;
  private checkupSubscription: Subscription;

  private pingTimer: Observable<number>;
  private pingSubscription: Subscription;

  private lastCheckup: Date;
  private paused: boolean = true;

  private portsInUse: any = {};
  private latestPortList: string[] = null;

  private constructor() {
    Logger.info('Created PortsOfCall');

    this.checkupTimer = timer(0, PortsOfCall.DEFAULT_CHECKUP_RATE);
    this.checkupSubscription = this.checkupTimer.subscribe((t) => {
      if (!this.paused) {
        this.recheckPorts(t);
      }
    });

    this.pingTimer = timer(0, PortsOfCall.DEFAULT_PING_RATE);
    this.pingSubscription = this.pingTimer.subscribe((t) => {
      // For the moment do nothing
    });
  }

  public static get Instance(): PortsOfCall {
    if (!this._instance) {
      this._instance = new PortsOfCall();
    }
    return this._instance;
  }

  public logSnapshot(): LogSnapshot {
    return Logger.takeSnapshot();
  }

  public setLogLevel(newLevel: string): void {
    Logger.setLevelByName(newLevel);
  }

  public start(): PortsOfCall {
    Logger.info('Starting Ports-Of-Call ping');
    this.paused = false;
    return this;
  }

  public pause(): PortsOfCall {
    Logger.info('Pausing Ports-Of-Call ping');
    this.paused = true;
    return this;
  }

  public abort(): void {
    Logger.info('Aborting ports of call');
    this.checkupSubscription.unsubscribe();
    this.pingSubscription.unsubscribe();

    Logger.info('Shutting down all ports');
    Object.keys(this.portsInUse).forEach((k) => {
      this.portsInUse[k].cleanShutdown();
    });
  }

  public status(includeSummary: boolean = false): string {
    const activeDevices: SerialDevice[] = this.devices();
    const portCount: number = this.latestPortList ? this.latestPortList.length : -1;

    let rval: string = new Date().toLocaleTimeString();
    rval += this.paused ? ' PAUSED' : ' RUNNING';
    rval += ' Bound ' + activeDevices.length + ' of ' + portCount + ' ports';

    if (activeDevices.length > 0) {
      rval += ' : Devices : ';
      activeDevices.forEach((d) => {
        rval += includeSummary ? '\n\n' + d.summary() : ' ' + d.deviceType();
      });
    }

    return rval;
  }

  private recheckPorts(tick: number): void {
    this.lastCheckup = new Date();

    Logger.info('Searching for serial ports');

    this.listSerialPorts()
      .then((ports) => {
        Logger.info('Found %d serial ports', ports.length);
        if (ports.length == 0) {
          Logger.info('No serial ports found');
          return null;
        } else {
          const portsToCheck: any[] = ports.filter((p) => {
            const current: SerialDevice = this.portsInUse[p];
            return !current || this.deadState(current.currentState());
          });

          Logger.info('Checking %d ports', portsToCheck.length);

          portsToCheck.forEach((p) => {
            const current: SerialDevice = this.portsInUse[p];
            Logger.debug('Replacing device on %s (was %s)', p, current);
            const testDevice = this.createDeviceInstanceToTest(current);
            testDevice.initialize(p, this.pingTimer);
            this.portsInUse[p] = testDevice;
          });
        }
      })
      .catch((err) => {
        Logger.warn('Outer err : %s', err);
      });
  }

  private deadState(state: SerialDeviceState): boolean {
    return state == SerialDeviceState.STALLED || state == SerialDeviceState.ERROR || state == SerialDeviceState.FAIL;
  }

  private waitState(state: SerialDeviceState): boolean {
    return state == SerialDeviceState.NEW || state == SerialDeviceState.OPENING || state == SerialDeviceState.TESTING;
  }

  private createDeviceInstanceToTest(prevDevice: SerialDevice = null): SerialDevice {
    const devices = [new Obd2Device(), new GpsDevice()]; //,new EchoDevice()];
    let rval: SerialDevice = null;

    if (prevDevice == null) {
      rval = devices[0];
    } else {
      for (let i = 0; i < devices.length && !rval; i++) {
        if (devices[i].deviceType() == prevDevice.deviceType()) {
          rval = devices[(i + 1) % devices.length];
        }
      }
      if (!rval) {
        Logger.warn('Should not happen - search did not find anything');
        rval = devices[0];
      }
    }

    return rval;
  }

  private async listSerialPorts(): Promise<string[]> {
    const portInfo: SerialPort.PortInfo[] = await serialport.list();
    const paths: string[] = portInfo.map((pi) => pi.path);
    return paths;
  }

  public devices(typeFilter: SerialDeviceType = null): SerialDevice[] {
    const rval: SerialDevice[] = [];
    Object.keys(this.portsInUse).forEach((key) => {
      const value: SerialDevice = this.portsInUse[key];
      if (value && value.currentState() == SerialDeviceState.OK) {
        if (typeFilter == null || typeFilter == value.deviceType()) {
          rval.push(value);
        }
      }
    });
    return rval;
  }

  public firstDevice(typeFilter: SerialDeviceType): SerialDevice {
    if (typeFilter == null) {
      throw 'You must set a type filter';
    }
    const devices: SerialDevice[] = this.devices(typeFilter);

    return devices.length == 0 ? null : devices[0];
  }
}
