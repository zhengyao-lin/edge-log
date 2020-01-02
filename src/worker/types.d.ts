import { KVNamespace } from "@cloudflare/workers-types";

declare global {
    const TEST_KV: KVNamespace;
}
