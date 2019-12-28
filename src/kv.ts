import { KVNamespace } from "@cloudflare/workers-types";

/**
 * An abstraction for a simple kv store
 */
export abstract class KVStore<K, V> {
    abstract async get(key: K): Promise<V | null>;
    abstract async set(key: K, value: V): Promise<void>;
    abstract async delete(key: K): Promise<void>;
    abstract async list(prefix: string): Promise<K[]>;

    async setBatch(keyValuePairs: [K, V][]): Promise<void> {
        for (const [k, v] of keyValuePairs) {
            await this.set(k, v);
        }
    }
}

export class PrefixedKVStore<V> extends KVStore<string, V> {
    constructor(private prefix: string, private store: KVStore<string, V>) {
        super();
    }

    async get(key: string): Promise<V | null> {
        return await this.store.get(this.prefix + key);
    }

    async set(key: string, value: V): Promise<void> {
        await this.store.set(this.prefix + key, value);
    }

    async delete(key: string): Promise<void> {
        await this.store.delete(this.prefix + key);
    }

    async list(prefix: string): Promise<string[]> {
        return await this.store.list(this.prefix + prefix);
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

    async delete(key: string): Promise<void> {
        this.map.delete(key);
    }

    async list(prefix: string): Promise<string[]> {
        return Array.from(this.map.keys()).filter(s => s.startsWith(prefix));
    }
}

/**
 * A wrapper for the worker kv store
 */
export abstract class WorkerKVStore<
    V extends string | ReadableStream
> extends KVStore<string, V> {
    constructor(protected namespace: KVNamespace) {
        super();
    }

    abstract async get(key: string): Promise<V | null>;

    async set(key: string, value: V): Promise<void> {
        await this.namespace.put(key, value);
    }

    async delete(key: string): Promise<void> {
        await this.namespace.delete(key);
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

export class WorkerStringKVStore extends WorkerKVStore<string> {
    async get(key: string): Promise<string | null> {
        return await this.namespace.get(key);
    }
}

export class WorkerStreamKVStore extends WorkerKVStore<ReadableStream> {
    async get(key: string): Promise<ReadableStream | null> {
        return await this.namespace.get(key, "stream");
    }
}
