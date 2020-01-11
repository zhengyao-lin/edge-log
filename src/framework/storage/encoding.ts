import { assert } from "../../common";
import { toByteArray, fromByteArray } from "base64-js";

/**
 * An encoding is a pair of functions (encode, decode) where
 * encode is injective and decode is a (possibly) partial function
 */
export interface Encoding<S, T> {
    encode(s: S): T;
    decode(t: T): S | null;
}

/**
 * Same as encoding but with the additional property:
 * for all a: S, b: S,
 * a is a prefix of b <=> encode(a) is a prefix of encode(b)
 */
export type PrefixableEncoding<S, T> = Encoding<S, T>;

/**
 * A trivial id encoding
 */
export class IdentityEncoding<S> implements Encoding<S, S> {
    encode(s: S): S {
        return s;
    }

    decode(t: S): S | null {
        return t;
    }
}

export type JSONEncodable =
    | null
    | string
    | number
    | boolean
    | { [key: string]: JSONEncodable }
    | JSONEncodable[];

export class JSONEncoding implements Encoding<JSONEncodable, string> {
    encode(obj: JSONEncodable): string {
        return JSON.stringify(obj);
    }

    decode(str: string): JSONEncodable | null {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    }
}

/**
 * An encoding from string to string with a smaller character set
 */
export class BaseReductionEncoding implements Encoding<string, string> {
    private separator: number;
    private escapeChars: number[];

    constructor(separator: string) {
        assert(
            separator.length == 1,
            `separator "${separator}" is not a character`
        );

        this.separator = separator.charCodeAt(0) % 256;
        this.escapeChars = [
            (this.separator + 1) % 256,
            (this.separator + 2) % 256,
        ];
    }

    encode(str: string): string {
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
    decode(str: string): string {
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
 * Compatible to both node and browser
 */
export class UTF8Encoding implements Encoding<string, Uint8Array> {
    encode(str: string): Uint8Array {
        if (typeof window === "undefined") {
            return Buffer.from(str, "utf-8");
        } else {
            return new TextEncoder().encode(str);
        }
    }

    decode(encoded: Uint8Array): string | null {
        try {
            if (typeof window === "undefined") {
                return Buffer.from(encoded).toString("utf-8");
            } else {
                return new TextDecoder().decode(encoded);
            }
        } catch (e) {
            return null;
        }
    }
}

export class Base64Encoding implements Encoding<string, string> {
    constructor(private stringEncoding = new UTF8Encoding()) {}

    encode(str: string): string {
        if (typeof window === "undefined") {
            return fromByteArray(this.stringEncoding.encode(str));
        } else {
            return btoa(str);
        }
    }

    decode(encoded: string): string | null {
        try {
            if (typeof window === "undefined") {
                return this.stringEncoding.decode(toByteArray(encoded));
            } else {
                return atob(encoded);
            }
        } catch (e) {
            return null;
        }
    }
}
