import { WorkerKVStore } from "./kv";
import { Database, Configuration, Collection } from "./database";
import { AdminConfig, Post } from "./models";

const kv = new WorkerKVStore(TEST_KV);
const db = new Database(kv);
const adminConfig = new AdminConfig(db, "admin config");
const postCollection = new Collection(db, "posts", Post);

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request) {
    return new Response(
        "pass hash: " + (await adminConfig.checkPasscode("secret")),
        {
            headers: { "content-type": "text/plain" },
        }
    );
}
