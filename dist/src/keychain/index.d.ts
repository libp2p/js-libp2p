export = Keychain;
/**
 * Information about a key.
 *
 * @typedef {Object} KeyInfo
 * @property {string} id - The universally unique key id.
 * @property {string} name - The local key name.
 */
/**
 * Manages the lifecycle of a key. Keys are encrypted at rest using PKCS #8.
 *
 * A key in the store has two entries
 * - '/info/*key-name*', contains the KeyInfo for the key
 * - '/pkcs8/*key-name*', contains the PKCS #8 for the key
 *
 */
declare class Keychain {
    /**
     * Generates the options for a keychain.  A random salt is produced.
     *
     * @returns {Object}
     */
    static generateOptions(): any;
    /**
     * Gets an object that can encrypt/decrypt protected data.
     * The default options for a keychain.
     *
     * @returns {Object}
     */
    static get options(): any;
    /**
     * Creates a new instance of a key chain.
     *
     * @param {Datastore} store - where the key are.
     * @param {object} options
     * @class
     */
    constructor(store: any, options: object);
    store: any;
    opts: any;
    /**
     * Gets an object that can encrypt/decrypt protected data
     * using the Cryptographic Message Syntax (CMS).
     *
     * CMS describes an encapsulation syntax for data protection. It
     * is used to digitally sign, digest, authenticate, or encrypt
     * arbitrary message content.
     *
     * @returns {CMS}
     */
    get cms(): import("./cms");
    /**
     * Create a new key.
     *
     * @param {string} name - The local key name; cannot already exist.
     * @param {string} type - One of the key types; 'rsa'.
     * @param {number} [size = 2048] - The key size in bits. Used for rsa keys only.
     * @returns {Promise<KeyInfo>}
     */
    createKey(name: string, type: string, size?: number | undefined): Promise<KeyInfo>;
    /**
     * List all the keys.
     *
     * @returns {Promise<KeyInfo[]>}
     */
    listKeys(): Promise<KeyInfo[]>;
    /**
     * Find a key by it's id.
     *
     * @param {string} id - The universally unique key identifier.
     * @returns {Promise<KeyInfo|undefined>}
     */
    findKeyById(id: string): Promise<KeyInfo | undefined>;
    /**
     * Find a key by it's name.
     *
     * @param {string} name - The local key name.
     * @returns {Promise<KeyInfo>}
     */
    findKeyByName(name: string): Promise<KeyInfo>;
    /**
     * Remove an existing key.
     *
     * @param {string} name - The local key name; must already exist.
     * @returns {Promise<KeyInfo>}
     */
    removeKey(name: string): Promise<KeyInfo>;
    /**
     * Rename a key
     *
     * @param {string} oldName - The old local key name; must already exist.
     * @param {string} newName - The new local key name; must not already exist.
     * @returns {Promise<KeyInfo>}
     */
    renameKey(oldName: string, newName: string): Promise<KeyInfo>;
    /**
     * Export an existing key as a PEM encrypted PKCS #8 string
     *
     * @param {string} name - The local key name; must already exist.
     * @param {string} password - The password
     * @returns {Promise<string>}
     */
    exportKey(name: string, password: string): Promise<string>;
    /**
     * Import a new key from a PEM encoded PKCS #8 string
     *
     * @param {string} name - The local key name; must not already exist.
     * @param {string} pem - The PEM encoded PKCS #8 string
     * @param {string} password - The password.
     * @returns {Promise<KeyInfo>}
     */
    importKey(name: string, pem: string, password: string): Promise<KeyInfo>;
    /**
     * Import a peer key
     *
     * @param {string} name - The local key name; must not already exist.
     * @param {PeerId} peer - The PEM encoded PKCS #8 string
     * @returns {Promise<KeyInfo>}
     */
    importPeer(name: string, peer: PeerId): Promise<KeyInfo>;
    /**
     * Gets the private key as PEM encoded PKCS #8 string.
     *
     * @param {string} name
     * @returns {Promise<string>}
     */
    _getPrivateKey(name: string): Promise<string>;
}
declare namespace Keychain {
    export { PeerId, Key, KeyInfo };
}
/**
 * Information about a key.
 */
type KeyInfo = {
    /**
     * - The universally unique key id.
     */
    id: string;
    /**
     * - The local key name.
     */
    name: string;
};
type PeerId = import("peer-id");
type Key = any;
//# sourceMappingURL=index.d.ts.map