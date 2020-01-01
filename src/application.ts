import { assert } from "./utils";

/**
 * Minimal web application framework
 */

export class Route {
    constructor(
        public method: string,
        public pattern: RegExp,
        public handler: string
    ) {
        this.method = this.method.toLowerCase();
    }

    match(request: ParsedRequest): boolean {
        return (
            request.method.toLowerCase() === this.method &&
            this.pattern.test(request.url.pathname)
        );
    }
}

export class ParsedRequest {
    public method: string;
    public url: URL;
    public headers: any;

    constructor(public request: Request) {
        this.method = request.method;
        this.url = new URL(request.url);
        this.headers = request.headers;
    }
}

export abstract class Application {
    static readonly ROUTE_NAME: unique symbol = Symbol();

    static method(name: string) {
        return (pattern: string) => {
            return (target: any, property: string) => {
                if (!target.hasOwnProperty(Application.ROUTE_NAME)) {
                    target[Application.ROUTE_NAME] = [];
                }

                target[Application.ROUTE_NAME].push(
                    new Route(name, new RegExp("^" + pattern + "$"), property)
                );
            };
        };
    }

    /**
     * HTTP methods
     */
    static get = Application.method("get");
    static post = Application.method("post");
    static put = Application.method("put");
    static delete = Application.method("delete");

    async handleNotFound(request: ParsedRequest): Promise<ResponseObject> {
        return { text: "404 not found", status: 404 };
    }

    async handleRequest(request: Request): Promise<Response> {
        const parsedRequest = new ParsedRequest(request);

        const proto: ApplicationPrototype = Object.getPrototypeOf(this);

        for (const route of proto[Application.ROUTE_NAME]) {
            if (route.match(parsedRequest)) {
                return Application.convertResponse(
                    await ((this as any)[route.handler] as RequestHandler)(
                        parsedRequest
                    )
                );
            }
        }

        return Application.convertResponse(
            await this.handleNotFound(parsedRequest)
        );
    }

    /**
     * Convert our definition of HTTP headers to the standard one
     */
    static convertHTTPHeaders(headers: HTTPHeaders): any {
        const keyMap: Record<keyof HTTPHeaders, string> = {
            contentType: "content-type",
            setCookie: "set-cookie",
        };

        const rawHeaders: any = {};

        for (const key in headers) {
            assert(key in keyMap, `unrecognized header ${key}`);
            rawHeaders[keyMap[key as keyof HTTPHeaders]] =
                headers[key as keyof HTTPHeaders];
        }

        return rawHeaders;
    }

    static convertResponse(responseObj: ResponseObject): Response {
        const headers: HTTPHeaders = responseObj["headers"] || {};

        const status =
            responseObj["status"] !== undefined ? responseObj["status"] : 200;

        let response;

        if ("json" in responseObj) {
            response = JSON.stringify(responseObj["json"]);
            headers.contentType = "application/json";
        } else if ("text" in responseObj) {
            response = responseObj["text"];
            headers.contentType = "text/plain";
        } else if ("html" in responseObj) {
            response = responseObj["html"];
            headers.contentType = "text/html";
        }

        return new Response(response, {
            status,
            headers: this.convertHTTPHeaders(headers),
        });
    }
}

export type RequestHandler = (r: ParsedRequest) => Promise<ResponseObject>;
export type ApplicationPrototype = {
    [Application.ROUTE_NAME]: Route[];
};

export type HTTPHeaders = {
    contentType?: string;
    setCookie?: string;
};

export type ResponseObject = {
    status?: number;
    headers?: HTTPHeaders;
} & ({ json: any } | { text: string } | { html: string });
