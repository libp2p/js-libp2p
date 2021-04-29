export = AddressManager;
/**
 * @typedef {Object} AddressManagerOptions
 * @property {string[]} [listen = []] - list of multiaddrs string representation to listen.
 * @property {string[]} [announce = []] - list of multiaddrs string representation to announce.
 */
/**
 * @fires AddressManager#change:addresses Emitted when a addresses change.
 */
declare class AddressManager extends EventEmitter {
    /**
     * Responsible for managing the peer addresses.
     * Peers can specify their listen and announce addresses.
     * The listen addresses will be used by the libp2p transports to listen for new connections,
     * while the announce addresses will be used for the peer addresses' to other peers in the network.
     *
     * @class
     * @param {PeerId} peerId - The Peer ID of the node
     * @param {object} [options]
     * @param {Array<string>} [options.listen = []] - list of multiaddrs string representation to listen.
     * @param {Array<string>} [options.announce = []] - list of multiaddrs string representation to announce.
     */
    constructor(peerId: PeerId, { listen, announce }?: {
        listen?: string[] | undefined;
        announce?: string[] | undefined;
    } | undefined);
    peerId: PeerId;
    listen: Set<string>;
    announce: Set<string>;
    observed: Set<any>;
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
    /**
     * Get observed multiaddrs.
     *
     * @returns {Array<Multiaddr>}
     */
    getObservedAddrs(): Array<Multiaddr>;
    /**
     * Add peer observed addresses
     *
     * @param {string | Multiaddr} addr
     */
    addObservedAddr(addr: string | Multiaddr): void;
}
declare namespace AddressManager {
    export { AddressManagerOptions };
}
import { EventEmitter } from "events";
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
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