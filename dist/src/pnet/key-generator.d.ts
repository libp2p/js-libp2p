export = generate;
/**
 * Generates a PSK that can be used in a libp2p-pnet private network
 *
 * @param {Uint8Array} bytes - An object to write the psk into
 * @returns {void}
 */
declare function generate(bytes: Uint8Array): void;
declare namespace generate {
    export { NONCE_LENGTH, KEY_LENGTH };
}
declare var NONCE_LENGTH: number;
declare const KEY_LENGTH: 32;
//# sourceMappingURL=key-generator.d.ts.map