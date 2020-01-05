import { Encoding, PrefixableEncoding } from "./encoding";

/**
 * An abstraction for a simple kv store
 */
export abstract class KVStore<K, V> {
    abstract async get(key: K): Promise<V | null>;
    abstract async set(key: K, value: V): Promise<void>;
    abstract async delete(key: K): Promise<void>;
    abstract async list(prefix: K): Promise<K[]>;

    async setBatch(keyValuePairs: [K, V][]) {
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

    async set(key: string, value: V) {
        this.map.set(key, value);
    }

    async delete(key: string) {
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

    async set(key: K, value: S) {
        await this.base.set(key, this.encoding.encode(value));
    }

    async delete(key: K) {
        await this.base.delete(key);
    }

    async list(prefix: K): Promise<K[]> {
        return await this.base.list(prefix);
    }
}

export class KeyEncodedStore<S, T, V> extends KVStore<S, V> {
    constructor(
        private base: KVStore<T, V>,
        private encoding: PrefixableEncoding<S, T>
    ) {
        super();
    }

    async get(key: S): Promise<V | null> {
        return await this.base.get(this.encoding.encode(key));
    }

    async set(key: S, value: V) {
        await this.base.set(this.encoding.encode(key), value);
    }

    async delete(key: S) {
        await this.base.delete(this.encoding.encode(key));
    }

    /**
     * base list composed with decoding
     */
    async list(prefix: S): Promise<S[]> {
        const keys = await this.base.list(this.encoding.encode(prefix));
        const decodedKeys: S[] = [];

        // the set of keys that have encode(prefix) as prefix
        // must yield the exact set of keys after decoding (all have the original "prefix" as prefix)
        // by the assumption of PrefixableEncoding
        for (const key of keys) {
            const decoded = this.encoding.decode(key);

            // filter out invalid keys and non-prefix keys
            // since the condition for a PrefixableEncoding
            // is not bidirectional
            if (decoded !== null) {
                decodedKeys.push(decoded);
            }
        }

        return decodedKeys;
    }
}

export class EncodedStore<KS, KT, VS, VT> extends KeyEncodedStore<KS, KT, VS> {
    constructor(
        base: KVStore<KT, VT>,
        keyEncoding: Encoding<KS, KT>,
        valueEncoding: Encoding<VS, VT>
    ) {
        super(new ValueEncodedStore(base, valueEncoding), keyEncoding);
    }
}
