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

    match(request: HTTPRequest): RegExpExecArray | null {
        if (request.method.toLowerCase() !== this.method) {
            return null;
        }

        return this.pattern.exec(request.url.pathname);
    }
}

export class HTTPRequest {
    public method: string;
    public url: URL;
    public headers: any;
    public cookie: CookieJar;

    constructor(private request: Request) {
        this.method = request.method;
        this.url = new URL(request.url);
        this.headers = request.headers;
        this.cookie = new CookieJar(request.headers.get("cookie") || "");
    }

    async formData(): Promise<FormData> {
        return await this.request.formData();
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

    async handleNotFound(request: HTTPRequest): Promise<HTTPResponse> {
        return { text: "404 not found", status: 404 };
    }

    async handleRequest(request: Request): Promise<Response> {
        const parsedRequest = new HTTPRequest(request);

        const proto: ApplicationPrototype = Object.getPrototypeOf(this);

        for (const route of proto[Application.ROUTE_NAME]) {
            const match = route.match(parsedRequest);

            if (match !== null) {
                const handler: RequestHandler = (this as any)[route.handler];

                return Application.encodeResponse(
                    await handler(parsedRequest, match.slice(1))
                );
            }
        }

        return Application.encodeResponse(
            await this.handleNotFound(parsedRequest)
        );
    }

    private static encodeResponse(responseObj: HTTPResponse): Response {
        const headers: HTTPHeaders = responseObj["headers"] || {};

        const status =
            responseObj["status"] !== undefined ? responseObj["status"] : 200;

        let response;

        if ("json" in responseObj) {
            response = JSON.stringify(responseObj["json"]);
            headers["content-type"] = "application/json";
        } else if ("text" in responseObj) {
            response = responseObj["text"];
            headers["content-type"] = "text/plain";
        } else if ("html" in responseObj) {
            response = responseObj["html"];
            headers["content-type"] = "text/html";
        }

        let key: keyof HTTPHeaders;
        const encodedHeaders: Record<string, string> = {};

        for (key in headers) {
            if (headers[key] !== undefined) {
                encodedHeaders[key] = headers[key]!.toString();
            }
        }

        return new Response(response, {
            status,
            headers: encodedHeaders
        });
    }
}

export class CookieJar {
    [x: string]: string;
    
    constructor(cookie: string) {
        /**
         * https://gist.github.com/rendro/525bbbf85e84fa9042c2#gistcomment-2784930
         */
        cookie
            .split(";")
            .reduce((res, c) => {
                const [key, val] = c.trim().split("=").map(decodeURIComponent)
                return Object.assign(res, { [key]: val });
            }, this);
    }
}

CookieJar.prototype.toString = function(): string {
    const pairs: string[] = [];

    for (const key in this) {
        if ((this as Object).hasOwnProperty(key)) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(this[key])}`);
        }
    }

    return pairs.join(";");
};

export type RequestHandler = (
    r: HTTPRequest,
    m: string[]
) => Promise<HTTPResponse>;

export type ApplicationPrototype = {
    [Application.ROUTE_NAME]: Route[];
};

export type HTTPHeaders = {
    "content-type"?: string;
    "set-cookie"?: CookieJar;
    cookie?: CookieJar;
};

export type HTTPResponse = {
    status?: number;
    headers?: HTTPHeaders;
} & ({ json: any } | { text: string } | { html: string });
