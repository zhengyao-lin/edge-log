import { KVNamespace } from "@cloudflare/workers-types";

/**
 * An abstraction for a simple kv store
 */
export abstract class KVStore<K, V> {
    abstract async get(key: K): Promise<V | null>;
    abstract async set(key: K, value: V): Promise<void>;
    abstract async list(prefix: string): Promise<K[]>;

    async setBatch(keyValuePairs: [K, V][]): Promise<void> {
        for (const [k, v] of keyValuePairs) {
            await this.set(k, v);
        }
    }
}

export class MemoryStringKVStore<V> extends KVStore<string, V> {
    private map: Map<string, V>;

    constructor() {
        super();
        this.map = new Map<string, V>();
    }

    async get(key: string): Promise<V | null> {
        const v = this.map.get(key);
        return v === undefined ? null : v;
    }

    async set(key: string, value: V): Promise<void> {
        this.map.set(key, value);
    }

    async list(prefix: string): Promise<string[]> {
        return Array.from(this.map.keys());
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

    async list(prefix: string): Promise<string[]> {
        const list = await this.namespace.list({ prefix });
        const keys = [];

        for (const { name } of list.keys) {
            keys.push(name);
        }

        return keys;
    }
}
