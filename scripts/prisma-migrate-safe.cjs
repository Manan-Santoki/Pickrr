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

function isTruthy(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
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

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL.trim();
  }

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  const lines = envText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (!trimmed.startsWith("DATABASE_URL=")) {
      continue;
    }

    let value = trimmed.slice("DATABASE_URL=".length).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return null;
}

function resolveAll(mode) {
  for (const migration of listMigrations()) {
    runPrisma(["migrate", "resolve", `--${mode}`, migration], { stdio: "ignore" });
  }
}

function schemaDiffState() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    return "unknown";
  }

  const result = runPrisma(
    [
      "migrate",
      "diff",
      "--from-url",
      databaseUrl,
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

function pushSchema(allowOverwrite) {
  const args = ["db", "push", "--skip-generate"];
  if (allowOverwrite) {
    args.push("--accept-data-loss");
  }

  const result = runPrisma(args);
  return result.status === 0;
}

function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.log("No prisma/migrations directory found; skipping migrate deploy.");
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
    const allowOverwrite = isTruthy(process.env.PRISMA_MIGRATE_ALLOW_OVERWRITE);
    const modeLabel = allowOverwrite ? "with overwrite enabled" : "without overwrite";
    console.log(`Database schema differs from Prisma schema; attempting generic db push fallback (${modeLabel})...`);
    if (pushSchema(allowOverwrite)) {
      console.log("db push succeeded; baselining migration history.");
      resolveAll("applied");
      process.exit(deployMigrations() ? 0 : 1);
    }

    if (!allowOverwrite) {
      console.error("Set PRISMA_MIGRATE_ALLOW_OVERWRITE=true to allow db push with data-loss acceptance.");
    }

    console.error("db push fallback failed; cannot auto-recover safely.");
  } else {
    console.error("Could not compare database schema with Prisma schema.");
  }

  process.exit(1);
}

main();
