export = getPeer;
/**
 * @typedef {import('multiaddr')} Multiaddr
 */
/**
 * Converts the given `peer` to a `Peer` object.
 * If a multiaddr is received, the addressBook is updated.
 *
 * @param {PeerId|Multiaddr|string} peer
 * @returns {{ id: PeerId, multiaddrs: Multiaddr[]|undefined }}
 */
declare function getPeer(peer: PeerId | Multiaddr | string): {
    id: PeerId;
    multiaddrs: Multiaddr[] | undefined;
};
declare namespace getPeer {
    export { Multiaddr };
}
import PeerId = require("peer-id");
type Multiaddr = multiaddr;
import multiaddr = require("multiaddr");
//# sourceMappingURL=get-peer.d.ts.map