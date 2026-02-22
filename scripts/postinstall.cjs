#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);

if (process.env.NODE_ENV !== "production") {
  console.log("Skipping prisma migrate deploy during postinstall (NODE_ENV is not production).");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log("Skipping prisma migrate deploy during postinstall (DATABASE_URL is not set).");
  process.exit(0);
}

console.log("Running prisma migrate deploy during postinstall...");
run("node", [path.join("scripts", "prisma-migrate-safe.cjs")]);
