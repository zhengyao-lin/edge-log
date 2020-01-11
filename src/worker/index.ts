import { URIPathEncoding } from "../framework/storage/path";
import { EdgeLog } from "./models";

import { WorkerStringKVStore, WorkerStreamKVStore } from "./worker";
import {
    Application,
    HTTPResponse,
    HTTPRequest,
} from "../framework/router/application";
import { JSONEncoding, JSONEncodable } from "../framework/storage/encoding";
import { EncodedStore, KeyEncodedStore } from "../framework/storage/kv";
import { Directory } from "../framework/storage/containers/directory";

import { KVNamespace } from "@cloudflare/workers-types";

import { apiSchema } from "./schema";

import { sign as jwtSign, verify as jwtVerify } from "jsonwebtoken";
import { GraphQLSchema } from "graphql";

declare global {
    const TEST_KV: KVNamespace;
}

class MainApplication extends Application {
    static STATIC_PATH = ["static"];
    static SECRET_PATH = ["secret"];
    static DATA_PATH = ["data"];

    /**
     * ECDSA using P-384 curve and SHA-384 hash algorithm (curve secp384r1)
     * generate key pairs with openssl:
     * $ openssl ecparam -genkey -name secp384r1 -noout -out secret/jwt-key.pem
     * $ openssl ec -in secret/jwt-key.pem -pubout -out secret/jwt-key.pub
     * https://www.npmjs.com/package/jsonwebtoken
     */
    static JWT_PRIVATE_KEY_PATH = ["jwt-key.pem"]; // relative to the secret directory
    static JWT_PUBLIC_KEY_PATH = ["jwt-key.pub"];
    static JWT_ALGORITHM = "ES384";

    private staticDir: Directory<ReadableStream>;
    private secretDir: Directory<string>;
    private dataDir: Directory<JSONEncodable>;

    private model: EdgeLog;
    private apiSchema: GraphQLSchema;

    constructor() {
        super();

        this.staticDir = new Directory(
            new KeyEncodedStore(
                new WorkerStreamKVStore(TEST_KV),
                new URIPathEncoding()
            ),
            MainApplication.STATIC_PATH
        );

        this.secretDir = new Directory(
            new KeyEncodedStore(
                new WorkerStringKVStore(TEST_KV),
                new URIPathEncoding()
            ),
            MainApplication.SECRET_PATH
        );

        this.dataDir = new Directory(
            new EncodedStore(
                new WorkerStringKVStore(TEST_KV),
                new URIPathEncoding(),
                new JSONEncoding()
            ),
            MainApplication.DATA_PATH
        );

        this.model = new EdgeLog(this.dataDir);
        this.apiSchema = apiSchema(this.model);
    }

    @Application.get("/checkAuth")
    async handleCheckAuth(request: HTTPRequest): Promise<HTTPResponse> {
        const auth = request.getAuthorization();

        if (auth === null || !("bearer" in auth)) {
            return this.handleUnauthorized(request, "Bearer");
        }

        const publicKey = await this.secretDir.get(
            MainApplication.JWT_PUBLIC_KEY_PATH
        );

        if (publicKey === null) {
            return this.handleInternalError(request);
        }

        try {
            const token = jwtVerify(auth.bearer, publicKey, {
                algorithms: [MainApplication.JWT_ALGORITHM],
            });

            return { json: token };
        } catch (e) {
            return this.handleUnauthorized(request, "Bearer");
        }
    }

    @Application.get("/auth")
    async handleAuth(request: HTTPRequest): Promise<HTTPResponse> {
        const auth = request.getAuthorization();

        if (auth === null || !("basic" in auth)) {
            return this.handleUnauthorized(request, "Basic");
        }

        const [_, passcode] = auth.basic;

        if (!(await this.model.siteConfig.checkPasscode(passcode))) {
            return this.handleUnauthorized(request, "Basic");
        }

        const privateKey = await this.secretDir.get(
            MainApplication.JWT_PRIVATE_KEY_PATH
        );

        if (privateKey === null) {
            return this.handleInternalError(request);
        }

        const token = jwtSign({}, privateKey, {
            algorithm: MainApplication.JWT_ALGORITHM,
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
        return await this.handleGraphQLRequest(this.apiSchema, request);
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
        const stream = await this.staticDir.get(path);

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
