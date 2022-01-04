import $protobuf from 'protobufjs'

/** KeyType enum. */
export enum KeyType {
  RSA = 0,
  Ed25519 = 1,
  Secp256k1 = 2
}

export interface IPublicKey {

  /** PublicKey Type. */
  Type: KeyType

  /** PublicKey Data. */
  Data: Uint8Array
}

/** Represents a PublicKey. */
export class PublicKey implements IPublicKey {
  /**
   * Constructs a new PublicKey.
   *
   * @param [p] - Properties to set
   */
  constructor (p?: IPublicKey);

  /** PublicKey Type. */
  public Type: KeyType

  /** PublicKey Data. */
  public Data: Uint8Array

  /**
   * Encodes the specified PublicKey message. Does not implicitly {@link PublicKey.verify|verify} messages.
   *
   * @param m - PublicKey message or plain object to encode
   * @param [w] - Writer to encode to
   * @returns Writer
   */
  public static encode (m: IPublicKey, w?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a PublicKey message from the specified reader or buffer.
   *
   * @param r - Reader or buffer to decode from
   * @param [l] - Message length if known beforehand
   * @returns PublicKey
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode (r: ($protobuf.Reader|Uint8Array), l?: number): PublicKey;

  /**
   * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
   *
   * @param d - Plain object
   * @returns PublicKey
   */
  public static fromObject (d: { [k: string]: any }): PublicKey;

  /**
   * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
   *
   * @param m - PublicKey
   * @param [o] - Conversion options
   * @returns Plain object
   */
  public static toObject (m: PublicKey, o?: $protobuf.IConversionOptions): { [k: string]: any };

  /**
   * Converts this PublicKey to JSON.
   *
   * @returns JSON object
   */
  public toJSON (): { [k: string]: any };
}

export interface IPrivateKey {

  /** PrivateKey Type. */
  Type: KeyType

  /** PrivateKey Data. */
  Data: Uint8Array
}

/** Represents a PrivateKey. */
export class PrivateKey implements IPrivateKey {
  /**
   * Constructs a new PrivateKey.
   *
   * @param [p] - Properties to set
   */
  constructor (p?: IPrivateKey);

  /** PrivateKey Type. */
  public Type: KeyType

  /** PrivateKey Data. */
  public Data: Uint8Array

  /**
   * Encodes the specified PrivateKey message. Does not implicitly {@link PrivateKey.verify|verify} messages.
   *
   * @param m - PrivateKey message or plain object to encode
   * @param [w] - Writer to encode to
   * @returns Writer
   */
  public static encode (m: IPrivateKey, w?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a PrivateKey message from the specified reader or buffer.
   *
   * @param r - Reader or buffer to decode from
   * @param [l] - Message length if known beforehand
   * @returns PrivateKey
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode (r: ($protobuf.Reader|Uint8Array), l?: number): PrivateKey;

  /**
   * Creates a PrivateKey message from a plain object. Also converts values to their respective internal types.
   *
   * @param d - Plain object
   * @returns PrivateKey
   */
  public static fromObject (d: { [k: string]: any }): PrivateKey;

  /**
   * Creates a plain object from a PrivateKey message. Also converts values to other types if specified.
   *
   * @param m - PrivateKey
   * @param [o] - Conversion options
   * @returns Plain object
   */
  public static toObject (m: PrivateKey, o?: $protobuf.IConversionOptions): { [k: string]: any };

  /**
   * Converts this PrivateKey to JSON.
   *
   * @returns JSON object
   */
  public toJSON (): { [k: string]: any };
}
