import { WorkerAPI } from "./api";
import { KVStore, KeyEncodedStore } from "../framework/storage/kv";
import { URIPathEncoding, Path } from "../framework/storage/path";
import { Directory } from "../framework/storage/containers/directory";

import yargs from "yargs";
import { promises as fsPromises } from "fs";
import path from "path";
import { promisify } from "util";
import { createInterface } from "readline";

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = promisify(
    (msg: string, callback: (err: any, answer: string) => void) => {
        rl.question(msg, answer => callback(null, answer));
    }
);

class WorkerAPIKVStore extends KVStore<string, Buffer> {
    constructor(private api: WorkerAPI, private namespaceID: string) {
        super();
    }

    async get(key: string): Promise<Buffer | null> {
        try {
            return await this.api.read(this.namespaceID, key);
        } catch (e) {
            return null;
        }
    }

    async set(key: string, value: Buffer) {
        await this.api.write(this.namespaceID, key, value);
    }

    async delete(key: string) {
        await this.api.delete(this.namespaceID, key);
    }

    async list(prefix: string): Promise<string[]> {
        return (await this.api.list(this.namespaceID, prefix)).map(
            key => key.name
        );
    }
}

async function walk(dir: string, handler: (path: string) => Promise<void>) {
    for (const fileName of await fsPromises.readdir(dir)) {
        const wholePath = path.join(dir, fileName);
        const stats = await fsPromises.stat(wholePath);

        if (stats.isDirectory()) {
            await walk(wholePath, handler);
        } else if (stats.isFile()) {
            await handler(wholePath);
        }
    }
}

async function main(argv: any) {
    if (argv.email === undefined) {
        argv.email =
            process.env["CLOUDFLARE_EMAIL"] ||
            (await question("Cloudflare email: "));
    }

    if (argv.id === undefined) {
        argv.id =
            process.env["CLOUDFLARE_ACCOUNT_ID"] ||
            (await question("Cloudflare account ID: "));
    }

    if (argv.key === undefined) {
        argv.key =
            process.env["CLOUDFLARE_API_KEY"] ||
            (await question("Cloudflare API key: "));
    }

    const api = new WorkerAPI(argv.email, argv.id, argv.key);

    if (argv.namespace === undefined) {
        const namespaces = await api.listNamespaces();
        console.log(
            `available namespaces: [${namespaces.map(
                ns => `${ns.id}(${ns.title})`
            )}]`
        );

        argv.namespace =
            process.env["WORKER_NAMESPACE"] ||
            (await question("Worker KV namespace: "));
    }

    const store = new KeyEncodedStore(
        new WorkerAPIKVStore(api, argv.namespace),
        new URIPathEncoding()
    );

    const local = argv._[0].toString();
    const remote = argv._[1].toString().split("/");

    const dir = new Directory(store, remote);

    await walk(local, async filePath => {
        const relativePath = filePath.substr(local.length + path.sep.length);
        const arrayPath: Path = relativePath.split(path.sep);
        const content: Buffer = await fsPromises.readFile(filePath);

        console.log(`uploading [${arrayPath}], length ${content.length}`);

        await dir.set(arrayPath, content);
    });
}

const argv = yargs
    .alias("h", "help")
    .alias("v", "version")

    .describe("email", "Cloudflare email address")
    .describe("id", "Cloudflare account ID")
    .describe("key", "Cloudflare API key")
    .describe("namespace", "Worker KV namespace")

    .usage("Usage: $0 [options] <local directory> <remote path>")
    .demandCommand(2).argv;

main(argv)
    .catch(err => {
        console.error(err);
    })
    .then(() => {
        process.exit(0);
    });
