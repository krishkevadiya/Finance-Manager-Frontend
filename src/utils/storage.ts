const TOKEN_KEY = "token";

interface StorageLike {
  getItem(
    key: string
  ): string | null;

  setItem(
    key: string,
    value: string
  ): void;

  removeItem(
    key: string
  ): void;
}

const getStorage =
  (): StorageLike | null => {
    const browser =
      globalThis as unknown as {
        localStorage?: StorageLike;
      };

    return (
      browser.localStorage ??
      null
    );
  };

export const storage = {
  getToken(): string | null {
    return (
      getStorage()?.getItem(
        TOKEN_KEY
      ) ?? null
    );
  },

  setToken(
    token: string
  ): void {
    getStorage()?.setItem(
      TOKEN_KEY,
      token
    );
  },

  removeToken(): void {
    getStorage()?.removeItem(
      TOKEN_KEY
    );
  },
};