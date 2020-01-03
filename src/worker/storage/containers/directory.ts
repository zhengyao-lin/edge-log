import { KVStore } from "../kv";
import { Path } from "../path";

export class Directory<V> {
    constructor(private base: KVStore<Path, V>, private basePath: Path) {}

    async get(path: Path): Promise<V | null> {
        return await this.base.get(this.basePath.concat(path));
    }

    async set(path: Path, value: V): Promise<void> {
        await this.base.set(this.basePath.concat(path), value);
    }

    async delete(path: Path): Promise<void> {
        await this.base.delete(this.basePath.concat(path));
    }

    /**
     * Lists all paths p such that
     * - p.length > basePath.length
     * - basePath is a strong prefix of p
     * - `prefix` is a weak prefix of p
     */
    async listWeakPrefix(prefix: Path): Promise<Path[]> {
        return (
            await this.base.list(
                prefix.length == 0
                    ? // when prefix is [], our definition of path prefix would allow paths that
                      // have the same length as the base path but different last component
                      this.basePath.concat("")
                    : this.basePath.concat(prefix)
            )
        ).map(path => path.slice(this.basePath.length));
    }

    /**
     * Same condition as above except that `prefix`
     * has to be a strong prefix of any returned path
     */
    async listStrongPrefix(prefix: Path): Promise<Path[]> {
        return (
            await this.base.list(this.basePath.concat(prefix, ""))
        ).map(path => path.slice(this.basePath.length));
    }

    enter(path: Path): Directory<V> {
        return new Directory(this.base, this.basePath.concat(path));
    }
}
