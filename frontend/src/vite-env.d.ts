/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set when backend is ready — empty keeps local mocks. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
