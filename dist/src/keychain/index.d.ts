export = Keychain;
/**
 * Information about a key.
 *
 * @typedef {Object} KeyInfo
 *
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
     * @returns {object}
     */
    static generateOptions(): object;
    /**
     * Gets an object that can encrypt/decrypt protected data.
     * The default options for a keychain.
     *
     * @returns {object}
     */
    static get options(): any;
    /**
     * Creates a new instance of a key chain.
     *
     * @param {DS} store - where the key are.
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
    get cms(): CMS;
    /**
     * Create a new key.
     *
     * @param {string} name - The local key name; cannot already exist.
     * @param {string} type - One of the key types; 'rsa'.
     * @param {int} [size] - The key size in bits. Used for rsa keys only.
     * @returns {KeyInfo}
     */
    createKey(name: string, type: string, size?: any): KeyInfo;
    /**
     * List all the keys.
     *
     * @returns {KeyInfo[]}
     */
    listKeys(): KeyInfo[];
    /**
     * Find a key by it's id.
     *
     * @param {string} id - The universally unique key identifier.
     * @returns {KeyInfo}
     */
    findKeyById(id: string): KeyInfo;
    /**
     * Find a key by it's name.
     *
     * @param {string} name - The local key name.
     * @returns {KeyInfo}
     */
    findKeyByName(name: string): KeyInfo;
    /**
     * Remove an existing key.
     *
     * @param {string} name - The local key name; must already exist.
     * @returns {KeyInfo}
     */
    removeKey(name: string): KeyInfo;
    /**
     * Rename a key
     *
     * @param {string} oldName - The old local key name; must already exist.
     * @param {string} newName - The new local key name; must not already exist.
     * @returns {KeyInfo}
     */
    renameKey(oldName: string, newName: string): KeyInfo;
    /**
     * Export an existing key as a PEM encrypted PKCS #8 string
     *
     * @param {string} name - The local key name; must already exist.
     * @param {string} password - The password
     * @returns {string}
     */
    exportKey(name: string, password: string): string;
    /**
     * Import a new key from a PEM encoded PKCS #8 string
     *
     * @param {string} name - The local key name; must not already exist.
     * @param {string} pem - The PEM encoded PKCS #8 string
     * @param {string} password - The password.
     * @returns {KeyInfo}
     */
    importKey(name: string, pem: string, password: string): KeyInfo;
    importPeer(name: any, peer: any): Promise<void | {
        name: any;
        id: any;
    }>;
    /**
     * Gets the private key as PEM encoded PKCS #8 string.
     *
     * @param {string} name
     * @returns {string}
     * @private
     */
    private _getPrivateKey;
}
declare namespace Keychain {
    export { KeyInfo };
}
import CMS = require("./cms");
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
//# sourceMappingURL=index.d.ts.map