import { KVStore } from "./kv";
import { assert } from "./utils";

export class Database {
    private baseKV: KVStore<string, string>;

    constructor(baseKV: KVStore<string, string>) {
        this.baseKV = baseKV;
    }

    async getJSON(key: string): Promise<any> {
        const stringValue = await this.baseKV.get(key);

        if (stringValue === null) {
            return null;
        }

        // TODO: need runtime type checking
        return JSON.parse(stringValue);
    }

    async setJSON(key: string, obj: any) {
        await this.baseKV.set(key, JSON.stringify(obj));
    }

    async list(prefix: string): Promise<string[]> {
        return this.baseKV.list(prefix);
    }
}

/**
 * Configuration is a cached single object
 */
export abstract class Configuration<T> {
    private db: Database;
    private name: string;
    private config: T | null;

    constructor(db: Database, name: string) {
        this.db = db;
        this.name = name;
        this.config = null;
    }

    protected abstract default(): T;

    async set<K extends keyof T>(key: K, value: T[K]) {
        await this.fetch();
        (this.config as T)[key] = value;
        await this.sync();
    }

    async get<K extends keyof T>(key: K): Promise<T[K]> {
        await this.fetch();
        return (this.config as T)[key];
    }

    /**
     * Syncrhonize changes
     */
    private async sync() {
        if (this.config !== null) {
            await this.db.setJSON(this.getRawKey(), this.config);
        } // if the config is null, we must have not changed it
    }

    private async fetch() {
        if (this.config === null) {
            this.config = this.default();

            const upstream = await this.db.getJSON(this.getRawKey());

            // upstream config exists
            if (upstream !== null) {
                Object.assign(this.config, upstream);
            }
        }
    }

    private getRawKey(): string {
        return "$" + this.name;
    }
}

export type PartialRecordHelper<T, K extends keyof T> = { [P in K]?: T[P] };
export type PartialRecord<T> = PartialRecordHelper<T, keyof T>;
export type ObjectConstructor<T> = new (c: PartialRecord<T>) => T;

/**
 * A collection is a string-indexed object store
 * with a specific object type
 */
export class Collection<T> {
    private db: Database;
    private name: string;

    private cons: ObjectConstructor<T>;

    constructor(db: Database, name: string, cons: ObjectConstructor<T>) {
        assert(
            !name.includes("$") && name !== "",
            `invalid collection name "${name}"`
        );

        this.db = db;
        this.name = name;
        this.cons = cons;
    }

    async get(key: string): Promise<T | null> {
        // uninstantiated object
        const raw = (await this.db.getJSON(this.getRawKey(key))) as Record<
            keyof T,
            any
        >;

        if (raw === null) return null;

        return new this.cons(raw);
    }

    async set(key: string, obj: T) {
        await this.db.setJSON(this.getRawKey(key), obj);
    }

    async list(prefix: string = ""): Promise<string[]> {
        const rawPrefix = this.getRawKey(prefix);
        const rawKeys = await this.db.list(rawPrefix);
        const prefixLength = rawPrefix.length;
    
        rawKeys.forEach((value, i, array) => {
            array[i] = value.substring(prefixLength);
        });

        return rawKeys;
    }

    /**
     * get the actual key in the raw database
     */
    private getRawKey(key: string): string {
        return this.name + "$" + key;
    }
}
