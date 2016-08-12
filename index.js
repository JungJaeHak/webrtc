// WebSockerServer
var WebSocketServer = require('ws').Server;
// Users Array
var users = {};
// express
var express = require('express');
var app = express();
// file system
var fs = require('fs');
// https
var https = require('https');
// ssl
var options = {
    key: fs.readFileSync('deviceCA.key'),
    cert: fs.readFileSync('deviceCA.crt'),
};

// https server
// port 8080
var server = https.createServer(options, app);
server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

// url '/' > index.html
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// url '/clinet.js' > client.js
app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
});

// WebsocketServer make
// server = httpsServer
wss = new WebSocketServer({
    server: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
})

// CrossOrigin
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

// connection
wss.on('connection', function (connection) {
    console.log("User connected");
    connection.on('message', function (message) {
        var data;
        try {
            /*
             message = {
                type: "something",
                name: inputName
             }
             */
            data = JSON.parse(message);
        } catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }
        switch (data.type) {
            case "login":
                console.log("User logged in as", data.name);
                // if name is already exist
                if (users[data.name]) {
                    // Send to Client
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                }
                // if name isn't exist
                else {
                    users[data.name] = connection;
                    connection.name = data.name;
                    // Send to Client
                    sendTo(connection, {
                        type: "login",
                        success: true
                    });
                }
                break;
            case "offer":
                console.log("Sending offer to", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            case "answer":
                console.log("Sending answer to", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to", data.name);
                var conn = users[data.name];
                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;
            case "leave":
                console.log("Disconnecting user from", data.name);
                var conn = users[data.name];
                conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Unrecognized command: " + data.type
                });
                break;
        }
    });

    connection.on('close', function () {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                console.log("Disconnecting user from",
                    connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });
});


function sendTo(conn, message) {
    conn.send(JSON.stringify(message));
}

wss.on('listening', function () {
    console.log("Server started...");
});

