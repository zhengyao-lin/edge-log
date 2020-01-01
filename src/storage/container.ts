import { Path, JSONEncodable } from "./path";
import { KVStore } from "./kv";
import { assert } from "../utils";
import { Encoding, BaseReductionEncoding } from "./encoding";

/**
 * Containers built on a path-JSON store
 */

/**
 * Configuration is a cached single object
 * that can be used to access individual fields
 */
export abstract class Configuration<T> {
    private config: T | null = null;

    constructor(
        private base: KVStore<Path, JSONEncodable>,
        private path: Path
    ) {}

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

/**
 * Primary keys are a set of keys in a record
 * used for indexing and searching
 *
 * Only integer, boolean, and string are allowed to be used as primary keys
 *
 * Primary keys are readonly
 */
export class KeyProperty {
    static readonly SCHEMA_NAME: unique symbol = Symbol();
    static readonly PRIMARY_DEFAULT: unique symbol = Symbol();
    static readonly PRIMARY_UNIQUE: unique symbol = Symbol();

    static createSchema(classObj: any) {
        if (!classObj.hasOwnProperty(KeyProperty.SCHEMA_NAME)) {
            classObj[KeyProperty.SCHEMA_NAME] = {};
        }
    }

    static primary(classObj: any) {
        return (target: any, key: string) => {
            KeyProperty.createSchema(classObj);
            classObj[KeyProperty.SCHEMA_NAME][key] =
                KeyProperty.PRIMARY_DEFAULT;
        };
    }

    /**
     * There should be at most one unique primary key for
     * fast indexing
     */
    static unique(classObj: any) {
        return (target: any, key: string) => {
            KeyProperty.createSchema(classObj);
            classObj[KeyProperty.SCHEMA_NAME][key] = KeyProperty.PRIMARY_UNIQUE;
        };
    }
}

export type PrimaryKey = number | boolean | string;

/**
 * Schema is a record specifying the primary keys and their respective properties
 */

export type Schema<T> = { [K in keyof T]?: Symbol };
export type PartialRecord<T> = { [K in keyof T]?: T[K] };

export type ObjectConstructor<T> = new (c: PartialRecord<T>) => T;
export type ObjectWithSchema<T> = { SCHEMA: Schema<T> };

/**
 * Patterns and queries
 */

export type StringPattern = string | RegExp;
export type NumberPattern =
    | number
    | { gt: number }
    | { lt: number }
    | { ge: number }
    | { le: number };

export type PrimitivePattern<V> = V extends string
    ? StringPattern
    : V extends number
    ? NumberPattern
    : V;

export type ObjectPattern<T> = { [K in keyof T]?: PrimitivePattern<T[K]> };

/**
 * Disjunction of all patterns
 */
export type Query<T> = ObjectPattern<T>[];

/**
 * Lazy loader of items
 */
export class Cursor<T> {
    private cache: (T | null)[];

    constructor(private collection: Collection<T>, private rawKeys: string[]) {
        this.cache = [];
    }

    [Symbol.asyncIterator](): AsyncIterator<T | null> {
        let position = 0;

        return {
            next: async (): Promise<IteratorResult<T | null>> => {
                if (position >= this.rawKeys.length) {
                    return { done: true, value: null };
                }

                if (this.cache[position] === undefined) {
                    const rawKey = this.rawKeys[position];
                    this.cache[position] = await this.collection.getByRawKey(
                        rawKey
                    );
                }

                return {
                    done: false,
                    value: this.cache[position++],
                };
            },
        };
    }

