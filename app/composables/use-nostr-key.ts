import {
  normalizePrivateKey,
  normalizePublicKey,
  publicKeyToNpub,
} from "@bitos/bnos-core/auth";

export const useNostrKey = () => {
  /**
   * Decode private key from various formats (nsec or hex)
   */
  const decodePrivateKey = (inputKey: string): string => {
    return normalizePrivateKey(inputKey).privateKeyHex;
  };

  /**
   * Normalize pubkey (convert from npub to hex if needed)
   */
  const normalizeKey = (key: string): string => {
    return normalizePublicKey(key);
  };

  /**
   * Convert hex pubkey to npub
   */
  const hexToNpub = (hex: string): string => {
    return publicKeyToNpub(hex);
  };

  /**
   * Get public key from private key
   */
  const getPublicKeyFromPrivate = (privateKeyHex: string): string => {
    return normalizePrivateKey(privateKeyHex).pubkey;
  };

  return {
    decodePrivateKey,
    normalizeKey,
    hexToNpub,
    getPublicKeyFromPrivate,
  };
};
