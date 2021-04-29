export = Book;
/**
 * @typedef {import('./')} PeerStore
 */
declare class Book {
    /**
     * The Book is the skeleton for the PeerStore books.
     *
     * @class
     * @param {Object} properties
     * @param {PeerStore} properties.peerStore - PeerStore instance.
     * @param {string} properties.eventName - Name of the event to emit by the PeerStore.
     * @param {string} properties.eventProperty - Name of the property to emit by the PeerStore.
     * @param {(data: any) => any[]} [properties.eventTransformer] - Transformer function of the provided data for being emitted.
     */
    constructor({ peerStore, eventName, eventProperty, eventTransformer }: {
        peerStore: PeerStore;
        eventName: string;
        eventProperty: string;
        eventTransformer?: ((data: any) => any[]) | undefined;
    });
    _ps: import("./");
    eventName: string;
    eventProperty: string;
    eventTransformer: (data: any) => any[];
    /**
     * Map known peers to their data.
     *
     * @type {Map<string, any[]|any>}
     */
    data: Map<string, any[] | any>;
    /**
     * Set known data of a provided peer.
     *
     * @param {PeerId} peerId
     * @param {any[]|any} data
     */
    set(peerId: PeerId, data: any[] | any): void;
    /**
     * Set data into the datastructure, persistence and emit it using the provided transformers.
     *
     * @protected
     * @param {PeerId} peerId - peerId of the data to store
     * @param {any} data - data to store.
     * @param {Object} [options] - storing options.
     * @param {boolean} [options.emit = true] - emit the provided data.
     * @returns {void}
     */
    protected _setData(peerId: PeerId, data: any, { emit }?: {
        emit?: boolean | undefined;
    } | undefined): void;
    /**
     * Emit data.
     *
     * @protected
     * @param {PeerId} peerId
     * @param {any} [data]
     */
    protected _emit(peerId: PeerId, data?: any): void;
    /**
     * Get the known data of a provided peer.
     * Returns `undefined` if there is no available data for the given peer.
     *
     * @param {PeerId} peerId
     * @returns {any[]|any|undefined}
     */
    get(peerId: PeerId): any[] | any | undefined;
    /**
     * Deletes the provided peer from the book.
     *
     * @param {PeerId} peerId
     * @returns {boolean}
     */
    delete(peerId: PeerId): boolean;
}
declare namespace Book {
    export { PeerStore };
}
import PeerId = require("peer-id");
type PeerStore = import('./');
//# sourceMappingURL=book.d.ts.map