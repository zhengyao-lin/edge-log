addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request) {
    return new Response("hello", {
        headers: { "content-type": "text/plain" },
    });
}
