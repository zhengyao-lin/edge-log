import uuid from "uuid";
import { fromByteArray } from "base64-js";

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

export function base64Decode(encoded: string): string | null {
    try {
        return fromByteArray(new TextEncoder().encode(encoded));
    } catch (e) {
        return null;
    }
}
