export = ping;
/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('peer-id')} PeerId
 */
/**
 * Ping a given peer and wait for its response, getting the operation latency.
 *
 * @param {Libp2p} node
 * @param {PeerId|Multiaddr} peer
 * @returns {Promise<number>}
 */
declare function ping(node: Libp2p, peer: PeerId | Multiaddr): Promise<number>;
declare namespace ping {
    export { mount, unmount, Libp2p, Multiaddr, PeerId };
}
type Libp2p = import("..");
type PeerId = import("peer-id");
type Multiaddr = import("multiaddr");
/**
 * Subscribe ping protocol handler.
 *
 * @param {Libp2p} node
 */
declare function mount(node: Libp2p): void;
/**
 * Unsubscribe ping protocol handler.
 *
 * @param {Libp2p} node
 */
declare function unmount(node: Libp2p): void;
//# sourceMappingURL=index.d.ts.map