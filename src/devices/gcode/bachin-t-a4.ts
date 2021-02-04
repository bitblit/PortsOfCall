import { Logger } from '@bitblit/ratchet/dist/common/logger';
import serialport from 'serialport';
import { AbstractSerialDevice } from '../abstract-serial-device';
import { SerialDeviceType } from '../../model/serial-device-type';
import { SerialDeviceState } from '../../model/serial-device-state';
import { StringRatchet } from '@bitblit/ratchet/dist/common/string-ratchet';

export class BachinTA4 extends AbstractSerialDevice {
  private lastSent: string; // Last data sent
  private last: string; // Last data received

  constructor() {
    super();

    const parser: any = new serialport['parsers'].Readline({
      delimiter: '\r\n',
    });

    this.setParser(parser);
  }

  summary(): string {
    if (this.currentState() == SerialDeviceState.OK) {
      return 'BachinTA4, last value was : ' + this.last;
    } else {
      return new Date() + ' : ' + this.last;
    }
  }

  deviceType(): SerialDeviceType {
    return SerialDeviceType.BACHINTA4;
  }

  deviceMatchesPort(): boolean {
    Logger.info('Called deviceMatchesPort');
    return false;
    // return this.echoState!='NEW';
  }

  deviceIsStalled(): boolean {
    return false;
  }

  onData(inData: string): any {
    const data: string = StringRatchet.trimToNull(inData);
    if (!!data) {
      Logger.debug('Got data %s', data);
    }
  }

  onTick(tick: number): void {
    if (tick % 5 == 0) {
      Logger.debug('Tick  %d %s', tick, this.portName());
    }
  }

  sendLine(data: string) {
    Logger.debug('Sending %s', data);
    this.lastSent = data;
    this.getPort().write(data + '\n');
  }
}
