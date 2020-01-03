import { BaseReductionEncoding, PrefixableEncoding } from "./encoding";

/**
 * There are two types of path prefixes in the project:
 * - Strong prefix
 *   for any path a, b, a is a strong prefix of b if
 *   - len(a) <= len(b)
 *   - a == b[0:len(b)] element-wise
 *
 * - Weak prefix
 *   for any path a, b, a is a weak prefix of b if either
 *   - a is [] or
 *   - a[0:-1] is a strong prefix of b and a[-1] is a prefix of b[-1]
 */

export type Path = string[];

export function isStrongPrefixOf(a: Path, b: Path): boolean {
    if (a.length > b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export function isWeakPrefixOf(a: Path, b: Path): boolean {
    if (a.length > b.length) return false;

    for (let i = 0; i < a.length - 1; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return a.length == 0 || b[a.length - 1].startsWith(a[a.length - 1]);
}

export class URIPathEncoding implements PrefixableEncoding<Path, string> {
    constructor() {}

    encode(path: Path): string {
        return path.map(encodeURIComponent).join("/");
    }

    decode(key: string): Path | null {
        return key.split("/").map(decodeURIComponent);
    }
}

export class SeparatorPathEncoding implements PrefixableEncoding<Path, string> {
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
