#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");

const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const shouldZip = process.argv.includes("--zip");

function resolveDefaultSourceApp() {
  const candidates = [
    "QClaw_0.1.2-arm64.app",
    "QClaw-0.1.2-x64.app",
    "QClaw_0.1.2.app",
  ].map((name) => path.join(workspaceRoot, name));

  const matched = candidates.find((candidate) => fs.existsSync(candidate));
  if (matched) {
    return matched;
  }

  throw new Error(
    `No default 0.1.2 source app found under ${workspaceRoot}. Pass the source .app path explicitly.`,
  );
}

function resolveDefaultTargetApp(sourcePath) {
  const sourceName = path.basename(sourcePath);
  const targetName = sourceName.replace(/^QClaw[-_]?/, "OpenQClaw-");
  return path.join(path.dirname(sourcePath), targetName);
}

const sourceApp = path.resolve(positionalArgs[0] ?? resolveDefaultSourceApp());
const targetApp = path.resolve(positionalArgs[1] ?? resolveDefaultTargetApp(sourceApp));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function replaceExact(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Missing patch anchor: ${label}`);
  }
  return content.replace(from, to);
}

function replaceRegex(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Missing patch anchor: ${label}`);
  }
  return content.replace(pattern, replacement);
}

function patchMainChunk(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  content = replaceExact(
    content,
    'function KP(){const e=pS(),t=Z(!1),n=Z("");let r=null;const a=Z(!1),i=async B=>{var V,z,ge;if(a.value){await B();return}const Q=yt.getUserId();n.value=Q;try{const we=await yt.checkInviteCode({user_id:Q}),ce=((z=(V=we.data)==null?void 0:V.resp)==null?void 0:z.data)??((ge=we.data)==null?void 0:ge.data)??we.data;we.success&&(ce==null?void 0:ce.already_verified)===!0?(a.value=!0,await B()):(r=async()=>{await B()},t.value=!0)}catch{r=async()=>{await B()},t.value=!0}},o=async()=>{',
    'function KP(){const e=pS(),t=Z(!1),n=Z("");let r=null;const a=Z(!0),i=async B=>{await B()},o=async()=>{',
    "chat invite gate",
  );

  content = replaceExact(
    content,
    'const y=C.updateStrategy||"ignore";y==="force"?_.value=!0:y==="recommend"&&(_.value=!1),b(c.value,l.value)?(s.value="found",_.value&&o("force-update-started")):s.value="latest"',
    'const y=C.updateStrategy||"ignore";_.value=!1,b(c.value,l.value)?s.value="found":s.value="latest"',
    "update modal force mode",
  );

  content = replaceExact(
    content,
    'h=()=>{_.value&&s.value!=="latest"||o("close")}',
    'h=()=>{o("close")}',
    "update modal close guard",
  );

  content = replaceExact(
    content,
    'return Dt(()=>{Be(),Ye(),et(),Ee(),e.isLoggedIn.value&&cr(),an(),m(),pa(ma.EXPO,{page_id:"Home_Page",action_type:"Start"})}),',
    'return Dt(()=>{Be(),Ye(),et(),Ee(),e.isLoggedIn.value&&cr(),an(),pa(ma.EXPO,{page_id:"Home_Page",action_type:"Start"})}),',
    "startup update check",
  );

  fs.writeFileSync(filePath, content);
}

function patchWxLoginChunk(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  content = replaceRegex(
    content,
    /Z=async o=>\{var e,t,l;try\{const a=await v\.checkInviteCode\(\{user_id:x\.value\}\);[^]*?\},D=async\(\)=>\{/,
    'Z=async o=>{o()},D=async()=>{',
    "wx invite gate",
  );

  fs.writeFileSync(filePath, content);
}

function main() {
  if (!fs.existsSync(sourceApp)) {
    throw new Error(`Source app not found: ${sourceApp}`);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openqclaw-012-"));
  const extractedDir = path.join(tempRoot, "app-extracted");

  fs.rmSync(targetApp, { recursive: true, force: true });
  run("ditto", [sourceApp, targetApp]);

  const targetAsar = path.join(targetApp, "Contents", "Resources", "app.asar");
  run("npx", ["-y", "@electron/asar", "extract", targetAsar, extractedDir]);

  patchMainChunk(path.join(extractedDir, "out", "renderer", "assets", "index-BRreSJaD.js"));
  patchWxLoginChunk(
    path.join(extractedDir, "out", "renderer", "assets", "WXLoginView-BZlJJJpy.js"),
  );

  fs.rmSync(targetAsar, { force: true });
  run("npx", ["-y", "@electron/asar", "pack", extractedDir, targetAsar]);

  const infoPlist = path.join(targetApp, "Contents", "Info.plist");
  run("plutil", ["-remove", "ElectronAsarIntegrity", infoPlist]);

  fs.rmSync(path.join(targetApp, "Contents", "_CodeSignature"), {
    recursive: true,
    force: true,
  });
  run("codesign", ["--force", "--deep", "--sign", "-", targetApp]);

  if (shouldZip) {
    const zipPath = `${targetApp}.zip`;
    fs.rmSync(zipPath, { force: true });
    run(
      "ditto",
      ["-c", "-k", "--sequesterRsrc", "--keepParent", path.basename(targetApp), path.basename(zipPath)],
      { cwd: path.dirname(targetApp) },
    );
    if (!fs.existsSync(targetApp)) {
      throw new Error(`Target app disappeared after zipping: ${targetApp}`);
    }
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
}

main();
