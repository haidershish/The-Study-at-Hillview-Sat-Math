/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Desmos API key injected at build time (from VITE_DESMOS_API_KEY). */
  readonly VITE_DESMOS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
