var WebSocketServer = require('ws').Server,
    users = {};
var express = require('express');
var app = express();
var fs = require('fs');
var https = require('https');
var options = {
    key: fs.readFileSync('deviceCA.key'),
    cert: fs.readFileSync('deviceCA.crt'),
};

var server = https.createServer(options, app);
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
});


wss = new WebSocketServer({
    server: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wss.on('connection', function (connection) {
    console.log("User connected");
    connection.on('message', function (message) {
        var data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Error parsing JSON");
            data = {};
        }
        switch (data.type) {
            case "login":
                console.log("User logged in as", data.name);
                if (users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    users[data.name] = connection;
                    connection.name = data.name;
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

