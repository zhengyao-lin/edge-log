import uuid from "uuid";

export function sameType<A, B>(): boolean {
    return typeof ({} as A) === typeof ({} as B);
}

export function assert(condition: boolean, msg: string = "unknown error") {
    if (!condition) {
        throw Error(`assertion failed: ${msg}`);
    }
}

export function uuid4(): string {
    return uuid.v4();
}
