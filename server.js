let lobby = []

let server = Bun.serve({
    fetch (req, server) {
        let path = new URL(req.url).pathname;
        console.log(path);
        if (req.method === "GET") {
            if (path === "/") {
                return respondFile("login.html");
            } else if (path === "/generateID") {
                console.log(req);
                return new Response("YES");
            } else {
                return error404();
            }
        } else {
            return error404();
        }
    }
});

function error404() {
    return new Response("Failed to load!");
}

function respondFile(filePath) {
    return new Response(Bun.file(filePath));
}

function generateID(username) {
    lobby.push({username: `${username}`, id: '1234'});
}