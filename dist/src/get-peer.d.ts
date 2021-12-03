export = getPeer;
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
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
//# sourceMappingURL=get-peer.d.ts.map