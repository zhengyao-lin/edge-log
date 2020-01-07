import { expect } from "chai";
import {
    KeyProperty,
    Collection,
} from "../../src/framework/storage/containers/collection";
import { newPathJSONStore } from "./kv";
import { Directory } from "../../src/framework/storage/containers/directory";

class People {
    @KeyProperty.unique(People)
    public id: number = 0;

    @KeyProperty.primary(People)
    public name: string = "";

    public age: number = 0;

    constructor(config: Partial<People>) {
        Object.assign(this, config);
    }

    // to check that dummy would not be included
    dummy(): string {
        return "hi";
    }
}

describe("collection basics", () => {
    function compareID(a: any, b: any) {
        return (a.id as number) - (b.id as number);
    }

    it("stores simple objects correctly", async () => {
        const store = newPathJSONStore();
        const collection1 = new Collection(
            new Directory(store, ["people", "a"]),
            People
        );
        const collection2 = new Collection(
            new Directory(store, ["people", "a", "b"]),
            People
        );

        expect(await collection1.getAllPrimaryKeys()).members([]);
        expect(await collection2.getAllPrimaryKeys()).members([]);

        const pep1 = new People({
            id: 1,
            name: "zhengyao",
            age: 20,
        });

        const pep2 = new People({
            id: 2,
            name: "eric",
            age: 21,
        });

        const pep3 = new People({
            id: 1,
            name: "rohin",
            age: 22,
        });

        await collection1.add(pep1);
        await collection1.add(pep2);
        await collection2.add(pep3);

        let keys = (await collection1.getAllPrimaryKeys()).sort(compareID);

        expect(keys).eql([
            { id: 1, name: "zhengyao" },
            { id: 2, name: "eric" },
        ]);

        expect(await collection1.deleteByUniqueKey("id", 3)).equals(false);

        expect(await collection1.getByUniqueKey("id", 1)).eql({
            id: 1,
            name: "zhengyao",
            age: 20,
        });

        expect(await collection1.getByUniqueKey("id", 2)).eql({
            id: 2,
            name: "eric",
            age: 21,
        });

        expect(await collection2.getByUniqueKey("id", 1)).eql({
            id: 1,
            name: "rohin",
            age: 22,
        });

        expect(await collection1.getByUniqueKey("id", 3)).to.be.null;

        expect(await collection1.deleteByUniqueKey("id", 2)).equals(true);
        expect(await collection1.getByUniqueKey("id", 2)).to.be.null;
    });

    it("queries items correctly", async () => {
        const store = newPathJSONStore();
        const collection = new Collection(
            new Directory(store, ["people", "a"]),
            People
        );

        const pep1 = new People({
            id: 1,
            name: "zhengyao",
            age: 20,
        });

        const pep2 = new People({
            id: 2,
            name: "eric",
            age: 21,
        });

        const pep3 = new People({
            id: 3,
            name: "rohin",
            age: 22,
        });

        await collection.add(pep1);
        await collection.add(pep2);
        await collection.add(pep3);

        let peps = await (await collection.query([{}])).readAll();
        peps.sort(compareID);

        expect(peps).eql([pep1, pep2, pep3]);

        peps = await (
            await collection.query([
                {
                    name: /e/,
                },
            ])
        ).readAll();
        peps.sort(compareID);

        expect(peps).eql([pep1, pep2]);

        peps = await (
            await collection.query([
                {
                    id: {
                        lt: 2,
                    },
                },
                {
                    id: {
                        gt: 2,
                    },
                },
            ])
        ).readAll();
        peps.sort(compareID);

        expect(peps).eql([pep1, pep3]);
    });
});
