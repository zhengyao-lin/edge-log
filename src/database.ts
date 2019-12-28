import { KVStore } from "./kv";
import { assert } from "./utils";

export type Path = string[];

export interface PathScheme {
    /**
     * encode/decode must be bijective
     * and have the property that
     * for all a: string, b: string, path: Path,
     * a is a prefix of b => encode(path + [a]) is a prefix of encode(path + [b])
     */
    encode(path: Path): string;
    decode(key: string): Path;
}

export class URIPathScheme implements PathScheme {
    constructor() {}

    encode(path: Path): string {
        return path.map(encodeURIComponent).join("/");
    }

    decode(key: string): Path {
        return key.split("/").map(decodeURIComponent);
    }
}

export class SeparatorPathScheme implements PathScheme {
    private escapeChars: number[];

    constructor(private separator: number = 0) {
        this.separator = this.separator % 256;
        this.escapeChars = [(separator + 1) % 256, (separator + 2) % 256];
    }

    encode(path: Path): string {
        return path
            .map(this.escapePathComponent.bind(this))
            .join(String.fromCharCode(this.separator));
    }

    decode(key: string): Path {
        return key
            .split(String.fromCharCode(this.separator))
            .map(this.unescapePathComponent.bind(this));
    }

    private escapePathComponent(str: string): string {
        // suppose t is the separator code
        // let a, b be two arbitrary characters where a /= t and b /= t
        // then the following character transformation is a bijection
        // a -> aa
        // b -> bb
        // t -> ab
        // _ -> _

        const t = this.separator;
        const [a, b] = this.escapeChars;

        let charA = a.toString(16),
            charB = b.toString(16),
            charT = t.toString(16);

        if (charA.length == 1) charA = "0" + charA;
        if (charB.length == 1) charB = "0" + charB;
        if (charT.length == 1) charT = "0" + charT;

        const regex = RegExp(`[\\x${charA}\\x${charB}\\x${charT}]`, "g");

        return str.replace(regex, substr => {
            const code = substr.charCodeAt(0);

            if (code == a) {
                return String.fromCharCode(a, a);
            } else if (code == b) {
                return String.fromCharCode(b, b);
            } else {
                return String.fromCharCode(a, b);
            }
        });
    }

    /**
     * inverse of escapePathComponent
     */
    private unescapePathComponent(str: string): string {
        const [a, b] = this.escapeChars;

        let charA = a.toString(16),
            charB = b.toString(16);

        if (charA.length == 1) charA = "0" + charA;
        if (charB.length == 1) charB = "0" + charB;

        const regex = RegExp(
            `\\x${charA}\\x${charA}|\\x${charA}\\x${charB}|\\x${charB}\\x${charB}`,
            "g"
        );

        return str.replace(regex, substr => {
            if (substr == String.fromCharCode(a, a)) {
                return String.fromCharCode(a);
            } else if (substr == String.fromCharCode(b, b)) {
                return String.fromCharCode(b);
            } else {
                // a b
                return String.fromCharCode(this.separator);
            }
        });
    }
}

/**
 * kv database using JSON for encoding
 */
export class Database {
    constructor(
        private baseKV: KVStore<string, string>,
        private pathScheme: PathScheme = new URIPathScheme()
    ) {}

    async getJSON(path: Path): Promise<any> {
        const stringValue = await this.baseKV.get(this.pathScheme.encode(path));

        if (stringValue === null) {
            return null;
        }

        // TODO: need runtime type checking
        try {
            return JSON.parse(stringValue);
        } catch (e) {
            return null; // treat ill-formatted content as null
        }
    }

    async setJSON(path: Path, obj: any) {
        await this.baseKV.set(
            this.pathScheme.encode(path),
            JSON.stringify(obj)
        );
    }

    /**
     * return keys of kv pairs under a path (only the last path component is returned)
     */
    async list(path: Path, prefix: string = ""): Promise<string[]> {
        const keys = await this.baseKV.list(
            this.pathScheme.encode(path.concat([prefix]))
        );

        return keys
            .map(this.pathScheme.decode.bind(this.pathScheme))
            .filter(p => p.length == path.length + 1)
            .map(p => {
                assert(p.length > 0, "empty path");
                return p[p.length - 1];
            });
    }
}

/**
 * Configuration is a cached single object
 */
export abstract class Configuration<T> {
    private config: T | null = null;

    constructor(private db: Database, private path: Path) {}

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
            await this.db.setJSON(this.path, this.config);
        } // if the config is null, we must have not changed it
    }

    private async fetch() {
        if (this.config === null) {
            this.config = this.default();

            const upstream = await this.db.getJSON(this.path);

            // upstream config exists
            if (upstream !== null) {
                Object.assign(this.config, upstream);
            }
        }
    }
}

export type PartialRecord<T> = { [P in keyof T]?: T[P] };
export type ObjectConstructor<T> = new (c: PartialRecord<T>) => T;

/**
 * A collection is a string-indexed object store
 * with a specific object type
 */
export class Collection<T> {
    constructor(
        private db: Database,
        private path: Path,
        private cons: ObjectConstructor<T>
    ) {}

    async get(key: string): Promise<T | null> {
        // uninstantiated object
        const raw = (await this.db.getJSON(this.path.concat([key]))) as Record<
            keyof T,
            any
        >;

        if (raw === null) return null;

        return new this.cons(raw);
    }

    async set(key: string, obj: T) {
        await this.db.setJSON(this.path.concat([key]), obj);
    }

    async list(prefix: string = ""): Promise<string[]> {
        return await this.db.list(this.path, prefix);
    }
}
