import { PathJSONStore } from "./storage/path";
import { EdgeLog } from "./core/blog";

import { WorkerStringKVStore } from "./worker";

const kv = new WorkerStringKVStore(TEST_KV);
const db = new PathJSONStore(kv);
const blog = new EdgeLog(db);

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request) {
    const url = new URL(request.url);
    let response;

    /**
     * POST /api/login
     *   - passcode: string
     *
     * POST /api/post
     *   - title: string
     *   - content: string
     *
     * PUT /api/post
     *   - id: string
     *   - title: string
     *   - content: string
     *
     * GET /api/post
     *   - id: string
     */

    switch (url.pathname) {
        case "/login": {
            const passcode = url.searchParams.get("passcode");

            if (passcode === null) {
                response = "400 bad request";
            } else {
                const session = await blog.login(passcode);

                if (session === null) {
                    response = "wrong passcode";
                } else {
                    response = "session: " + session.id;
                }
            }

            break;
        }

        default:
            response = "404 not found";
    }

    return new Response(response, {
        headers: { "content-type": "text/plain" },
    });
}
