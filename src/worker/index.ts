import { PathJSONStore } from "./storage/path";
import { EdgeLog } from "./core/blog";

import { WorkerStringKVStore } from "./worker";
import { Application, HTTPResponse, HTTPRequest } from "./application";

const kv = new WorkerStringKVStore(TEST_KV);
const db = new PathJSONStore(kv);
const blog = new EdgeLog(db);

class MainApplication extends Application {
    @Application.get("/version")
    async handleVersion(): Promise<HTTPResponse> {
        return { json: { version: "0.0.1" } };
    }
}

const app = new MainApplication();

addEventListener("fetch", event => {
    event.respondWith(app.handleRequest(event.request));
});
