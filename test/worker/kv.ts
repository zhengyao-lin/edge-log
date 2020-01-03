import { expect } from "chai";
import {
    MemoryStringKVStore,
    KVStore,
    EncodedStore,
} from "../../src/worker/storage/kv";
import { JSONEncodable, JSONEncoding } from "../../src/worker/storage/encoding";
import { Path, URIPathEncoding } from "../../src/worker/storage/path";

export function newPathJSONStore(): KVStore<Path, JSONEncodable> {
    return new EncodedStore(
        new MemoryStringKVStore(),
        new URIPathEncoding(),
        new JSONEncoding()
    );
}

describe("kv basics", () => {
    it("get/set values correctly", async () => {
        const kv: KVStore<string, number> = new MemoryStringKVStore();

        await kv.set("key1", 20);
        await kv.set("key2", 10);

        expect(await kv.get("key1")).equals(20);
        expect(await kv.get("key2")).equals(10);
        expect(await kv.get("key3")).equals(null);

        await kv.set("key2", 50);
        expect(await kv.get("key2")).equals(50);
    });

    it("list keys correctly", async () => {
        const kv: KVStore<string, string> = new MemoryStringKVStore();

        await kv.set("prefix1-key1", "hi");
        await kv.set("prefix2-key2", "ya");

        expect(await kv.list("")).members(["prefix1-key1", "prefix2-key2"]);
        expect(await kv.list("prefix")).members([
            "prefix1-key1",
            "prefix2-key2",
        ]);
        expect(await kv.list("prefix1")).members(["prefix1-key1"]);
        expect(await kv.list("no such")).members([]);
    });
});
