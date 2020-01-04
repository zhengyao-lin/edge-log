import { URIPathEncoding } from "./storage/path";
import { EdgeLog } from "./models";

import { WorkerStringKVStore, WorkerStreamKVStore } from "./worker";
import { Application, HTTPResponse } from "./application";
import { JSONEncoding } from "./storage/encoding";
import { EncodedStore, KeyEncodedStore } from "./storage/kv";
import { Directory } from "./storage/containers/directory";

import { KVNamespace } from "@cloudflare/workers-types";

declare global {
    const TEST_KV: KVNamespace;
}

const fileStore = new Directory(
    new KeyEncodedStore(
        new WorkerStreamKVStore(TEST_KV),
        new URIPathEncoding()
    ),
    ["static"]
);

const store = new EncodedStore(
    new WorkerStringKVStore(TEST_KV),
    new URIPathEncoding(),
    new JSONEncoding()
);

const blog = new EdgeLog(new Directory(store, []));

class MainApplication extends Application {
    /**
     * Endpoint for serving static files/resources
     */
    @Application.get("/static/(.*)")
    async handleStatic(
        request: Request,
        filePath: string
    ): Promise<HTTPResponse> {
        const path = filePath.split("/");
        const stream = await fileStore.get(path);

        if (stream === null) {
            return { status: 404, text: "no such file" };
        }

        return {
            stream,
            headers: {
                "content-type": Application.inferContentType(filePath),
            },
        };
    }

    @Application.get("/version")
    async handleVersion(): Promise<HTTPResponse> {
        return { json: { version: "0.0.1" } };
    }
}

const app = new MainApplication();

addEventListener("fetch", event => {
    event.respondWith(app.handleRequest(event.request));
});
