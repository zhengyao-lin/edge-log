import { KVStore } from "./kv";
import { assert } from "../utils";
import { Encoding, BaseReductionEncoding } from "./encoding";

export type Path = string[];
export type JSONEncodable = any;

/**
 * PathEncoding is an encoding with the additional property that
 * for all a: string, b: string, path: Path,
 * a is a prefix of b => encode(path + [a]) is a prefix of encode(path + [b])
 */
export type PathEncoding = Encoding<Path, string>;

export class URIPathEncoding implements PathEncoding {
    constructor() {}

    encode(path: Path): string {
        return path.map(encodeURIComponent).join("/");
    }

    decode(key: string): Path | null {
        return key.split("/").map(decodeURIComponent);
    }
}

export class SeparatorPathEncoding implements PathEncoding {
    private base: BaseReductionEncoding;

    constructor(private separator: string = "\0") {
        this.base = new BaseReductionEncoding(separator);
    }

    encode(path: Path): string {
        return path.map(this.base.encode.bind(this.base)).join(this.separator);
    }

    decode(key: string): Path | null {
        return key.split(this.separator).map(this.base.decode.bind(this.base));
    }
}

/**
 * A "path"-indexed kv store for storing JSON encoded objects
 */
export class PathJSONStore extends KVStore<Path, JSONEncodable> {
    constructor(
        private base: KVStore<string, string>,
        private pathEncoding: PathEncoding = new URIPathEncoding()
    ) {
        super();
    }

    async get(path: Path): Promise<JSONEncodable | null> {
        const stringValue = await this.base.get(this.pathEncoding.encode(path));

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

    async set(path: Path, obj: JSONEncodable): Promise<void> {
        await this.base.set(
            this.pathEncoding.encode(path),
            JSON.stringify(obj)
        );
    }

    async delete(path: Path): Promise<void> {
        await this.base.delete(this.pathEncoding.encode(path));
    }

    /**
     * return keys of kv pairs under a path (only the last path component is returned)
     */
    async list(prefix: Path): Promise<Path[]> {
        const keys = await this.base.list(this.pathEncoding.encode(prefix));
        const paths: Path[] = [];

        for (const key of keys) {
            const path = this.pathEncoding.decode(key);

            if (path !== null) {
                paths.push(path);
            }
        }

        return paths;
    }
}
