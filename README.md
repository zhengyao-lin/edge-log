## edge-log

`edge-log` is a minimal, serverless blog application designed to run on a service like
Cloudflare Workers or AWS Lambda Compute, where the only resource we have is a small amount of CPU time
per request and a simple key-value store without the support for atomic operations (e.g. Cloudflare Worker KV).

## Build and run (on Cloudflare Workers)

The building process will emit two bundles of code.
One to be run on Cloudflare Workers while the other to be served statically to the front-end.

And the following commands will build the bundles and upload corresponding static files

    npm run build

    # This command would require your Cloudflare API credentials
    npm run upload dist/static static

The last step would be to copy and save the worker script at `dist/worker/index.js` to the Cloudflare Worker console.

The frontend has not been properly connected to the backend as of now.
But one could try to test a few primitive functionalities through the GraphQL endpoint served at `https://<worker domain>/api`.
The schema of the GraphQL instance could be found at `src/worker/schema.ts`

## Todo

I'm pausing the development for now. Will find time to work on the frontend.
