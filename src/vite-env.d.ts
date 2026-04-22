/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HISTORIAN_AGENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