    async readAll(): Promise<(T | null)[]> {
        const items: (T | null)[] = [];

        for await (const item of this) {
            items.push(item);
        }

        return items;
    }
}

export class PrimaryKeyEncodig<T>
    implements Encoding<Record<string, PrimaryKey>, string> {
    private keyToIndex: Record<string, number>;
    private indexToKey: string[];

    constructor(
        private schema: Schema<T>,
        private separator: string = "|",
        private componentEncoding: Encoding<
            string,
            string
        > = new BaseReductionEncoding("|")
    ) {
        let keys = Object.keys(schema);
        let uniqueKey = null;
        const defaultKeys = [];

        // put the unique key up front so that we can
        // look it up more easily
        for (const key of keys) {
            if (this.schema[key as keyof T] === KeyProperty.PRIMARY_UNIQUE) {
                assert(uniqueKey === null, "multiple unique keys");
                uniqueKey = key;
            } else {
                defaultKeys.push(key);
            }
        }

        defaultKeys.sort((a, b) => a.localeCompare(b));

        if (uniqueKey !== null) {
            keys = [uniqueKey].concat(defaultKeys);
        } else {
            keys = defaultKeys;
        }

        this.keyToIndex = {};
        this.indexToKey = keys;

        keys.forEach((key, index) => {
            this.keyToIndex[key] = index;
        });
    }

    private encodeComponent(value: PrimaryKey): string {
        if (typeof value === "number") return "i" + value.toString(16);
        if (typeof value === "boolean") return value ? "b1" : "b0";

        // just string
        return "s" + value;
    }

    private decodeComponent(encoded: string): PrimaryKey | null {
        if (encoded.length == 0) return null;

        const typeToken = encoded[0];
        encoded = encoded.substr(1);

        if (typeToken === "i") {
            const value = Number.parseInt(encoded, 16);

            if (Number.isNaN(value)) return null;

            return value;
        }

        if (typeToken === "b") {
            if (encoded === "0") return false;
            if (encoded === "1") return true;
            return null;
        }

        if (typeToken === "s") {
            return encoded;
        }

        return null;
    }

    /**
     * Given the unique key, returns a (unique) prefix
     * for any potential encoding
     */
    encodeUniqueKeyPrefix(value: PrimaryKey): string {
        return this.encodeComponent(value) + this.separator;
    }

    encode(primaryKeys: Record<string, PrimaryKey>): string {
        const keys = [];

        for (const key in primaryKeys) {
            const value = primaryKeys[key];
            const index = this.keyToIndex[key];

            assert(
                index != undefined,
                `"${key}" is not supposed to be a primary key`
            );

            keys[index] = this.componentEncoding.encode(
                this.encodeComponent(value)
            );
        }

        return keys.join(this.separator);
    }

    decode(encoded: string): Record<string, PrimaryKey> | null {
        const keys = encoded.split(this.separator);
        const primaryKeys: Record<string, PrimaryKey> = {};

        if (keys.length != this.indexToKey.length) {
            return null;
        }

        let failed = false;

        keys.forEach((encoded, index) => {
            const component = this.componentEncoding.decode(encoded);

            if (component === null) {
                failed = true;
                return;
            }

            const value = this.decodeComponent(component);

            if (value === null) {
                failed = true;
                return;
            }

            primaryKeys[this.indexToKey[index]] = value;
        });

        if (failed) return null;

        return primaryKeys;
    }
}

/**
 * A collection is a set of objects indexed by a specified set of
 * primary keys in the object
 *
 * Objects can be queried and sorted by one or more of the primary keys
 */
export class Collection<T> {
    private keyEncoding: PrimaryKeyEncodig<T>;
    private uniqueKey: string | null = null;
    private schema: Schema<T>;

    constructor(
        private base: KVStore<Path, JSONEncodable>,
        private path: Path,
        private cons: ObjectConstructor<T>
    ) {
        this.schema =
            KeyProperty.SCHEMA_NAME in cons
                ? (cons as any)[KeyProperty.SCHEMA_NAME]
                : {};

        this.keyEncoding = new PrimaryKeyEncodig(this.schema);

        for (const key in this.schema) {
            if (this.schema[key] === KeyProperty.PRIMARY_UNIQUE) {
                this.uniqueKey = key;
            }
        }
    }

    static isValidPrimaryKey(v: any): v is PrimaryKey {
        return (
            (typeof v === "number" && Number.isInteger(v)) ||
            typeof v === "boolean" ||
            typeof v === "string"
        );
    }

    private separatePrimaryKeys(
        obj: T
    ): [Record<string, PrimaryKey>, Record<string, any>] {
        const primaryKeys: Record<string, PrimaryKey> = {};
        const value: Record<string, any> = {};

        for (const key in obj) {
            if (this.isPrimaryKey(key)) {
                const v = obj[key]; // add a temporary value to make type checker happy

                if (Collection.isValidPrimaryKey(v)) {
                    primaryKeys[key.toString()] = v;
                } else {
                    assert(false, `value "${v}" is not a valid primary key`);
                }
            } else {
                value[key.toString()] = obj[key];
            }
        }

        return [primaryKeys, value];
    }

    async add(obj: T): Promise<void> {
        const [primaryKeys, value] = this.separatePrimaryKeys(obj);
        const key = this.keyEncoding.encode(primaryKeys);

        await this.base.set(this.path.concat(key), value);
    }

    isPrimaryKey(key: keyof T): boolean {
        return this.schema[key] !== undefined;
    }

    /**
     * List keys immediately under the base path with the given prefix
     */
    private async listImmediatePrefix(prefix: string): Promise<string[]> {
        return (await this.base.list(this.path.concat(prefix)))
            .filter(path => path.length == this.path.length + 1)
            .map(path => path[path.length - 1]);
    }

