import { KVStore } from "./kv";
import { assert } from "../utils";

export type Path = string[];
export type JSONEncodable = any;

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
 * A "path"-indexed kv store for storing JSON encoded objects
 */
export class PathJSONStore extends KVStore<Path, JSONEncodable> {
    constructor(
        private base: KVStore<string, string>,
        private pathScheme: PathScheme = new URIPathScheme()
    ) {
        super();
    }

    async get(path: Path): Promise<JSONEncodable | null> {
        const stringValue = await this.base.get(this.pathScheme.encode(path));

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
            this.pathScheme.encode(path),
            JSON.stringify(obj)
        );
    }

    async delete(path: Path): Promise<void> {
        await this.base.delete(this.pathScheme.encode(path));
    }

    /**
     * return keys of kv pairs under a path (only the last path component is returned)
     */
    async list(prefix: Path): Promise<Path[]> {
        const keys = await this.base.list(this.pathScheme.encode(prefix));

        return keys.map(this.pathScheme.decode.bind(this.pathScheme));
    }
}
