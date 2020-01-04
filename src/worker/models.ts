import { KeyProperty, Collection } from "./storage/containers/collection";
import { Configuration } from "./storage/containers/configuration";
import BLAKE2s from "blake2s-js";
import { uuid4 } from "./utils";
import { Directory } from "./storage/containers/directory";
import { JSONEncodable } from "./storage/encoding";

/**
 * Models for a single-admin blogging platform
 * There are three main collections:
 *   1. admin config
 *   2. post collection
 */

type AdminConfigObject = {
    passcodeHash: string;
};

/**
 * AdminConfig contains info about info about the administrator,
 * including passcode
 */
export class AdminConfig extends Configuration<AdminConfigObject> {
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
        await this.set("passcodeHash", AdminConfig.hash(plain));
    }

    async checkPasscode(plain: string): Promise<boolean> {
        return AdminConfig.hash(plain) == (await this.get("passcodeHash"));
    }

    static hash(msg: string): string {
        const h = new BLAKE2s(
            AdminConfig.DEFAULT_OUTLEN,
            AdminConfig.DEFAULT_KEY
        );
        h.update(new TextEncoder().encode(msg));
        return h.hexDigest();
    }

    protected default() {
        return {
            passcodeHash: AdminConfig.hash(AdminConfig.DEFAULT_PASSWORD),
        };
    }
}

/**
 * Class representing a (blog) post
 */
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

export class Session {
    @KeyProperty.unique(Session)
    public id: string;

    @KeyProperty.primary(Session)
    private timeOfCreation: number;

    constructor(config: Partial<Session> = {}) {
        this.id = uuid4();
        this.timeOfCreation = new Date().getTime();

        Object.assign(this, config);
    }

    getTimeOfCreation(): Date {
        return new Date(this.timeOfCreation);
    }
}

export class EdgeLog {
    static PATH_ADMIN_CONFIG = ["config", "admin"];
    static PATH_POST_COLLECTION = ["posts"];
    static PATH_SESSION_COLLECTION = ["sessions"];

    private adminConfig: AdminConfig;
    private postCollection: Collection<Post>;
    private sessionCollection: Collection<Session>;

    constructor(private base: Directory<JSONEncodable>) {
        this.base = base;

        this.adminConfig = new AdminConfig(
            base.enter(EdgeLog.PATH_ADMIN_CONFIG)
        );

        this.postCollection = new Collection(
            base.enter(EdgeLog.PATH_POST_COLLECTION),
            Post
        );

        this.sessionCollection = new Collection(
            base.enter(EdgeLog.PATH_SESSION_COLLECTION),
            Session
        );
    }

    /**
     * Checks the given passcode and returns a new session if it's correct
     * Otherwise returns null
     */
    async login(passcode: string): Promise<Session | null> {
        if (await this.adminConfig.checkPasscode(passcode)) {
            const session = new Session();
            await this.sessionCollection.add(session);
            return session;
        }

        return null;
    }

    async checkSession(id: string): Promise<Session | null> {
        return await this.sessionCollection.getByUniqueKey("id", id);
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
}
