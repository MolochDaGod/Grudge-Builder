#!/usr/bin/env node
/**
 * One-shot helper: create a Railway project token for GitHub Actions.
 * Usage: node scripts/create-railway-project-token.mjs
 * Requires logged-in Railway CLI (reads ~/.railway/config.json accessToken).
 */
import fs from "fs";
import os from "os";
import path from "path";

const PROJECT_ID = "92f039ec-2cce-4e1e-b06a-dd0ac6256d70";
const ENVIRONMENT_ID = "3c33203b-c01e-44f2-b4a5-943526e96981";
const TOKEN_NAME = "github-actions-grudge-api";

const cfgPath = path.join(os.homedir(), ".railway", "config.json");
const accessToken = JSON.parse(fs.readFileSync(cfgPath, "utf8")).user?.accessToken;
if (!accessToken) {
  console.error("No Railway accessToken in ~/.railway/config.json — run: railway login");
  process.exit(1);
}

const query = `mutation ProjectTokenCreate($input: ProjectTokenCreateInput!) {
  projectTokenCreate(input: $input)
}`;

const res = await fetch("https://backboard.railway.com/graphql/v2", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query,
    variables: {
      input: {
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        name: TOKEN_NAME,
      },
    },
  }),
});

const json = await res.json();
if (json.errors?.length) {
  console.error(JSON.stringify(json.errors, null, 2));
  process.exit(1);
}

const token = json.data?.projectTokenCreate;
if (!token) {
  console.error("No token in response:", JSON.stringify(json));
  process.exit(1);
}

// Print only the token (for piping to gh secret set)
process.stdout.write(token);