import { KVStore, ValueEncodedStore, KeyEncodedStore } from "./kv";
import {
    Encoding,
    BaseReductionEncoding,
    JSONEncodable,
    JSONEncoding,
} from "./encoding";

export type Path = string[];

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

export class PathValueStore<V> extends KeyEncodedStore<Path, string, V> {
    constructor(
        base: KVStore<string, V>,
        encoding: PathEncoding = new URIPathEncoding()
    ) {
        super(base, encoding);
    }
}

/**
 * A "path"-indexed kv store for storing JSON encoded objects
 */
export class PathJSONStore extends KeyEncodedStore<
    Path,
    string,
    JSONEncodable
> {
    constructor(
        base: KVStore<string, string>,
        encoding: PathEncoding = new URIPathEncoding()
    ) {
        super(new ValueEncodedStore(base, new JSONEncoding()), encoding);
    }
}
