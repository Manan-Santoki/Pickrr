#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function ensureSqliteDirectory() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.startsWith("file:")) {
    return;
  }

  let filePath = databaseUrl.slice("file:".length);
  if (!filePath) {
    return;
  }

  // Handles Prisma SQLite URLs like:
  // file:/app/data/pickrr.db, file:./dev.db
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveStartCommand() {
  const standaloneServer = path.join(process.cwd(), "server.js");
  if (fs.existsSync(standaloneServer)) {
    return { cmd: "node", args: [standaloneServer] };
  }

  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  if (fs.existsSync(nextBin)) {
    return { cmd: "node", args: [nextBin, "start"] };
  }

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return { cmd: npxCmd, args: ["next", "start"] };
}

ensureSqliteDirectory();

const { cmd, args } = resolveStartCommand();
const child = spawn(cmd, args, {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
