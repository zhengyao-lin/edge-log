import { Encoding } from "./encoding";

/**
 * An abstraction for a simple kv store
 */
export abstract class KVStore<K, V> {
    abstract async get(key: K): Promise<V | null>;
    abstract async set(key: K, value: V): Promise<void>;
    abstract async delete(key: K): Promise<void>;
    abstract async list(prefix: K): Promise<K[]>;

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

export class ValueEncodedStore<K, S, T> extends KVStore<K, S> {
    constructor(private base: KVStore<K, T>, private encoding: Encoding<S, T>) {
        super();
    }

    async get(key: K): Promise<S | null> {
        const encoded = await this.base.get(key);
        if (encoded === null) return null;

        const value = this.encoding.decode(encoded);
        if (value === null) return null;

        return value;
    }

    async set(key: K, value: S): Promise<void> {
        await this.base.set(key, this.encoding.encode(value));
    }

    async delete(key: K): Promise<void> {
        await this.base.delete(key);
    }

    async list(prefix: K): Promise<K[]> {
        return await this.base.list(prefix);
    }
}

export class KeyEncodedStore<S, T, V> extends KVStore<S, V> {
    constructor(private base: KVStore<T, V>, private encoding: Encoding<S, T>) {
        super();
    }

    async get(key: S): Promise<V | null> {
        return await this.base.get(this.encoding.encode(key));
    }

    async set(key: S, value: V): Promise<void> {
        await this.base.set(this.encoding.encode(key), value);
    }

    async delete(key: S): Promise<void> {
        await this.base.delete(this.encoding.encode(key));
    }

    /**
     * base list composed with decoding
     */
    async list(prefix: S): Promise<S[]> {
        const keys = await this.base.list(this.encoding.encode(prefix));
        const decodedKeys: S[] = [];

        for (const key of keys) {
            const decoded = this.encoding.decode(key);

            if (decoded !== null) {
                decodedKeys.push(decoded);
            }
        }

        return decodedKeys;
    }
}
