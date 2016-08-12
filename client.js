/**
 * Created by kasatang on 2016-08-10.
 */
// wss server computer's ip & port
var connection = new WebSocket('wss://14.32.7.115:443'),
    name = "";

// init vars
var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up');
callPage.style.display = "none";

// Login when the user clicks the button
loginButton.addEventListener("click", function (event) {
    event.preventDefault();
    name = usernameInput.value;
    if (name.length > 0) {
        //send to server
        send({
            type: "login",
            name: name
        });
    }
});
connection.onopen = function () {
    console.log("Connected");
};
// Handle all messages through this callback
connection.onmessage = function (message) {
    console.log("Got message", message.data);
    var data = JSON.parse(message.data);
    switch (data.type) {
        case "login":
            onLogin(data.success);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            break;
        case "answer":
            onAnswer(data.answer);
            break;
        case "candidate":
            onCandidate(data.candidate);
            break;
        case "leave":
            onLeave();
            break;
        default:
            break;
    }
};

// Print Error
connection.onerror = function (err) {
    console.log("Got error", err);
};
// Alias for sending messages in JSON format
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
};

// Login
// Check overlap
//
function onLogin(success) {
    // if name is already exist
    if (success === false) {
        alert("Login unsuccessful, please try a different name.");
    } else {
        // Login div disappear
        loginPage.style.display = "none";
        // Call div disappear
        callPage.style.display = "block";
        // Get the plumbing ready for a call
        startConnection();
    }
};

callButton.addEventListener("click", function () {
    var theirUsername = theirUsernameInput.value;
    if (theirUsername.length > 0) {
        startPeerConnection(theirUsername);
    }
});

hangUpButton.addEventListener("click", function () {
    send({
        type: "leave"
    });
    onLeave();
});

function onOffer(offer, name) {
    connectedUser = name;
    yourConnection.setRemoteDescription(new
        RTCSessionDescription(offer));
    yourConnection.createAnswer(function (answer) {
        yourConnection.setLocalDescription(answer);
        send({
            type: "answer",
            answer: answer
        });
    }, function (error) {
        alert("An error has occurred");
    });
}
function onAnswer(answer) {
    yourConnection.setRemoteDescription(new
        RTCSessionDescription(answer));
}
function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
}
function onLeave() {
    connectedUser = null;
    theirVideo.src = null;
    yourConnection.close();
    yourConnection.onicecandidate = null;
    yourConnection.onaddstream = null;
    setupPeerConnection(stream);
}
// Search User Media( Cam )
function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
    return !!navigator.getUserMedia;
}
// RTCPeerConnection
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription ||
        window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate ||
        window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}
// init Video var
var yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector('#theirs'),
    yourConnection, connectedUser, stream;

// for mobile
var mobile = {
    video: {
        mandatory: {
            maxWidth: 640,
            maxHeight: 360
        }
    },
    audio:true
};
// for desktop
var desktop = {
    video: {
        mandatory: {
            minWidth: 1280,
            minHeight: 720
        }
    },
    audio:true

};

// check user env
var constraints;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|OperaMini/i.test(navigator.userAgent)) {
    constraints = mobile;
} else {
    constraints = desktop;
}

// if Login Success will start
// webRTC only Support Chrome,firefox,Opera
function startConnection() {
    if (hasUserMedia()) {
        navigator.getUserMedia(constraints, function
            (myStream) {
            stream = myStream;
            yourVideo.src = window.URL.createObjectURL(stream);
            if (hasRTCPeerConnection()) {
                setupPeerConnection(stream);
            } else {
                alert("Sorry, your browser does not support WebRTC.");
            }
        }, function (error) {
            console.log(error);
        });
    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}
// if U have PeerConnection
function setupPeerConnection(stream) {
    // STUN Server
    var configuration = {
        "iceServers": [{"url": "stun:stun.l.google.com:19302"}]
    };
    // Make PeerConnection
    yourConnection = new RTCPeerConnection(configuration);
    // Setup stream listening
    // My Stream Add
    yourConnection.addStream(stream);
    // Callee Stream Add
    yourConnection.onaddstream = function (e) {
        theirVideo.src = window.URL.createObjectURL(e.stream);
    };
    // Setup ice handling
    yourConnection.onicecandidate = function (event) {
        if (event.candidate) {
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };
}
function startPeerConnection(user) {
    connectedUser = user;
    // Begin the offer
    yourConnection.createOffer(function (offer) {
        send({
            type: "offer",
            offer: offer
        });
        yourConnection.setLocalDescription(offer);
    }, function (error) {
        alert("An error has occurred.");
    });
};