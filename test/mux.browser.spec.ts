import {Multiaddr} from '@multiformats/multiaddr';
import {createLibp2p} from 'libp2p';
import {WebRTCTransport} from '../src/mux/transport';
import {pipe} from 'it-pipe';
import first from 'it-first';
import {fromString as uint8arrayFromString} from 'uint8arrays/from-string';
import {expect} from 'chai';
import {Noise} from '@chainsafe/libp2p-noise';

describe('upgradable stream', () => {
  it('can connect to a server', async () => {
    const tpt = new WebRTCTransport();
    const node = await createLibp2p({
      transports: [tpt],
      connectionEncryption: [new Noise()],
    });
    await node.start()
    const ma = new Multiaddr("/ip4/192.168.1.7/udp/54058/webrtc/certhash/uEiBF0HpQyF_taZxljnd0xbdpj6sj-W0mdCO9W_FoW6qRgA/p2p/12D3KooWGoTM9BggdQU6juuPBp8HMVQNTow2TgaF4ftbKTXzbjmy")
    const stream = await node.dialProtocol(ma, ['/echo/1.0.0'])
    let data = 'dataToBeEchoedBackToMe\n';
    let response = await pipe([uint8arrayFromString(data)], stream, async (source) => await first(source));
    expect(response?.subarray()).to.equalBytes(uint8arrayFromString(data));
  })
});

export {}
