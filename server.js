import os from 'os';

let lobby = [];
let rooms = [];

function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const addresses = networkInterfaces[interfaceName];
        for (const addr of addresses) {
            if (addr.family === 'IPv4' && !addr.internal) {
                return addr.address;  
            }
        }
    }
    return '127.0.0.1'; 
}

const MessageType = {
    USERNAME_PING: 0,
    MESSAGE: 1,
    LOBBY_PING: 2,
    ROOM_REQ: 3,
    MESSAGE_REQUEST: 4
};

const localIP = getLocalIPAddress();
let serverIP = "0.0.0.0";

console.log(localIP);

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
                    ws.send(JSON.stringify({
                        type: 0,
                        data: generateID(ws, message.data)
                    }));
                } else if (message.type === MessageType.MESSAGE) {
                    //console.log("Message from client:", message.data);
                    let lookOne = rooms.find(room => room.user1.ws === ws);
                    let lookTwo = rooms.find(room => room.user2.ws === ws);
                    if (lookOne !== undefined) {
                        lookOne.messages.push({
                            message: message.data,
                            userid: lookOne.user1.id
                        });
                    } else if (lookTwo !== undefined) {
                        lookTwo.messages.push({
                            message: message.data,
                            userid: lookTwo.user2.id
                        });
                    }
                } else if (message.type === MessageType.LOBBY_PING) { 
                    const lobbyClean = lobby
                        .filter(user => user.ws !== ws)
                        .map(user => ({
                            username: user.username,
                            id: user.id
                        })
                    );
                    ws.send(JSON.stringify({
                        type: 2,
                        data: lobbyClean
                    }));
                } else if (message.type === MessageType.ROOM_REQ) { 
                    let idPos = lobby.find(user => user.id === message.data);
                    let thisPos = lobby.find(user => user.ws === ws);
                    if (idPos !== false && thisPos !== false) {
                        lobby = lobby.filter(conn => conn.ws !== ws);
                        let thisRoom = createRoom(idPos, thisPos);
                        ws.send(JSON.stringify({
                            type: 3,
                            data: thisRoom
                        }));
                        idPos.ws.send(JSON.stringify({
                            type: 3,
                            data: thisRoom
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 3,
                            data: false
                        }));
                    }
                } else if (message.type === MessageType.MESSAGE_REQUEST) {
                    return ws.send(JSON.stringify({
                        type: 4,
                        data: getMessages(ws)
                    }));
                } else {
                    console.log("Incorrect message type!");
                    console.log(lobby);
                }
            }
        },

        close(ws) {
            console.log("WebSocket connection closed");
            lobby = lobby.filter(conn => conn.ws !== ws);
            rooms = rooms.filter(room => room.user1.ws !== ws && room.user2.ws !== ws);
        },

        error(ws, error) {
            console.error("WebSocket error:", error);
        }
    },
    hostname: serverIP,
    port: 7878,
});

console.log(`Server running at http://${server.hostname}:${server.port}/`);

/*
setInterval(() => {
    console.log(`rooms: ${rooms.length}`);
}, 1000);
*/

/* 
let roomCheckInterval = setInterval(() => {
    console.log(lobby.length);
    if (lobby.length >= 2) {
        if (wsIndex !== 0) {
            let thisRoom = createRoom(lobby[0], lobby[wsIndex]);
        }
        ws.send(JSON.stringify({
            type: 2,
            data: thisRoom
        }));
        clearInterval(roomCheckInterval);
    }
}, 1000)
*/
function error404() {
    return new Response("Failed to load!");
}

function getMessages(ws) {
    let roomUser1 = rooms.find(room => room.user1.ws === ws);
    let roomUser2 = rooms.find(room => room.user2.ws === ws);
    if (roomUser1 !== undefined) {
        return roomUser1.messages;
    } else if (roomUser2 !== undefined) {
        return roomUser2.messages;
    } else {
        return false;
    }
}

function createRoom(user1, user2) {
    lobby = lobby.filter(conn => conn.ws !== user1.ws);
    lobby = lobby.filter(conn => conn.ws !== user2.ws);
    let thisRoom = {
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
    let userID = generateRoomID();
    lobby.push({username: `${username}`, id: userID, ws: ws});
    return userID;
}

function generateRoomID() {
    function randomHex() {
        return Math.random().toString(16).substr(2, 64);
    }
    let randomID = randomHex();

    while (lobby.find(user => user.id === randomID)) {
        randomID = randomHex(); 
    }

    return randomID; 
}