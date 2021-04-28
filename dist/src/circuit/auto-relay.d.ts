export = AutoRelay;
/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('../peer-store/address-book').Address} Address
 */
/**
 * @typedef {Object} AutoRelayProperties
 * @property {import('../')} libp2p
 *
 * @typedef {Object} AutoRelayOptions
 * @property {number} [maxListeners = 1] - maximum number of relays to listen.
 * @property {(error: Error, msg?: string) => {}} [onError]
 */
declare class AutoRelay {
    /**
     * Creates an instance of AutoRelay.
     *
     * @class
     * @param {AutoRelayProperties & AutoRelayOptions} props
     */
    constructor({ libp2p, maxListeners, onError }: AutoRelayProperties & AutoRelayOptions);
    _libp2p: import("../");
    _peerId: PeerId;
    _peerStore: import("../peer-store");
    _connectionManager: import("../connection-manager");
    _transportManager: import("../transport-manager");
    _addressSorter: (addresses: import("../peer-store/address-book").Address[]) => import("../peer-store/address-book").Address[];
    maxListeners: number;
    /**
     * @type {Set<string>}
     */
    _listenRelays: Set<string>;
    /**
     * Check if a peer supports the relay protocol.
     * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
     * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
     * inside the threshold.
     *
     * @param {Object} props
     * @param {PeerId} props.peerId
     * @param {string[]} props.protocols
     * @returns {Promise<void>}
     */
    _onProtocolChange({ peerId, protocols }: {
        peerId: PeerId;
        protocols: string[];
    }): Promise<void>;
    /**
     * Peer disconnects.
     *
     * @param {Connection} connection - connection to the peer
     * @returns {void}
     */
    _onPeerDisconnected(connection: Connection): void;
    /**
     * @param {Error} error
     * @param {string} [msg]
     */
    _onError: (error: Error, msg?: string | undefined) => void;
    /**
     * Attempt to listen on the given relay connection.
     *
     * @private
     * @param {Connection} connection - connection to the peer
     * @param {string} id - peer identifier string
     * @returns {Promise<void>}
     */
    private _addListenRelay;
    /**
     * Remove listen relay.
     *
     * @private
     * @param {string} id - peer identifier string.
     * @returns {void}
     */
    private _removeListenRelay;
    /**
     * Try to listen on available hop relay connections.
     * The following order will happen while we do not have enough relays.
     * 1. Check the metadata store for known relays, try to listen on the ones we are already connected.
     * 2. Dial and try to listen on the peers we know that support hop but are not connected.
     * 3. Search the network.
     *
     * @param {string[]} [peersToIgnore]
     * @returns {Promise<void>}
     */
    _listenOnAvailableHopRelays(peersToIgnore?: string[] | undefined): Promise<void>;
    /**
     * @param {PeerId} peerId
     */
    _tryToListenOnRelay(peerId: PeerId): Promise<void>;
}
declare namespace AutoRelay {
    export { Connection, Address, AutoRelayProperties, AutoRelayOptions };
}
import PeerId = require("peer-id");
type Connection = import("libp2p-interfaces/src/connection/connection");
type AutoRelayProperties = {
    libp2p: import('../');
};
type AutoRelayOptions = {
    /**
     * - maximum number of relays to listen.
     */
    maxListeners?: number | undefined;
    onError?: ((error: Error, msg?: string | undefined) => {}) | undefined;
};
type Address = import('../peer-store/address-book').Address;
//# sourceMappingURL=auto-relay.d.ts.map