import api from "../api/axios";

interface SubtleCryptoLike {
  importKey(
    format: string,
    keyData: ArrayBuffer,
    algorithm: {
      name: string;
      hash: string;
    },
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKeyLike>;

  encrypt(
    algorithm: {
      name: string;
    },
    key: CryptoKeyLike,
    data: ArrayBuffer
  ): Promise<ArrayBuffer>;
}

interface CryptoKeyLike {
  readonly type?: string;
}

interface CryptoLike {
  subtle: SubtleCryptoLike;
}

interface BrowserGlobals {
  crypto?: CryptoLike;
}

const getBrowserCrypto = (): CryptoLike => {
  const browser = globalThis as unknown as BrowserGlobals;

  if (!browser.crypto) {
    throw new Error("Web Crypto API is not available in this browser.");
  }

  return browser.crypto;
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");

  const output: number[] = [];

  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < cleanBase64.length; i++) {
    const char = cleanBase64[i];

    if (char === "=") {
      break;
    }

    const value = chars.indexOf(char);

    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(output).buffer;
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  return base64ToArrayBuffer(base64);
};

const stringToUtf8ArrayBuffer = (value: string): ArrayBuffer => {
  const bytes: number[] = [];

  for (let i = 0; i < value.length; i++) {
    const codePoint = value.codePointAt(i);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(
        0xc0 | (codePoint >> 6),
        0x80 | (codePoint & 0x3f)
      );
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );

      i++;
    }
  }

  return new Uint8Array(bytes).buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  let result = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const hasByte2 = i + 1 < bytes.length;
    const hasByte3 = i + 2 < bytes.length;

    const index1 = byte1 >> 2;
    const index2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const index3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const index4 = byte3 & 63;

    result += chars[index1];
    result += chars[index2];
    result += hasByte2 ? chars[index3] : "=";
    result += hasByte3 ? chars[index4] : "=";
  }

  return result;
};

export const encryptPassword = async (
  password: string
): Promise<string> => {
  if (!password) {
    throw new Error("Password is required.");
  }

  const response = await api.get<{ publicKey: string }>(
    "/auth/public-key"
  );

  const publicKey = response.data.publicKey;

  if (!publicKey) {
    throw new Error("Server public key was not received.");
  }

  const crypto = getBrowserCrypto();

  const keyData = pemToArrayBuffer(publicKey);

  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );

  const passwordData = stringToUtf8ArrayBuffer(password);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    cryptoKey,
    passwordData
  );

  return arrayBufferToBase64(encryptedData);
};