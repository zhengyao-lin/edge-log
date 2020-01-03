import { URIPathEncoding } from "./storage/path";
import { EdgeLog } from "./core/blog";

import { WorkerStringKVStore } from "./worker";
import { Application, HTTPResponse } from "./application";
import { JSONEncoding } from "./storage/encoding";
import { EncodedStore } from "./storage/kv";
import { Directory } from "./storage/containers/directory";

const store = new EncodedStore(
    new WorkerStringKVStore(TEST_KV),
    new URIPathEncoding(),
    new JSONEncoding()
);
const blog = new EdgeLog(new Directory(store, []));

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
