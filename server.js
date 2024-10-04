let lobby = [];
let rooms = [];

const MessageType = {
    USERNAME_PING: 0,
    MESSAGE: 1,
    ROOM_PING: 2
};

let server = Bun.serve({
    fetch (req, server) {
        let path = new URL(req.url).pathname;
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
            let roomCheckInterval = setInterval(() => {
                console.log(lobby.length);
                if (lobby.length > 2) {
                    let wsIndex = lobby.findIndex(conn => conn.ws === ws);
                    if (wsIndex !== -1) {
                        if (wsIndex !== 0) {
                            let thisRoom = createRoom(lobby[0], lobby[wsIndex]);
                        }
                        ws.send(JSON.stringify({
                            type: 2,
                            data: thisRoom
                        }));
                        clearInterval(roomCheckInterval);
                    }
                }
            }, 1000)
        },

        message(ws, message) {
            let messageParseStatus = false;
            try {
                message = JSON.parse(message);
                messageParseStatus = true;
            } catch (error) {
                console.log("Incorrect message data");
            }
            if (messageParseStatus === true) {
                if (message.type === MessageType.USERNAME_PING) {
                    generateID(ws, message.data);
                } else if (message.type === MessageType.MESSAGE) {
                    console.log("Message from client:", message.data);
                    console.log(rooms);
                } else {
                    console.log("Incorrect message type!");
                    console.log(lobby);
                }
            }
        },

        close(ws) {
            console.log("WebSocket connection closed");
            lobby = lobby.filter(conn => conn.ws !== ws);
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

function createRoom(user1, user2) {
    lobby = lobby.filter(conn => conn.ws !== user1.ws);
    lobby = lobby.filter(conn => conn.ws !== user2.ws);
    thisRoom = {
        id: generateRoomID(),
        user1: user1, 
        user2: user2, 
        messages: []
    }
    rooms.push(thisRoom);
    return thisRoom.id;
}

function respondFile(filePath) {
    return new Response(Bun.file(filePath));
}

function generateID(ws, username="default") {
    lobby.push({username: `${username}`, ws: ws});
}

function generateRoomID() {
    return Math.random().toString(36).substr(2, 9);
}