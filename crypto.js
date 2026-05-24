const VITCM_CRYPTO = (() => {
  const PBKDF2_ITERATIONS = 180000;

  function toBase64(bytes) {
    const bin = String.fromCharCode(...bytes);
    return btoa(bin);
  }

  function fromBase64(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  async function deriveKey(passphrase, saltBytes) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJson(data, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plainBytes = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);

    return {
      salt: toBase64(salt),
      iv: toBase64(iv),
      cipher: toBase64(new Uint8Array(encrypted))
    };
  }

  async function decryptJson(payload, passphrase) {
    if (!payload || !payload.iv || !payload.cipher || !payload.salt) {
      return null;
    }

    const salt = fromBase64(payload.salt);
    const key = await deriveKey(passphrase, salt);
    const iv = fromBase64(payload.iv);
    const cipherBytes = fromBase64(payload.cipher);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes
    );

    const text = new TextDecoder().decode(new Uint8Array(decrypted));
    return JSON.parse(text);
  }

  return {
    encryptJson,
    decryptJson
  };
})();
