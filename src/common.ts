export function assert(
    condition: boolean,
    msg: string = "unknown error"
): asserts condition {
    if (!condition) {
        throw Error(`assertion failed: ${msg}`);
    }
}
