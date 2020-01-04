import uuid from "uuid";
import { validate as validateJSON, JSONSchema4 } from "json-schema";

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
 * type-level function to extract
 * the object type from a schema
 */
export type SchemaToType<S> = S extends {
    type: "object";
    properties: infer P;
    required?: (infer R)[];
}
    ? {
          [K in keyof P]?: SchemaToType<P[K]>;
      } & {
          [K in keyof P & R]: SchemaToType<P[K]>;
      }
    : S extends {
          type: "array";
      }
    ? S extends { items: infer E }
        ? SchemaToType<E>[]
        : any[]
    : S extends {
          type: "number";
      }
    ? number
    : S extends {
          type: "string";
      }
    ? string
    : // cannot infer anything from the schema
      any;

export function validate<S extends JSONSchema4>(
    instance: any,
    schema: S
): SchemaToType<S> | null {
    if (validateJSON(instance, schema).valid) {
        return instance;
    }

    return null;
}

export function keyof<P>(obj: P): (keyof P)[] {
    const keys: (keyof P)[] = [];

    for (const key in obj) {
        keys.push(key);
    }

    return keys;
}
