import { PathJSONStore } from "./storage/path";
import { EdgeLog } from "./core/blog";

import { WorkerStringKVStore } from "./worker";
import { Application, HTTPResponse, HTTPRequest } from "./application";

const kv = new WorkerStringKVStore(TEST_KV);
const db = new PathJSONStore(kv);
const blog = new EdgeLog(db);

class MainApplication extends Application {
    @Application.get("/login")
    async handleLogin(
        request: HTTPRequest
    ): Promise<HTTPResponse> {
        const passcode = request.url.searchParams.get("passcode");

        if (passcode === null) {
            // check for cookie
            if (request.cookie["session-id"] === undefined) {
                return { text: "400 bad request", status: 400 };
            } else {
                const id = request.cookie["session-id"];
                const session = await blog.checkSession(id);

                if (session === null) {
                    return {
                        text: `illegal session id ${id}`,
                        status: 400,
                    };
                } else {
                    return {
                        text: `found session id ${id}; first login ${session.getTimeOfCreation()}`,
                    };
                }
            }
        } else {
            const session = await blog.login(passcode);

            if (session === null) {
                return { text: "wrong passcode", status: 400 };
            } else {
                return {
                    text: `session: ${session.id}`,
                    headers: {
                        "set-cookie": { "session-id": session.id },
                    },
                };
            }
        }
    }
}

const app = new MainApplication();

addEventListener("fetch", event => {
    event.respondWith(app.handleRequest(event.request));
});
