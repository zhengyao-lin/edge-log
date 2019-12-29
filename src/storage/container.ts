import { Path, JSONEncodable } from "./path";
import { KVStore } from "./kv";
import { assert } from "../utils";

/**
 * Containers built on a path-JSON store
 */

/**
 * Configuration is a cached single object
 * that can be used to access individual fields
 */
export abstract class Configuration<T> {
    private config: T | null = null;

    constructor(private base: KVStore<Path, JSONEncodable>,
                private path: Path) {}

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
            await this.base.set(this.path, this.config);
        } // if the config is null, we must have not changed it
    }

    private async fetch() {
        if (this.config === null) {
            this.config = this.default();

            const upstream = await this.base.get(this.path);

            // upstream config exists
            if (upstream !== null) {
                Object.assign(this.config, upstream);
            }
        }
    }
}

export enum PrimaryKey {
    Default,
    ReadOnly
};

/**
 * Schema is a record specifying the primary keys and their respective properties
 */
export type Schema<T> = { [K in keyof T]?: PrimaryKey };

export type PartialRecord<T> = { [P in keyof T]?: T[P] };
export type ObjectConstructor<T> = new (c: PartialRecord<T>) => T;
export type ObjectWithSchema<T> = { SCHEMA: Schema<T> };

/**
 * A collection is a set of objects indexed by a specified set of
 * primary keys in the object
 * 
 * Objects can be queried and sorted by one or more of the primary keys
 */
export class Collection<T> {
    constructor(
        private base: KVStore<Path, JSONEncodable>,
        private path: Path,
        private cons: ObjectConstructor<T> & ObjectWithSchema<T>
    ) {}

    async add(obj: T): Promise<void> {
        const primaryKeys: Record<string, any> = {};
        const value: Record<string, any> = {};

        for (const key in obj) {
            if (this.isPrimaryKey(key)) {
                primaryKeys[key.toString()] = obj[key];
            } else {
                value[key.toString()] = obj[key];
            }
        }

        const key = JSON.stringify(primaryKeys);
        
        await this.base.set(this.path.concat([key]), value);
    }

    isPrimaryKey(key: keyof T): boolean {
        return this.cons.SCHEMA[key] !== undefined;
    }

    async getAllPrimaryKeys(): Promise<Schema<T>[]> {
        const paths = (await this.base.list(this.path))
            .filter(path => path.length == this.path.length + 1);

        const keys: Schema<T>[] = [];

        for (const path of paths) {
            try {
                keys.push(JSON.parse(path[path.length - 1]));
            } catch (_) { } // ignore if decoding failed
        }

        return keys;
    }

    // query
    // mutation
}
