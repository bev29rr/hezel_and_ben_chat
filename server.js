let lobby = []

let server = Bun.serve({
    fetch (req, server) {
        console.log(req);
        let path = new URL(req.url).pathname;
        console.log(path);
        if (req.method === "GET") {
            if (req.headers.get("upgrade") === "websocket") {
                if (server.upgrade(req)) {return;}
                return new Response("Upgrade failed", {status: 500});
            } else if (path === "/") {
                return respondFile("login.html");
            } else {
                return error404();
            }
        } else {
            return error404();
        }
    },
    websocket: {
        open(ws) {
            console.log("WebSocket connection opened");
            ws.send("Hello world");
        },

        message(ws, message) {
            console.log("Message from client:", message);
            ws.send("Received: " + message);
        },

        close(ws) {
            console.log("WebSocket connection closed");
        },

        error(ws, error) {
            console.error("WebSocket error:", error);
        }
    },
    port: 3000,
});

console.log(`Server running at http://${server.hostname}:${server.port}/`);

function error404() {
    return new Response("Failed to load!");
}

function respondFile(filePath) {
    return new Response(Bun.file(filePath));
}

function generateID(username) {
    lobby.push({username: `${username}`, id: '1234'});
}