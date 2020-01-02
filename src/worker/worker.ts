import { KVNamespace } from "@cloudflare/workers-types";

import { KVStore } from "./storage/kv";

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
