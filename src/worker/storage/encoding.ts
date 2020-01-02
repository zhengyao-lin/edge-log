import { assert } from "../utils";

/**
 * An encoding is a pair of functions (encode, decode) where
 * encode is injective and decode is a (possibly) partial function
 */
export interface Encoding<S, T> {
    encode(s: S): T;
    decode(t: T): S | null;
}

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
