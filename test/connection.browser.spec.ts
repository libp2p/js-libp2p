/* eslint-env mocha */

import {createConnectionPair, echoHandler} from "./util";
import { expect } from 'aegir/chai';
import { pipe } from 'it-pipe';
import all from 'it-all';
import first from 'it-first';
import {fromString} from 'uint8arrays/from-string';
import {v4} from 'uuid';

const echoProtocol = "/echo/1.0.0"

describe('connection browser tests', () => {
  it('can run the echo protocol (first)', async () => {
    let [{ connection: client }, server] = await createConnectionPair();
    let serverRegistrar = server.registrar;
    await serverRegistrar.handle(echoProtocol, echoHandler, { maxInboundStreams: 10, maxOutboundStreams: 10 })
    let clientStream = await client.newStream([echoProtocol]);
    let data = fromString(v4());
    let response = await pipe(
      [data],
      clientStream,
      async (source) => await first(source),
    );

    expect(response).to.not.be.undefined;
    expect(response!.subarray()).to.equalBytes(data);
  });

  it('can run the echo protocol (all)', async () => {
    let [{ connection: client }, server] = await createConnectionPair();
    let serverRegistrar = server.registrar;
    await serverRegistrar.handle(echoProtocol, echoHandler, { maxInboundStreams: 10, maxOutboundStreams: 10 })
    let clientStream = await client.newStream([echoProtocol]);
    // close stream after 2 seconds
    setTimeout(() => clientStream.close(), 2000);
    let data = fromString(v4());
    let response = await pipe(
      [data],
      clientStream,
      async (source) => await all(source),
    );

    expect(response).to.not.be.undefined;
    expect(response![0].subarray()).to.equalBytes(data);
  });
});

export {};
