import { expect } from "chai";

import { Path, SeparatorPathEncoding } from "../../src/worker/storage/path";
import { newPathJSONStore } from "./kv";

describe("separator path scheme", () => {
    it("is bijective", () => {
        const pathScheme = new SeparatorPathEncoding();
        const cases: [Path, string][] = [
            [["1\x002"], "1\x01\x022"],
            [["1", "2"], "1\x002"],
            [["1\x00\x00\x012\x022"], "1\x01\x02\x01\x02\x01\x012\x02\x022"],
        ];

        for (const [original, encoded] of cases) {
            expect(pathScheme.encode(original)).eql(encoded);
            expect(pathScheme.decode(encoded)).eql(original);
        }
    });
});

describe("PathJSONStore basics", () => {
    it("set/get/list values correctly", async () => {
        const store = newPathJSONStore();

        await store.set(["this", "is", "a", "path"], { a: 1, b: 2 });
        await store.set(["this", "is", "2nd", "path"], { a: 1, b: 3 });
        await store.set(["this", "is not", "a", "path"], { a: 1, b: 4 });

        expect(await store.get(["this", "is", "2nd", "path"])).eql({
            a: 1,
            b: 3,
        });
        expect(await store.get(["this", "is", "eee"])).equals(null);
        expect(await store.list(["this", "is", "a"])).eql([
            ["this", "is", "a", "path"],
        ]);
    });
});
