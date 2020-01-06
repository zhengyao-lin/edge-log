import {
    KeyProperty,
    Collection,
    Cursor,
} from "../framework/storage/containers/collection";
import { Configuration } from "../framework/storage/containers/configuration";
import BLAKE2s from "blake2s-js";
import { uuid4 } from "../framework/utils";
import { Directory } from "../framework/storage/containers/directory";
import { JSONEncodable } from "../framework/storage/encoding";

/**
 * Models for a single-admin blogging platform
 * There are three main collections:
 *   1. admin config
 *   2. post collection
 */

type SiteConfigObject = {
    headline: string;
    passcodeHash: string;
};

/**
 * SiteConfig contains info about info about the administrator,
 * including passcode
 */
export class SiteConfig extends Configuration<SiteConfigObject> {
    static DEFAULT_HEADLINE = "(untitled)";
    static DEFAULT_PASSWORD = "";
    static DEFAULT_KEY = new Uint8Array([
        101,
        100,
        103,
        101,
        45,
        108,
        111,
        103,
    ]); // "edge-log"
    static DEFAULT_OUTLEN = 32;

    async setPasscode(plain: string) {
        await this.set("passcodeHash", SiteConfig.hash(plain));
    }

    async checkPasscode(plain: string): Promise<boolean> {
        return SiteConfig.hash(plain) == (await this.get("passcodeHash"));
    }

    async getHeadline(): Promise<string> {
        return await this.get("headline");
    }

    async setHeadline(headline: string): Promise<void> {
        return await this.set("headline", headline);
    }

    static hash(msg: string): string {
        const h = new BLAKE2s(
            SiteConfig.DEFAULT_OUTLEN,
            SiteConfig.DEFAULT_KEY
        );
        h.update(new TextEncoder().encode(msg));
        return h.hexDigest();
    }

    protected default() {
        return {
            headline: SiteConfig.DEFAULT_HEADLINE,
            passcodeHash: SiteConfig.hash(SiteConfig.DEFAULT_PASSWORD),
        };
    }
}

export class Post {
    @KeyProperty.unique(Post)
    public id: string;

    public title: string = "";
    public content: string = "";

    @KeyProperty.primary(Post)
    public timeOfCreation: number; // number of milliseconds since the Unix Epoch
    public timeOfLastEdit: number;

    constructor(config: Partial<Post>) {
        this.timeOfCreation = new Date().getTime();
        this.timeOfLastEdit = new Date().getTime();

        this.id = uuid4();

        Object.assign(this, config);
    }
}

export class EdgeLog {
    static PATH_ADMIN_CONFIG = ["config", "admin"];
    static PATH_POST_COLLECTION = ["posts"];
    static PATH_SESSION_COLLECTION = ["sessions"];

    public siteConfig: SiteConfig;
    public postCollection: Collection<Post>;

    constructor(private base: Directory<JSONEncodable>) {
        this.base = base;

        this.siteConfig = new SiteConfig(base.enter(EdgeLog.PATH_ADMIN_CONFIG));

        this.postCollection = new Collection(
            base.enter(EdgeLog.PATH_POST_COLLECTION),
            Post
        );
    }

    async addPost(post: Post) {
        await this.postCollection.add(post);
    }

    async editPost(post: Post) {
        await this.postCollection.setByUniqueKey("id", post.id, post);
    }

    async getPost(id: string): Promise<Post | null> {
        return await this.postCollection.getByUniqueKey("id", id);
    }

    /**
     * Get all posts in reverse order of creation
     */
    async listPost(): Promise<Cursor<Post>> {
        return await this.postCollection.query(
            [{}],
            "timeOfCreation",
            (a, b) => {
                return b - a;
            }
        );
    }
}
