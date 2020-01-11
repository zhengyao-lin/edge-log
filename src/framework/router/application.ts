import { graphql, GraphQLSchema } from "graphql";
import { Base64Encoding } from "../storage/encoding";

/**
 * Minimal web application framework
 */

export class Route<T> {
    constructor(
        public method: HTTPMethod,
        public pattern: RegExp,
        public handler: keyof T
    ) {}

    match(request: HTTPRequest): RegExpExecArray | null {
        if (request.method.toLowerCase() !== this.method) {
            return null;
        }

        return this.pattern.exec(request.url.pathname);
    }
}

export type Authorization =
    | {
          basic: [string, string];
      }
    | {
          bearer: string;
      };

export class HTTPRequest {
    public method: HTTPMethod;
    public url: URL;
    public query: URLSearchParams;
    public headers: Headers;
    public cookie: CookieJar;

    constructor(private request: Request) {
        this.method = request.method.toLowerCase() as HTTPMethod;
        this.url = new URL(request.url);
        this.query = this.url.searchParams;
        this.headers = request.headers;
        this.cookie = new CookieJar(request.headers.get("cookie") || "");
    }

    async formData(): Promise<FormData> {
        return await this.request.formData();
    }

    async json(): Promise<any> {
        return await this.request.json();
    }

    async text(): Promise<string> {
        return await this.request.text();
    }

    getAuthorization(): Authorization | null {
        let auth = this.headers.get("authorization");
        if (auth === null) return null;

        const firstSpace = auth.indexOf(" ");
        if (firstSpace == -1) return null;

        switch (auth.substring(0, firstSpace)) {
            case "Basic":
                const tokenBase64 = auth.substring(firstSpace + 1);
                const token = new Base64Encoding().decode(tokenBase64);
                if (token === null) return null;

                const firstColon = token.indexOf(":");

                if (firstColon === -1) {
                    return {
                        basic: ["", token],
                    };
                } else {
                    return {
                        basic: [
                            token.substring(0, firstColon),
                            token.substring(firstColon + 1),
                        ],
                    };
                }

            case "Bearer":
                return {
                    bearer: auth.substring(firstSpace + 1),
                };
        }

        return null;
    }
}

export type Preprocessor = (request: HTTPRequest) => Promise<HTTPRequest>;
export type Postprocessor = (response: HTTPResponse) => Promise<HTTPResponse>;

export type HTTPMethod = "get" | "post" | "put" | "delete" | "options";
export type HTTPAuthorizationType = "Basic" | "Bearer";

export type ContentType =
    | "application/json"
    | "application/javascript"
    | "application/octet-stream"
    | "text/plain"
    | "text/css"
    | "text/html";

export type HTTPHeaders = {
    "content-type"?: ContentType;
    "set-cookie"?: CookieJar;
    authorization?: string;
    "www-authenticate"?: string;
    "access-control-allow-origin"?: string;
    "access-control-allow-headers"?: string;
    "access-control-allow-methods"?: string;
    cookie?: CookieJar;
};

export type HTTPResponse = {
    status?: number;
    headers?: HTTPHeaders;
} & (
    | { json: any }
    | { text: string }
    | { html: string }
    | { stream: ReadableStream }
    | {}
);

export type RequestHandler = (
    r: HTTPRequest,
    ...m: string[]
) => Promise<HTTPResponse>;

const ROUTE_NAME: unique symbol = Symbol();
const PREPROC_NAME: unique symbol = Symbol();
const POSTPROC_NAME: unique symbol = Symbol();

export abstract class Application {
    // These are here only for the type checking
    [ROUTE_NAME]?: Route<this>[];
    [PREPROC_NAME]?: { [key in keyof this]: Preprocessor[] };
    [POSTPROC_NAME]?: { [key in keyof this]: Postprocessor[] };

    /**
     * Generate a decorator for declaring
     * processors (pre- or post-)
     */
    protected static processor<
        A extends any[],
        P extends Preprocessor | Postprocessor
    >(symbol: string | symbol, gen: (...args: A) => P) {
        return (...args: A) => {
            const preproc = gen(...args);

            return (target: any, property: string) => {
                if (!target.hasOwnProperty(symbol)) {
                    target[symbol] = {};
                }

                if (!target[symbol].hasOwnProperty(property)) {
                    target[symbol][property] = [];
                }

                target[symbol][property].push(preproc);
            };
        };
    }

