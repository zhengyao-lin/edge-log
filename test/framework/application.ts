import { expect } from "chai";
import {
    Application,
    HTTPRequest,
    HTTPResponse,
} from "../../src/framework/router/application";

import { Request, Response } from "node-fetch";
import { Base64Encoding } from "../../src/framework/utils";

(global as any).Request = Request;
(global as any).Response = Response;

class App1 extends Application {
    @Application.get("/test")
    async handleTest(request: HTTPRequest): Promise<HTTPResponse> {
        return { text: "app1" };
    }
}

class App2 extends Application {
    @Application.get("/test")
    @Application.post("/test")
    async handleTest(request: HTTPRequest): Promise<HTTPResponse> {
        return { text: "app2" };
    }
}

describe("http request", () => {
    it("parses Authorization header correctly", () => {
        let request = new Request("https://foo.com/test", {
            method: "GET",
            headers: {
                "Authorization": "Basic "
            }
        });

        let parsedRequest = new HTTPRequest(request as any);

        expect(parsedRequest.getAuthorization()).eql({ basic: ["", ""] });

        request = new Request("https://foo.com/test", {
            method: "GET",
            headers: {
                "Authorization": "Basic " + new Base64Encoding().encode("user:pass")
            }
        });

        parsedRequest = new HTTPRequest(request as any);

        expect(parsedRequest.getAuthorization()).eql({ basic: ["user", "pass"] });
    });
});

describe("application", () => {
    const app1 = new App1();
    const app2 = new App2();

    it("doesn't mix handlers", async () => {
        let request = new Request("https://foo.com/test", {
            method: "GET",
        });

        expect(await (await app1.handleRequest(request as any)).text()).equals(
            "app1"
        );
        expect(await (await app2.handleRequest(request as any)).text()).equals(
            "app2"
        );

        request = new Request("https://foo.com/test", {
            method: "POST",
        });

        expect(await (await app1.handleRequest(request as any)).status).equals(
            404
        );
        expect(await (await app2.handleRequest(request as any)).status).equals(
            200
        );
    });
});
