import { URIPathEncoding } from "./storage/path";
import { EdgeLog, Post } from "./models";

import { WorkerStringKVStore, WorkerStreamKVStore } from "./worker";
import { Application, HTTPResponse, HTTPRequest, CookieJar } from "./application";
import { JSONEncoding } from "./storage/encoding";
import { EncodedStore, KeyEncodedStore } from "./storage/kv";
import { Directory } from "./storage/containers/directory";

import { KVNamespace } from "@cloudflare/workers-types";
import { validate, keyof } from "./utils";

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
    async authenticated(request: HTTPRequest, callback: () => Promise<HTTPResponse>): Promise<HTTPResponse> {
        const sessionID = request.cookie["session-id"];

        if (sessionID === undefined || await blog.checkSession(sessionID) === null) {
            return { status: 401, text: "unauthorized" };
        }

        return await callback();
    }

    @Application.post("/api/login")
    async handleLogin(request: HTTPRequest): Promise<HTTPResponse> {
        const cred = validate(await request.json(), {
            type: "object",
            properties: {
                passcode: { type: "string" },
            },
            required: ["passcode"],
            additionalItems: false
        });

        if (cred === null) {
            return { status: 400, text: "bad request" };
        }

        const session = await blog.login(cred.passcode);

        if (session === null) {
            return { status: 401, text: "unauthorized" };
        }

        return {
            headers: {
                "set-cookie": new CookieJar(`session-id=${session.id}`),
            },
            text: "",
        };
    }

    /**
     * API endpoints:
     * 1. get posts (paging)
     * 2. add post
     * 3. edit post
     */
    @Application.post("/api/post")
    @Application.put("/api/post/([0-9-a-f]+)")
    async handleNewPost(request: HTTPRequest, id?: string): Promise<HTTPResponse> {
        return this.authenticated(request, async () => {
            const config = validate(await request.json(), {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                },
                required: keyof({ "title": true, "content": true }),
                additionalItems: false
            });

            if (config === null) {
                return { status: 400, text: "bad request" };
            }

            if (id === undefined) {
                const post = new Post(config);
                await blog.addPost(post);

                return { json: post };
            } else {
                const post = await blog.getPost(id);

                if (post === null) {
                    return { status: 404, text: "no such post" };
                }

                Object.assign(post, config);
                await blog.editPost(post);

                return { json: post };
            }
        });
    }

    @Application.get("/api/post/([0-9-a-f]+)")
    async handleGetPost(request: HTTPRequest, id: string): Promise<HTTPResponse> {
        const post = await blog.getPost(id);

        if (post === null) {
            return { status: 404, text: "no such post" };
        }

        return { json: post };
    }

    @Application.get("/api/post")
    async handleListPost(request: HTTPRequest): Promise<HTTPResponse> {
        let skip = parseInt(request.query.get("skip") || "0");
        if (isNaN(skip) || skip < 0) skip = 0;

        let limit = parseInt(request.query.get("limit") || "6");
        if (isNaN(limit) || limit > 6) limit = 6;

        return {
            json: await (await blog.listPost()).skip(skip).take(limit).getAll()
        };
    }

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