    async getAllPrimaryKeys(): Promise<Record<string, PrimaryKey>[]> {
        const rawKeys = await this.listImmediatePrefix("");
        const keys: Record<string, PrimaryKey>[] = [];

        for (const rawKey of rawKeys) {
            const primaryKeys = this.keyEncoding.decode(rawKey);

            if (primaryKeys !== null) {
                keys.push(primaryKeys);
            }
        }

        return keys;
    }

    /**
     * Look up the raw key corresponding to the given key-value pair
     */
    private async lookupUniqueKey<K extends keyof T>(
        key: K,
        value: T[K]
    ): Promise<string | null> {
        assert(
            this.uniqueKey !== null && this.uniqueKey === key,
            `"${key}" is not a unique key`
        );

        if (!Collection.isValidPrimaryKey(value)) {
            assert(false, `${value} is not a valid primary key value`);
            return null;
        }

        const prefix = this.keyEncoding.encodeUniqueKeyPrefix(value);
        const rawKeys = await this.listImmediatePrefix(prefix);

        // take the first one if there are multiple key
        if (rawKeys.length == 0) return null;
        return rawKeys[0];
    }

    async getByRawKey(rawKey: string): Promise<T | null> {
        const primaryKeys = this.keyEncoding.decode(rawKey);

        const dataKeys = await this.base.get(this.path.concat(rawKey));
        if (dataKeys === null) return null;

        const partial: PartialRecord<T> = {
            ...primaryKeys,
            ...dataKeys,
        };

        return new this.cons(partial);
    }

    async getByUniqueKey<K extends keyof T>(
        key: K,
        value: T[K]
    ): Promise<T | null> {
        const rawKey = await this.lookupUniqueKey(key, value);
        if (rawKey === null) return null;

        return await this.getByRawKey(rawKey);
    }

    async setByUniqueKey<K extends keyof T>(
        key: K,
        value: T[K],
        obj: T
    ): Promise<boolean> {
        const rawKey = await this.lookupUniqueKey(key, value);
        if (rawKey === null) return false; // cannot find the item

        const [_, data] = this.separatePrimaryKeys(obj);
        await this.base.set(this.path.concat(rawKey), data);

        return true;
    }

    async deleteByUniqueKey<K extends keyof T>(
        key: K,
        value: T[K]
    ): Promise<boolean> {
        const rawKey = await this.lookupUniqueKey(key, value);

        if (rawKey !== null) {
            await this.base.delete(this.path.concat(rawKey));
            return true;
        }

        return false;
    }

    private matchPattern(
        primaryKeys: Record<string, PrimaryKey>,
        pattern: ObjectPattern<T>
    ): boolean {
        for (const key in pattern) {
            if (!primaryKeys.hasOwnProperty(key)) {
                return false;
            }

            const value = primaryKeys[key];
            const subpattern: any = pattern[key];

            switch (typeof value) {
                /**
                 * integer patterns
                 */
                case "number":
                    if (typeof subpattern === "number") {
                        if (subpattern !== value) {
                            return false;
                        }
                    } else {
                        if (
                            subpattern["gt"] !== undefined &&
                            !(value > subpattern["gt"])
                        ) {
                            return false;
                        }

                        if (
                            subpattern["lt"] !== undefined &&
                            !(value < subpattern["lt"])
                        ) {
                            return false;
                        }

                        if (
                            subpattern["ge"] !== undefined &&
                            !(value >= subpattern["ge"])
                        ) {
                            return false;
                        }

                        if (
                            subpattern["le"] !== undefined &&
                            !(value <= subpattern["le"])
                        ) {
                            return false;
                        }
                    }

                    break;

                /**
                 * boolean patterns
                 */
                case "boolean":
                    if (value !== subpattern) {
                        return false;
                    }

                    break;

                /**
                 * string patterns
                 */
                case "string":
                    if (subpattern instanceof RegExp) {
                        if (!subpattern.test(value)) {
                            return false;
                        }
                    } else if (value !== subpattern) {
                        return false;
                    }

                    break;
            }
        }

        return true;
    }

    private matchQuery(
        primaryKeys: Record<string, PrimaryKey>,
        query: Query<T>
    ): boolean {
        for (const pattern of query) {
            if (this.matchPattern(primaryKeys, pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Given a query in disjunctive form, returns
     * the list of items satisfying at least one of the
     * conditions
     */
    async query(query: Query<T>): Promise<Cursor<T>> {
        const primaryKeysSet = await this.getAllPrimaryKeys();
        const rawKeys: string[] = [];

        for (const primaryKeys of primaryKeysSet) {
            if (this.matchQuery(primaryKeys, query)) {
                rawKeys.push(this.keyEncoding.encode(primaryKeys));
            }
        }

        return new Cursor(this, rawKeys);
    }
}
