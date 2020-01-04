import fetch from "node-fetch";

export type APIResponse<R> = APIStandardResponse<R> | R | APIError;

export interface APIStandardResponse<R> {
    result: R;
    success: boolean;
    errors: APIError[];
}

export interface APIError {
    code: number;
    message: string;
}

export interface Namespace {
    id: string;
    title: string;
    supports_url_encoding: boolean;
}

export interface KeyName {
    name: string;
    expiration?: number;
}

export class WorkerAPI {
    static BASE = "https://api.cloudflare.com/client/v4";

    constructor(
        private email: string,
        private accountID: string,
        private key: string
    ) {}

    getAuthHeader(): Record<string, string> {
        return {
            "x-auth-email": this.email,
            "x-auth-key": this.key,
        };
    }

    getURL(apiPath: string): string {
        return `${WorkerAPI.BASE}/accounts/${this.accountID}/${apiPath}`;
    }

    assertNotFailed<R>(response: APIResponse<R>, msg: string) {
        if ("success" in response && !response.success) {
            console.error(`${msg}: the following error occurred`);

            if (response.errors) {
                for (const error of response.errors) {
                    console.log(`  - ${error.code} ${error.message}`);
                }
            }

            throw new Error("aborted");
        } else if ("code" in response && "message" in response) {
            console.error(`${msg}: the following error occurred`);
            console.log(`  - ${response.code} ${response.message}`);

            throw new Error("aborted");
        }
    }

    getResponseResult<R>(response: APIResponse<R>): R {
        if ("success" in response) {
            return response["result"];
        } else {
            return response as R;
        }
    }

    async fetchAPI<R = null>(
        action: string,
        apiPath: string,
        opt: RequestInit
    ): Promise<R> {
        const url = this.getURL(apiPath);
        console.log(`> ${opt.method?.toUpperCase() || "GET"} ${url}`);

        const response = await fetch(url, opt as any);

        if (response.headers.get("content-type")?.includes("json")) {
            const responseObj = (await response.json()) as APIResponse<R>;
            this.assertNotFailed(responseObj, `failed to ${action}`);
            return this.getResponseResult<R>(responseObj);
        } else {
            // raw stream
            if (response.status !== 200) {
                this.assertNotFailed(
                    { code: response.status, message: "unknown" },
                    `failed to ${action}`
                );
                throw new Error();
            } else {
                return (await response.buffer()) as any;
            }
        }
    }

    async listNamespaces(): Promise<Namespace[]> {
        return await this.fetchAPI<Namespace[]>(
            "list namespaces",
            `storage/kv/namespaces`,
            {
                method: "GET",
                headers: this.getAuthHeader(),
            }
        );
    }

    async read(namespaceID: string, key: string): Promise<Buffer> {
        const result = await this.fetchAPI<Buffer>(
            `read key ${key}`,
            `storage/kv/namespaces/${namespaceID}/values/${key}`,
            {
                method: "GET",
                headers: {
                    ...this.getAuthHeader(),
                    "content-type": "text/plain",
                },
            }
        );

        return result;
    }

    async write(namespaceID: string, key: string, value: Buffer) {
        await this.fetchAPI(
            `write key "${key}"`,
            `storage/kv/namespaces/${namespaceID}/values/${key}`,
            {
                method: "PUT",
                headers: {
                    ...this.getAuthHeader(),
                    "content-type": "text/plain",
                },
                body: value,
            }
        );
    }

    async delete(namespaceID: string, key: string) {
        await this.fetchAPI(
            `delete key "${key}"`,
            `storage/kv/namespaces/${namespaceID}/values/${key}`,
            {
                method: "DELETE",
                headers: this.getAuthHeader(),
            }
        );
    }

    async list(namespaceID: string, prefix: string = ""): Promise<KeyName[]> {
        return await this.fetchAPI<KeyName[]>(
            `list keys in ${namespaceID}`,
            `storage/kv/namespaces/${namespaceID}/keys?prefix=${encodeURIComponent(
                prefix
            )}`,
            {
                method: "GET",
                headers: this.getAuthHeader(),
            }
        );
    }
}
