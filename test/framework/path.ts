import { expect } from "chai";
import {
    isStrongPrefixOf,
    isWeakPrefixOf,
} from "../../src/framework/storage/path";

describe("strong prefix", () => {
    it("is reflexive", () => {
        expect(isStrongPrefixOf([], [])).to.be.true;
        expect(isStrongPrefixOf(["a"], ["a"])).to.be.true;
        expect(isStrongPrefixOf(["a", "b"], ["a", "b"])).to.be.true;
    });

    it("satisfies the definition", () => {
        expect(isStrongPrefixOf(["a"], ["a", "b"])).to.be.true;
        expect(isStrongPrefixOf([], ["a", "bab"])).to.be.true;
        expect(isStrongPrefixOf(["a", "bab"], ["a", "bab", "c"])).to.be.true;

        expect(isStrongPrefixOf(["a", "b"], ["a", "bab"])).to.be.false;
        expect(isStrongPrefixOf(["a", "bab", "c"], ["a", "bab"])).to.be.false;
        expect(isStrongPrefixOf(["a", "bab", "c"], [])).to.be.false;
    });
});

describe("weak prefix", () => {
    it("is reflexive", () => {
        expect(isWeakPrefixOf([], [])).to.be.true;
        expect(isWeakPrefixOf(["a"], ["a"])).to.be.true;
        expect(isWeakPrefixOf(["a", "b"], ["a", "b"])).to.be.true;
    });

    it("satisfies the definition", () => {
        expect(isWeakPrefixOf(["a"], ["a", "b"])).to.be.true;
        expect(isWeakPrefixOf(["a", "b"], ["a", "bab"])).to.be.true;
        expect(isWeakPrefixOf(["a", ""], ["a", "bab"])).to.be.true;
        expect(isWeakPrefixOf([], ["a", "bab"])).to.be.true;
        expect(isWeakPrefixOf(["a", "bab"], ["a", "bab", "c"])).to.be.true;

        expect(isWeakPrefixOf(["a", "c"], ["a", "bab"])).to.be.false;
        expect(isWeakPrefixOf(["a", "bab", "c"], ["a", "bab"])).to.be.false;
        expect(isWeakPrefixOf(["a", "bab", "c"], [])).to.be.false;
    });
});
