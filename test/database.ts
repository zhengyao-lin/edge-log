import { expect } from "chai";

import { Path, Database, SeparatorPathScheme } from "../src/database";
import { MemoryStringKVStore } from "../src/kv";

describe("separator path scheme", () => {
    it("is bijective", () => {
        const pathScheme = new SeparatorPathScheme();
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

describe("database basics", () => {
    it("set/get/list values correctly", async () => {
        const db = new Database(new MemoryStringKVStore());

        await db.setJSON(["this", "is", "a", "path"], { a: 1, b: 2 });
        await db.setJSON(["this", "is", "2nd", "path"], { a: 1, b: 3 });
        await db.setJSON(["this", "is not", "a", "path"], { a: 1, b: 4 });

        expect(await db.getJSON(["this", "is", "2nd", "path"])).eql({
            a: 1,
            b: 3,
        });
        expect(await db.getJSON(["this", "is", "eee"])).equals(null);
        expect(await db.list(["this", "is", "a"])).members(["path"]);
    });
});
