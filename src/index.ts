import { PathJSONStore } from "./storage/path";
import { EdgeLog } from "./core/blog";

import { WorkerStringKVStore } from "./worker";
import { Application, ResponseObject, ParsedRequest } from "./application";

const kv = new WorkerStringKVStore(TEST_KV);
const db = new PathJSONStore(kv);
const blog = new EdgeLog(db);

class MainApplication extends Application {
    @Application.get("/login")
    async handleLogin(request: ParsedRequest): Promise<ResponseObject> {
        const passcode = request.url.searchParams.get("passcode");

        if (passcode === null) {
            // check for cookie
            const cookie = request.headers.get("cookie");

            if (cookie === null) {
                return { text: "400 bad request", status: 400 };
            } else {
                const match = /session-id=([a-fA-F0-9-]+)/.exec(cookie);

                if (match === null) {
                    return { text: "400 bad request", status: 400 };
                } else {
                    const id = match[1];
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
            }
        } else {
            const session = await blog.login(passcode);

            if (session === null) {
                return { text: "wrong passcode", status: 400 };
            } else {
                return {
                    text: `session: ${session.id}`,
                    headers: {
                        setCookie: `session-id=${session.id}`,
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
