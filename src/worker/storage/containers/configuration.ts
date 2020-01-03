import { JSONEncodable } from "../encoding";
import { Directory } from "./directory";

/**
 * Configuration is a cached single object
 * that can be used to access individual fields
 *
 * Requires a path-JSON store
 */
export abstract class Configuration<T extends JSONEncodable> {
    private config: T | null = null;

    constructor(private base: Directory<JSONEncodable>) {}

    protected abstract default(): T;

    async set<K extends keyof T>(key: K, value: T[K]) {
        await this.fetch();
        (this.config as T)[key] = value;
        await this.sync();
    }

    async get<K extends keyof T>(key: K): Promise<T[K]> {
        await this.fetch();
        return (this.config as T)[key];
    }

    /**
     * Syncrhonize changes
     */
    private async sync() {
        if (this.config !== null) {
            await this.base.set([], this.config);
        } // if the config is null, we must have not changed it
    }

    private async fetch() {
        if (this.config === null) {
            this.config = this.default();

            const upstream = await this.base.get([]);

            // upstream config exists
            if (upstream !== null) {
                Object.assign(this.config, upstream);
            }
        }
    }
}
