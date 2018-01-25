const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const uuid = require("uuid");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const channels = {};
const hosts = {};

app.use("/", express.static("."));

io.on("connection", (socket) => {

    const channels = Object.keys(hosts);
    channels.forEach(id => socket.emit("new_channel", {
        id
    }));

    socket.on("create", (data, fn) => {
        if (hosts.hasOwnProperty(socket.id)) {
            fn("createFailed");
        } else {
            hosts[socket.id] = socket;
            socket.room = socket.id;
            socket.join(socket.id);
            socket.broadcast.emit("new_channel", {
                id: socket.id
            });
            fn("createSuccess");
        }
    });

    socket.on("join", (data, fn) => {
        if (typeof hosts[data.id] !== "undefined") {
            socket.room = data.id;
            socket.join(data.id);
            // get current model from host and send it to the client
            hosts[data.id].emit("getInit", undefined, (response) => {
                socket.emit("init", response);
            });
        }
    });

    socket.on("leave", (data, fn) => {
        socket.room = undefined;
        socket.leave(data.id);
    });

    socket.on("remove", (data, fn) => {
        if (hosts.hasOwnProperty(socket.id)) {
            delete hosts[socket.id];
            socket.room = undefined;
            socket.broadcast.emit("remove_channel", {
                id: socket.id
            });
            fn("removeSuccess");
        } else {
            fn("removeFailed")
        }
    });

    socket.on("vf_event", (data, fn) => {
        socket.broadcast.to(socket.room).emit("vf_event", data);
    });

    // remove closed connections
    socket.on("disconnect", () => {
        if (hosts.hasOwnProperty(socket.id)) {
            delete hosts[socket.id];
            socket.broadcast.emit("remove_channel", {
                id: socket.id
            });
        }
    });

});

server.listen(80, () => {
    console.log("Listening on %d", server.address().port);
});