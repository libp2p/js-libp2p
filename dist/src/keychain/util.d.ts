/**
 * Gets a self-signed X.509 certificate for the key.
 *
 * The output Uint8Array contains the PKCS #7 message in DER.
 *
 * TODO: move to libp2p-crypto package
 *
 * @param {KeyInfo} key - The id and name of the key
 * @param {RsaPrivateKey} privateKey - The naked key
 * @returns {Uint8Array}
 */
export function certificateForKey(key: any, privateKey: any): Uint8Array;
/**
 * Finds the first item in a collection that is matched in the
 * `asyncCompare` function.
 *
 * `asyncCompare` is an async function that must
 * resolve to either `true` or `false`.
 *
 * @param {Array} array
 * @param {function(*)} asyncCompare - An async function that returns a boolean
 */
export function findAsync(array: any[], asyncCompare: (arg0: any) => any): Promise<any>;
//# sourceMappingURL=util.d.ts.map