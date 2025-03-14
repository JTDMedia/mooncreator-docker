const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DOCKER_IMAGE = "node:22-bullseye"; // Gebruik een Ubuntu-gebaseerde image

// Middleware voor authenticatie
function authenticate(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ error: "No token provided" });
    req.botToken = token;
    next();
}

// Helper om shell-opdrachten uit te voeren
function runCommand(command, res) {
    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: stderr || error.message });
        res.json({ message: stdout.trim() });
    });
}

// Docker container starten
app.post("/start", authenticate, (req, res) => {
    runCommand(`docker start ${req.botToken}`, res);
});

// Docker container stoppen
app.post("/stop", authenticate, (req, res) => {
    runCommand(`docker stop ${req.botToken}`, res);
});

// Docker container herstarten
app.post("/restart", authenticate, (req, res) => {
    runCommand(`docker restart ${req.botToken}`, res);
});

// Nieuwe Docker container maken
app.post("/create", authenticate, (req, res) => {
    const containerName = req.botToken;
    const command = `docker run -d --name ${containerName} -v $(pwd)/default.zip:/default.zip ${DOCKER_IMAGE} bash -c "\
        apt update && apt install -y unzip jq npm && \
        unzip /default.zip -d / && \
        jq --arg token '${req.botToken}' '.token = $token' /config.json > /config.tmp.json && \
        mv /config.tmp.json /config.json && \
        npm install && \
        node index.js"`;
    runCommand(command, res);
});

// Docker container verwijderen
app.post("/remove", authenticate, (req, res) => {
    runCommand(`docker rm -f ${req.botToken}`, res);
});

// Bestand toevoegen/wijzigen binnen container
app.post("/add-file", authenticate, (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || !content) return res.status(400).json({ error: "Missing filePath or content" });
    const command = `echo "${content}" | docker exec -i ${req.botToken} tee ${filePath}`;
    runCommand(command, res);
});

// Bestand verwijderen binnen container
app.post("/remove-file", authenticate, (req, res) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Missing filePath" });
    const command = `docker exec ${req.botToken} rm -f ${filePath}`;
    runCommand(command, res);
});

app.listen(3000, () => {
    console.log("Docker Bot Manager API running on port 3000");
    exec("apt update && apt install -y docker.io nodejs npm unzip jq", (error, stdout, stderr) => {
        if (error) return console.error(stderr || error.message);
        console.log(stdout.trim());
    });
    exec("docker pull node:22-bullseye", (error, stdout, stderr) => {
        if (error) return console.error(stderr || error.message);
        console.log(stdout.trim());
    });
});
