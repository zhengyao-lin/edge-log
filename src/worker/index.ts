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
import { assert } from "../framework/utils";

import { fromByteArray } from "base64-js";

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
    // @Application.get("/auth")
    // async handleAuthentication(request: HTTPRequest): Promise<HTTPResponse> {
    //     try {
    //         const auth = request.headers.get("authorization");
    //         const passcodeBase64 = auth!.substring("Basic ".length);

    //         const passcode = fromByteArray(
    //             Uint8Array.from(new TextEncoder().encode(passcodeBase64))
    //         );
    //         assert(await blog.siteConfig.checkPasscode(passcode));

    //         const token = jwtSign({}, "", {
    //             expiresIn: 60 * 10,
    //         });

    //         return { text: token };
    //     } catch (e) {
    //         return { status: 401, text: "401 unauthorized" };
    //     }
    // }

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