    /**
     * Generate a decorator for declaring
     * method handler
     */
    protected static method(name: HTTPMethod) {
        return (pattern: string) => {
            return <T extends Application>(
                target: T,
                property: keyof T,
                // restricting the type of the handler
                descriptor: TypedPropertyDescriptor<RequestHandler>
            ) => {
                if (!target.hasOwnProperty(ROUTE_NAME)) {
                    target[ROUTE_NAME] = [];
                }

                target[ROUTE_NAME]!.push(
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
    static options = Application.method("options");

    /**
     * Pre/postprocessors
     * These are handled in the order of declaration
     * (but with all preprocessors before post processors)
     */

    /**
     * Add response headers for cross-origin resource sharing (CORS)
     */
    static allowCORS = Application.processor(
        POSTPROC_NAME,
        (
            origin: string,
            headers: (keyof HTTPHeaders | "*")[],
            methods: (HTTPMethod | "*")[]
        ) => {
            return async (response: HTTPResponse) => {
                return {
                    ...response,
                    headers: {
                        ...response.headers,
                        "access-control-allow-origin": origin,
                        "access-control-allow-headers": headers.join(", "),
                        "access-control-allow-methods": methods.join(", "),
                    },
                };
            };
        }
    );

    /**
     * Common handlers for errors
     */
    async handleNotFound(request: HTTPRequest): Promise<HTTPResponse> {
        return { status: 404, text: "404 not found" };
    }

    async handleInternalError(request: HTTPRequest): Promise<HTTPResponse> {
        return { status: 500, text: "500 internal error" };
    }

    async handleBadRequest(request: HTTPRequest): Promise<HTTPResponse> {
        return { status: 400, text: "400 bad request" };
    }

    async handleUnauthorized(
        request: HTTPRequest,
        type: HTTPAuthorizationType = "Basic",
        realm?: string
    ): Promise<HTTPResponse> {
        return {
            status: 401,
            text: "401 unauthorized",
            headers: {
                "www-authenticate":
                    type + (realm !== undefined ? ` realm=${realm}` : ""),
            },
        };
    }

    /**
     * GraphQL query handler
     * https://graphql.org/learn/serving-over-http/
     */
    async getGraphQLQuery(
        request: HTTPRequest
    ): Promise<{
        query: string;
        operationName?: string;
        variables?: { [key: string]: any };
    } | null> {
        const query = request.query.get("query");

        if (request.method == "get" || query !== null) {
            const query = request.query.get("query");
            const operationName =
                request.query.get("operationName") || undefined;
            const variables = request.query.get("variables") || undefined;

            if (query === null) return null;

            try {
                return {
                    query: query,
                    operationName: operationName,
                    variables:
                        variables !== undefined
                            ? JSON.parse(variables)
                            : undefined,
                };
            } catch (e) {
                // parse failed
                return null;
            }
        } else if (request.method == "post") {
            if (request.headers.get("content-type") === "application/graphql") {
                return {
                    query: await request.text(),
                };
            } else {
                return (await request.json()) as {
                    query: string;
                    operationName?: string;
                    variables?: { [key: string]: any };
                };
            }
        }

        return null;
    }

    /**
     * GraphQL HTTP endpoint
     */
    async handleGraphQLRequest(
        schema: GraphQLSchema,
        request: HTTPRequest
    ): Promise<HTTPResponse> {
        const graphQLRequest = await this.getGraphQLQuery(request);

        if (graphQLRequest === null) {
            return this.handleBadRequest(request);
        }

        return {
            json: await graphql(
                schema,
                graphQLRequest.query,
                undefined,
                undefined,
                graphQLRequest.variables,
                graphQLRequest.operationName
            ),
        };
    }

    /**
     * Look up correctponding methods/processors
     * to handle a incoming (raw) request
     */
    async handleRequest(request: Request): Promise<Response> {
        let parsedRequest = new HTTPRequest(request);

        if (this[ROUTE_NAME] !== undefined) {
            for (const route of this[ROUTE_NAME]!) {
                const match = route.match(parsedRequest);

                if (match !== null) {
                    const handler = ((this[
                        route.handler
                    ] as unknown) as RequestHandler).bind(this);

                    const preprocs = this[PREPROC_NAME]?.[route.handler] || [];
                    const postprocs =
                        this[POSTPROC_NAME]?.[route.handler] || [];

                    try {
                        // run preprocessors
                        for (const preproc of preprocs) {
                            parsedRequest = await preproc(parsedRequest);
                        }

                        let response = await handler(
                            parsedRequest,
                            ...match.slice(1)
                        );

                        // run postprocessors
                        for (const postproc of postprocs) {
                            response = await postproc(response);
                        }

                        return Application.encodeResponse(response);
                    } catch (e) {
                        console.error(e);

                        return Application.encodeResponse(
                            await this.handleInternalError(parsedRequest)
                        );
                    }
                }
            }
        }

        return Application.encodeResponse(
            await this.handleNotFound(parsedRequest)
        );
    }

    /**
     * Encode our short definition of response
     * to the standard response
     */
    private static encodeResponse(responseObj: HTTPResponse): Response {
        const headers: HTTPHeaders = responseObj["headers"] || {};

        const status =
            responseObj["status"] !== undefined ? responseObj["status"] : 200;

        let response: string | ReadableStream = "";

        if ("json" in responseObj) {
            response = JSON.stringify(responseObj["json"]);
            headers["content-type"] = "application/json";
        } else if ("text" in responseObj) {
            response = responseObj["text"];
            headers["content-type"] = "text/plain";
        } else if ("html" in responseObj) {
            response = responseObj["html"];
            headers["content-type"] = "text/html";
        } else if ("stream" in responseObj) {
            response = responseObj["stream"];
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
            headers: encodedHeaders,
        });
    }

    /**
     * Infer the content type by the fileName
     */
    static inferContentType(fileName: string): ContentType {
        const dotIndex = fileName.lastIndexOf(".");

        if (dotIndex != -1) {
            const suffix = fileName.substr(dotIndex + 1);
            const contentTypeMap: Record<string, ContentType> = {
                json: "application/json",
                js: "application/javascript",
                html: "text/html",
                css: "text/css",
                txt: "text/html",
            };

            if ((contentTypeMap as Object).hasOwnProperty(suffix)) {
                return contentTypeMap[suffix];
            }
        }

        return "application/octet-stream";
    }
}

export class CookieJar {
    [key: string]: string;

    constructor(cookie: string) {
        /**
         * https://gist.github.com/rendro/525bbbf85e84fa9042c2#gistcomment-2784930
         */
        cookie.split(";").reduce((res, c) => {
            const [key, val] = c
                .trim()
                .split("=")
                .map(decodeURIComponent);
            return Object.assign(res, { [key]: val });
        }, this);
    }
}

CookieJar.prototype.toString = function(): string {
    const pairs: string[] = [];

    for (const key in this) {
        if ((this as Object).hasOwnProperty(key)) {
            pairs.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(this[key])}`
            );
        }
    }

    return pairs.join(";");
};
