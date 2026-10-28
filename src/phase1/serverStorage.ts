declare const __ORG_SETUP_ENABLED__: boolean

/**
 * False unless the site was built with ORG_SETUP_ENABLED=true (vite.config.ts). While false, /phase1
 * shows only its local example and local setup, never the screens that use server storage
 * (online Organization Setup, the live Activity workspace, the confirmed-organization workspace).
 */
export const SERVER_STORAGE = __ORG_SETUP_ENABLED__
