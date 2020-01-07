import uuid from "uuid";
import { toByteArray, fromByteArray } from "base64-js";
import { Encoding } from "./storage/encoding";

export function assert(
    condition: boolean,
    msg: string = "unknown error"
): asserts condition {
    if (!condition) {
        throw Error(`assertion failed: ${msg}`);
    }
}

export function uuid4(): string {
    return uuid.v4();
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
