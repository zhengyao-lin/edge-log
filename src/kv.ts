import { KVNamespace } from "@cloudflare/workers-types";

/**
 * An abstraction for a simple kv store
 */
export abstract class KVStore<K, V> {
    abstract async get(key: K): Promise<V | null>;
    abstract async set(key: K, value: V): Promise<void>;

    async setBatch(keyValuePairs: Array<[K, V]>): Promise<void> {
        for (const [k, v] of keyValuePairs) {
            await this.set(k, v);
        }
    }
}

export class MemoryStringKVStore<V> extends KVStore<string, V> {
    private map: Record<string, V>;

    constructor() {
        super();
        this.map = {};
    }

    async get(key: string): Promise<V | null> {
        const v = this.map[key];
        return v === undefined ? null : v;
    }

    async set(key: string, value: V): Promise<void> {
        this.map[key] = value;
    }
}

/**
 * A wrapper for the worker kv store
 */
export class WorkerKVStore extends KVStore<string, string> {
    private namespace: KVNamespace;

    constructor(namespace: KVNamespace) {
        super();
        this.namespace = namespace;
    }

    async get(key: string): Promise<string | null> {
        return await this.namespace.get(key);
    }

    async set(key: string, value: string): Promise<void> {
        await this.namespace.put(key, value);
    }
}
