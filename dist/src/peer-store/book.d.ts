export = Book;
/**
 * @typedef {import('./')} PeerStore
 */
/**
 * @template Data, GetData, EventData
 */
declare class Book<Data, GetData, EventData> {
    /**
     * The Book is the skeleton for the PeerStore books.
     *
     * @class
     * @param {Object} properties
     * @param {PeerStore} properties.peerStore - PeerStore instance.
     * @param {string} properties.eventName - Name of the event to emit by the PeerStore.
     * @param {string} properties.eventProperty - Name of the property to emit by the PeerStore.
     * @param {(data: Data | undefined) => EventData | undefined} [properties.eventTransformer] - Transformer function of the provided data for being emitted.
     * @param {(data: Data | undefined) => GetData | undefined} [properties.getTransformer] - Transformer function of the provided data for being returned on get.
     */
    constructor({ peerStore, eventName, eventProperty, eventTransformer, getTransformer }: {
        peerStore: PeerStore;
        eventName: string;
        eventProperty: string;
        eventTransformer: ((data: Data | undefined) => EventData | undefined) | undefined;
        getTransformer: ((data: Data | undefined) => GetData | undefined) | undefined;
    });
    _ps: import(".");
    eventName: string;
    eventProperty: string;
    eventTransformer: (data: Data | undefined) => EventData | undefined;
    getTransformer: (data: Data | undefined) => GetData | undefined;
    /**
     * Map known peers to their data.
     *
     * @type {Map<string, Data>}
     */
    data: Map<string, Data>;
    /**
     * Set known data of a provided peer.
     *
     * @param {PeerId} peerId
     * @param {unknown} data
     */
    set(peerId: PeerId, data: unknown): void;
    /**
     * Set data into the datastructure, persistence and emit it using the provided transformers.
     *
     * @protected
     * @param {PeerId} peerId - peerId of the data to store
     * @param {Data} data - data to store.
     * @param {Object} [options] - storing options.
     * @param {boolean} [options.emit = true] - emit the provided data.
     * @returns {void}
     */
    protected _setData(peerId: PeerId, data: Data, { emit }?: {
        emit?: boolean | undefined;
    } | undefined): void;
    /**
     * Emit data.
     *
     * @protected
     * @param {PeerId} peerId
     * @param {Data | undefined} [data]
     */
    protected _emit(peerId: PeerId, data?: Data | undefined): void;
    /**
     * Get the known data of a provided peer.
     * Returns `undefined` if there is no available data for the given peer.
     *
     * @param {PeerId} peerId
     * @returns {GetData | undefined}
     */
    get(peerId: PeerId): GetData | undefined;
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
type PeerStore = import(".");
//# sourceMappingURL=book.d.ts.map