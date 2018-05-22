import { expect } from 'chai';
import {PortsOfCall} from "../src/ports-of-call";

describe('#portsOfCall', function() {
    it('should return an instance from the Instance function', function() {
        let result = PortsOfCall.Instance;
        result.abort();
        expect(result).to.not.be.null;
    });
});