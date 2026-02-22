#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

function runPrisma(args, options = {}) {
  const useLocalCli = fs.existsSync(prismaCli);
  const cmd = useLocalCli ? "node" : "npx";
  const finalArgs = useLocalCli ? [prismaCli, ...args] : ["prisma", ...args];
  const result = spawnSync(cmd, finalArgs, {
    stdio: options.stdio ?? "inherit",
    env: process.env,
    shell: false,
  });

  return {
    status: result.status ?? 1,
    error: result.error,
  };
}

function listMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function resolveAll(mode) {
  for (const migration of listMigrations()) {
    runPrisma(["migrate", "resolve", `--${mode}`, migration], { stdio: "ignore" });
  }
}

function schemaDiffState() {
  if (!process.env.DATABASE_URL) {
    return "unknown";
  }

  const result = runPrisma(
    [
      "migrate",
      "diff",
      "--from-url",
      process.env.DATABASE_URL,
      "--to-schema-datamodel",
      schemaPath,
      "--exit-code",
    ],
    { stdio: "ignore" }
  );

  if (result.status === 0) {
    return "match";
  }

  if (result.status === 2) {
    return "diff";
  }

  return "unknown";
}

function deployMigrations() {
  const result = runPrisma(["migrate", "deploy"]);
  return result.status === 0;
}

function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.log("No prisma/migrations directory found; skipping migrate deploy.");
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set; skipping migrate deploy.");
    process.exit(0);
  }

  console.log("Applying Prisma migrations...");
  if (deployMigrations()) {
    process.exit(0);
  }

  console.log("migrate deploy failed; attempting generic failed-migration recovery...");
  resolveAll("rolled-back");
  if (deployMigrations()) {
    process.exit(0);
  }

  const state = schemaDiffState();
  if (state === "match") {
    console.log("Database schema matches Prisma schema; baselining migration history.");
    resolveAll("applied");
    process.exit(deployMigrations() ? 0 : 1);
  }

  if (state === "diff") {
    console.error("Database schema differs from Prisma schema; cannot auto-baseline safely.");
  } else {
    console.error("Could not compare database schema with Prisma schema.");
  }

  process.exit(1);
}

main();
