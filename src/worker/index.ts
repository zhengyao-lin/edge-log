import { URIPathEncoding } from "../framework/storage/path";
import { EdgeLog, Post } from "./models";

import { WorkerStringKVStore, WorkerStreamKVStore } from "./worker";
import {
    Application,
    HTTPResponse,
    HTTPRequest,
    CookieJar,
} from "../framework/router/application";
import { JSONEncoding } from "../framework/storage/encoding";
import { EncodedStore, KeyEncodedStore } from "../framework/storage/kv";
import { Directory } from "../framework/storage/containers/directory";

import { KVNamespace } from "@cloudflare/workers-types";
import { validate, keyof } from "../framework/router/json-schema";

import { apiSchema } from "./schema";
import { graphql } from "graphql";
import { ExecutionResultDataDefault } from "graphql/execution/execute";

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
    async authenticated(
        request: HTTPRequest,
        callback: () => Promise<HTTPResponse>
    ): Promise<HTTPResponse> {
        const sessionID = request.cookie["session-id"];

        if (
            sessionID === undefined ||
            (await blog.checkSession(sessionID)) === null
        ) {
            return { status: 401, text: "unauthorized" };
        }

        return await callback();
    }

    @Application.options("/api")
    async handleOptionsGraphQL(request: HTTPRequest): Promise<HTTPResponse> {
        return {
            status: 204,
            headers: {
                "access-control-allow-origin": "*",
                "access-control-allow-headers": "*",
                "access-control-allow-methods": "POST,GET,OPTIONS",
            },
        };
    }

    @Application.get("/api")
    @Application.post("/api")
    async handleGraphQL(request: HTTPRequest): Promise<HTTPResponse> {
        return {
            ...(await this.handleGraphQLRequest(schema, request)),
            headers: {
                "access-control-allow-origin": "*",
                "access-control-allow-headers": "*",
                "access-control-allow-methods": "POST,GET,OPTIONS",
            },
        };
    }

    @Application.post("/api/login")
    async handleLogin(request: HTTPRequest): Promise<HTTPResponse> {
        const cred = validate(await request.json(), {
            type: "object",
            properties: {
                passcode: { type: "string" },
            },
            required: ["passcode"],
            additionalItems: false,
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
