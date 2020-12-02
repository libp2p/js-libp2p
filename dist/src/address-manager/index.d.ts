export = AddressManager;
/**
 * @typedef {import('multiaddr')} Multiaddr
 */
/**
 * @typedef {Object} AddressManagerOptions
 * @property {string[]} [listen = []] - list of multiaddrs string representation to listen.
 * @property {string[]} [announce = []] - list of multiaddrs string representation to announce.
 */
declare class AddressManager {
    /**
     * Responsible for managing the peer addresses.
     * Peers can specify their listen and announce addresses.
     * The listen addresses will be used by the libp2p transports to listen for new connections,
     * while the announce addresses will be used for the peer addresses' to other peers in the network.
     *
     * @class
     * @param {AddressManagerOptions} [options]
     */
    constructor({ listen, announce }?: AddressManagerOptions | undefined);
    listen: Set<string>;
    announce: Set<string>;
    /**
     * Get peer listen multiaddrs.
     *
     * @returns {Multiaddr[]}
     */
    getListenAddrs(): Multiaddr[];
    /**
     * Get peer announcing multiaddrs.
     *
     * @returns {Multiaddr[]}
     */
    getAnnounceAddrs(): Multiaddr[];
}
declare namespace AddressManager {
    export { Multiaddr, AddressManagerOptions };
}
type Multiaddr = import("multiaddr");
type AddressManagerOptions = {
    /**
     * - list of multiaddrs string representation to listen.
     */
    listen?: string[] | undefined;
    /**
     * - list of multiaddrs string representation to announce.
     */
    announce?: string[] | undefined;
};
//# sourceMappingURL=index.d.ts.map