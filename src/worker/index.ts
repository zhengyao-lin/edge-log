import { URIPathEncoding } from "../framework/storage/path";
import { EdgeLog } from "./models";

import { WorkerStringKVStore, WorkerStreamKVStore } from "./worker";
import {
    Application,
    HTTPResponse,
    HTTPRequest,
} from "../framework/router/application";
import { JSONEncoding } from "../framework/storage/encoding";
import { EncodedStore, KeyEncodedStore } from "../framework/storage/kv";
import { Directory } from "../framework/storage/containers/directory";

import { KVNamespace } from "@cloudflare/workers-types";

import { apiSchema } from "./schema";

import { sign as jwtSign, verify as jwtVerify } from "jsonwebtoken";

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

const blog = new EdgeLog(
    new Directory(
        new EncodedStore(
            new WorkerStringKVStore(TEST_KV),
            new URIPathEncoding(),
            new JSONEncoding()
        ),
        []
    )
);

const schema = apiSchema(blog);

class MainApplication extends Application {
    @Application.get("/auth")
    async handleAuthentication(request: HTTPRequest): Promise<HTTPResponse> {
        const auth = request.getAuthorization();

        if (auth === null || !("basic" in auth)) {
            return this.handleUnauthorized(request, "basic");
        }

        const [_, passcode] = auth.basic;

        if (!(await blog.siteConfig.checkPasscode(passcode))) {
            return this.handleUnauthorized(request, "basic");
        }

        const token = jwtSign({}, "", {
            expiresIn: 60 * 10,
        });

        return { text: token };
    }

    @Application.options("/api")
    @Application.allowCORS("*", ["*"], ["*"])
    async handleOptionsGraphQL(request: HTTPRequest): Promise<HTTPResponse> {
        return { status: 204 };
    }

    @Application.get("/api")
    @Application.post("/api")
    @Application.allowCORS("*", ["*"], ["*"])
    async handleGraphQL(request: HTTPRequest): Promise<HTTPResponse> {
        return await this.handleGraphQLRequest(schema, request);
    }

    /**
     * Endpoint for serving static files/resources
     */
    @Application.get("/static/(.*)")
    async handleStatic(
        request: HTTPRequest,
        filePath: string
    ): Promise<HTTPResponse> {
        const path = filePath.split("/");
        const stream = await fileStore.get(path);

        if (stream === null) {
            return await this.handleNotFound(request);
        }

        return {
            stream,
            headers: {
                "content-type": Application.inferContentType(filePath),
            },
        };
    }

    @Application.get("/version")
    async handleVersion(request: HTTPRequest): Promise<HTTPResponse> {
        return { json: { version: "0.0.1" } };
    }
}

const app = new MainApplication();

addEventListener("fetch", event => {
    event.respondWith(app.handleRequest(event.request));
});
