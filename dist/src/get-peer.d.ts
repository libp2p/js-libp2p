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
declare function getPeer(peer: import("peer-id") | Multiaddr | string): {
    id: import("peer-id");
    multiaddrs: Multiaddr[] | undefined;
};
declare namespace getPeer {
    export { Multiaddr };
}
type Multiaddr = import("multiaddr");
//# sourceMappingURL=get-peer.d.ts.map