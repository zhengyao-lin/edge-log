import { Configuration, Database, PartialRecord } from "./database";
import BLAKE2s from "blake2s-js";

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
    public id: number = 0;
    public title: string = "(untitled)";
    public content: string = "";

    public timeOfCreation: number; // number of milliseconds since the Unix Epoch
    public timeOfLastEdit: number;

    constructor(config: PartialRecord<Post>) {
        this.timeOfCreation = new Date().getTime();
        this.timeOfLastEdit = new Date().getTime();

        Object.assign(this, config);
    }
}
