import { Path } from "../storage/path";
import { Collection, KeyProperty } from "../storage/containers/collection";
import { AdminConfig, Post } from "./models";
import { uuid4 } from "../utils";
import { KVStore } from "../storage/kv";
import { JSONEncodable } from "../storage/encoding";
import { Directory } from "../storage/containers/directory";

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

        this.adminConfig = new AdminConfig(base.enter(EdgeLog.PATH_ADMIN_CONFIG));

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

    async addPost(post: Post): Promise<void> {
        await this.postCollection.add(post);
    }

    async editPost(post: Post): Promise<void> {
        await this.postCollection.setByUniqueKey("id", post.id, post);
    }

    async getPost(id: string): Promise<Post | null> {
        return await this.postCollection.getByUniqueKey("id", id);
    }
}
