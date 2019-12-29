import { PathJSONStore } from "../storage/path";
import { Collection, PartialRecord, PrimaryKey } from "../storage/container";
import { AdminConfig, Post } from "./models";
import { uuid4 } from "../utils";

export class Session {
    static SCHEMA = {
        id: PrimaryKey.Default
    };

    public id: string;
    private timeOfCreation: number;

    constructor(config: PartialRecord<Session> = {}) {
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

    private db: PathJSONStore;
    private adminConfig: AdminConfig;
    private postCollection: Collection<Post>;
    private sessionCollection: Collection<Session>;

    constructor(db: PathJSONStore) {
        this.db = db;

        this.adminConfig = new AdminConfig(db, EdgeLog.PATH_ADMIN_CONFIG);
        this.postCollection = new Collection(
            db,
            EdgeLog.PATH_POST_COLLECTION,
            Post
        );
        this.sessionCollection = new Collection(
            db,
            EdgeLog.PATH_SESSION_COLLECTION,
            Session
        );
    }

    /**
     * Interfaces
     * 1. login related
     *   - check password/login
     *   - session/authorization management
     * 2. posts
     *   - create/edit posts
     */

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

    // async getSession(sessionID: string): Promise<Session | null> {
    //     return await this.sessionCollection.get(sessionID);
    // }

    // /**
    //  * Sort post ids by creation time
    //  */
    // async getSortedPostIDs(): Promise<string[]> {
    //     const ids = await this.postCollection.list();

    //     ids.sort((a, b) => {
    //         const [t1] = a.split("-");
    //         const [t2] = b.split("-");
    //         return parseInt(t2) - parseInt(t1);
    //     });

    //     return ids;
    // }

    // async getPosts(ids: string[]): Promise<Post[]> {
    //     const posts: Post[] = [];

    //     for (const id of ids) {
    //         const post = await this.postCollection.get(id);

    //         if (post != null) {
    //             posts.push();
    //         }
    //     }

    //     return posts;
    // }

    // async createPost(post: Post): Promise<void> {
    //     await this.postCollection.set(post.id, post);
    // }
}
