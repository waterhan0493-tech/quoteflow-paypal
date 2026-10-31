/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PayPal REST app client ID (sandbox). Public value; never put the secret here. */
  readonly VITE_PAYPAL_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
