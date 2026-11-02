import { spawn } from "node:child_process";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { stat } from "node:fs/promises";
import { constants } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getS3Config } from "./s3";

const defaultOutputDirectory = fileURLToPath(new URL("./output/", import.meta.url));

interface UploadOptions {
  dryRun?: boolean;
  outputDirectory?: string;
  platform?: NodeJS.Platform;
  spawnProcess?: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
}

export async function upload({
  dryRun = false,
  outputDirectory = defaultOutputDirectory,
  platform = process.platform,
  spawnProcess = spawn,
}: UploadOptions = {}): Promise<number> {
  const config = getS3Config();
  if (!config) {
    console.error("[upload] Missing S3-compatible storage configuration. Check AWS credentials, region, endpoint, S3_BUCKET and S3_PREFIX in .env, optional .env.local or the process environment.");
    return 1;
  }

  if (!(await stat(outputDirectory).catch(() => undefined))?.isDirectory()) {
    console.error(`[upload] Output directory not found: ${outputDirectory}`);
    return 1;
  }

  const command = platform === "win32" ? "rclone.exe" : "rclone";
  const args = [
    "copy", outputDirectory, `:s3:${config.bucket}/${config.prefix}`,
    "--s3-provider", process.env.RCLONE_S3_PROVIDER?.trim() || "Other",
    "--s3-env-auth",
    "--s3-region", config.region,
    "--s3-endpoint", config.endpoint,
    "--checksum", "--fast-list", "--progress", "--stats", "1s",
    "--transfers", "256", "--checkers", "64", "--buffer-size", "0",
    "--s3-no-head", "--s3-disable-http2", "--s3-no-check-bucket",
  ];
  if (dryRun) args.push("--dry-run");

  console.log(`[upload] rclone copy output -> configured S3-compatible destination${dryRun ? " (dry run)" : ""}`);
  return new Promise<number>((resolveExit) => {
    const child = spawnProcess(command, args, {
      cwd: fileURLToPath(new URL(".", import.meta.url)),
      env: { ...process.env, AWS_REGION: config.region },
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      console.error(error.code === "ENOENT"
        ? "[upload] rclone was not found. Install rclone and add it to PATH."
        : `[upload] Could not start rclone: ${error.message}`);
      resolveExit(1);
    });
    child.once("close", (code, signal) => {
      if (signal) {
        console.error(`[upload] rclone terminated by ${signal}.`);
        resolveExit(128 + (constants.signals[signal] ?? 0));
      } else {
        resolveExit(code ?? 1);
      }
    });
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: tsx upload.ts [--dry-run]\nRequires rclone on PATH. Configuration: process environment > .env.local > .env.");
  } else if (args.some(arg => arg !== "--dry-run")) {
    console.error("[upload] Unknown argument. Usage: tsx upload.ts [--dry-run]");
    process.exitCode = 1;
  } else {
    try {
      process.exitCode = await upload({ dryRun: args.includes("--dry-run") });
    } catch (error) {
      console.error(`[upload] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
