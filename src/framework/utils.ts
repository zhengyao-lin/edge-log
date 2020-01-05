import uuid from "uuid";

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
