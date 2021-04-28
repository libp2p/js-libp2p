export = CMS;
/**
 * Cryptographic Message Syntax (aka PKCS #7)
 *
 * CMS describes an encapsulation syntax for data protection. It
 * is used to digitally sign, digest, authenticate, or encrypt
 * arbitrary message content.
 *
 * See RFC 5652 for all the details.
 */
declare class CMS {
    /**
     * Creates a new instance with a keychain
     *
     * @param {import('./index')} keychain - the available keys
     * @param {string} dek
     */
    constructor(keychain: import('./index'), dek: string);
    keychain: import("./index");
    /**
     * Creates some protected data.
     *
     * The output Uint8Array contains the PKCS #7 message in DER.
     *
     * @param {string} name - The local key name.
     * @param {Uint8Array} plain - The data to encrypt.
     * @returns {Promise<Uint8Array>}
     */
    encrypt(name: string, plain: Uint8Array): Promise<Uint8Array>;
    /**
     * Reads some protected data.
     *
     * The keychain must contain one of the keys used to encrypt the data.  If none of the keys
     * exists, an Error is returned with the property 'missingKeys'.  It is array of key ids.
     *
     * @param {Uint8Array} cmsData - The CMS encrypted data to decrypt.
     * @returns {Promise<Uint8Array>}
     */
    decrypt(cmsData: Uint8Array): Promise<Uint8Array>;
}
//# sourceMappingURL=cms.d.ts.map