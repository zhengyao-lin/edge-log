import { WorkerKVStore } from "./kv";
import { Database, Collection } from "./database";
import { AdminConfig, Post } from "./models";

const kv = new WorkerKVStore(TEST_KV);
const db = new Database(kv);
const adminConfig = new AdminConfig(db, "admin config");
const postCollection = new Collection(db, "posts", Post);

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request) {
    await postCollection.set("www", new Post({ title: "wow" }));

    const response = `\
correct password: ${await adminConfig.checkPasscode("secret")}
posts: [${(await postCollection.list("")).join(", ")}]
`;

    return new Response(
        response,
        {
            headers: { "content-type": "text/plain" },
        }
    );
}
