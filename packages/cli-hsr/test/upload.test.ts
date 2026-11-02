import assert from "node:assert/strict";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { upload } from "../upload";

const environment: Record<string, string> = {
  AWS_ACCESS_KEY_ID: "fixture-key",
  AWS_SECRET_ACCESS_KEY: "fixture-secret",
  AWS_REGION: "auto",
  AWS_ENDPOINT_URL: "https://generic.invalid/",
  AWS_ENDPOINT_URL_S3: "https://service.invalid/",
  S3_BUCKET: "fixture-bucket",
  S3_PREFIX: '/path with spaces/quoted"segment/',
  RCLONE_S3_PROVIDER: "Other",
};
const originalEnvironment: NodeJS.ProcessEnv = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
const errorMessages: string[] = [];
const fixture = await mkdtemp(join(tmpdir(), "dicloud-upload-test-"));
const outputDirectory = join(fixture, "output with spaces");
await mkdir(outputDirectory);

beforeEach(() => {
  Object.assign(process.env, environment);
  errorMessages.length = 0;
  mock.method(console, "log", () => {});
  mock.method(console, "error", (...messages: unknown[]) => { errorMessages.push(...messages.map(String)); });
});
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
after(async () => {
  assert.ok(fixture.startsWith(join(tmpdir(), "dicloud-upload-test-")));
  await rm(fixture, { recursive: true, force: true });
});

function transport({ code = 0, signal = null, error }: {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  error?: NodeJS.ErrnoException;
} = {}) {
  const calls: { command: string; args: string[]; options: SpawnOptions }[] = [];
  return {
    calls,
    spawnProcess(command: string, args: string[], options: SpawnOptions) {
      calls.push({ command, args, options });
      const child = new EventEmitter() as ChildProcess;
      queueMicrotask(() => {
        if (error) child.emit("error", error);
        else child.emit("close", code, signal);
      });
      return child;
    },
  };
}

for (const platform of ["win32", "linux", "darwin"] as const) {
  test(`uploads through the native executable on ${platform} without shell expansion`, async () => {
    const mock = transport();
    assert.equal(await upload({ outputDirectory, platform, spawnProcess: mock.spawnProcess }), 0);
    assert.equal(mock.calls.length, 1);
    const { command, args, options } = mock.calls[0];
    assert.equal(command, platform === "win32" ? "rclone.exe" : "rclone");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
    assert.equal(options.windowsHide, true);
    assert.deepEqual(args.slice(0, 3), ["copy", outputDirectory, ':s3:fixture-bucket/path with spaces/quoted"segment']);
    assert.equal(args[args.indexOf("--s3-endpoint") + 1], "https://service.invalid");
    assert.ok(args.includes("--checksum"));
    assert.ok(!args.includes("--dry-run"));
    assert.ok(!args.join(" ").includes(environment.AWS_SECRET_ACCESS_KEY));
    assert.equal(options.env?.AWS_ACCESS_KEY_ID, environment.AWS_ACCESS_KEY_ID);
    assert.equal(options.env?.AWS_SECRET_ACCESS_KEY, environment.AWS_SECRET_ACCESS_KEY);
    assert.equal(options.env?.AWS_REGION, "auto");
  });
}

test("missing configuration prevents starting any upload process", async () => {
  delete process.env.S3_BUCKET;
  const mock = transport();
  assert.equal(await upload({ outputDirectory, spawnProcess: mock.spawnProcess }), 1);
  assert.equal(mock.calls.length, 0);
});

test("missing output or a file used as output prevents starting any upload process", async () => {
  const mock = transport();
  assert.equal(await upload({ outputDirectory: join(fixture, "missing"), spawnProcess: mock.spawnProcess }), 1);
  const file = join(fixture, "not-a-directory");
  await writeFile(file, "fixture");
  assert.equal(await upload({ outputDirectory: file, spawnProcess: mock.spawnProcess }), 1);
  assert.equal(mock.calls.length, 0);
});

test("dry run is forwarded and the generic provider is used when unspecified", async () => {
  delete process.env.RCLONE_S3_PROVIDER;
  const mock = transport();
  assert.equal(await upload({ dryRun: true, outputDirectory, spawnProcess: mock.spawnProcess }), 0);
  const { args } = mock.calls[0];
  assert.ok(args.includes("--dry-run"));
  assert.equal(args[args.indexOf("--s3-provider") + 1], "Other");
});

test("rclone's nonzero exit code is preserved", async () => {
  const mock = transport({ code: 17 });
  assert.equal(await upload({ outputDirectory, spawnProcess: mock.spawnProcess }), 17);
});

test("a missing rclone executable returns a failure and an actionable message", async () => {
  const mock = transport({ error: Object.assign(new Error("not found"), { code: "ENOENT" }) });
  assert.equal(await upload({ outputDirectory, spawnProcess: mock.spawnProcess }), 1);
  assert.match(errorMessages[0], /add it to PATH/);
});

test("an interrupted upload returns the conventional signal exit code", async () => {
  const mock = transport({ code: null, signal: "SIGINT" });
  assert.equal(await upload({ outputDirectory, spawnProcess: mock.spawnProcess }), 130);
});
