import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// dotenv 按顺序采用首个值：进程环境变量 > 可选的 .env.local > .env。
dotenv.config({
  path: [".env.local", ".env"].map(name => fileURLToPath(new URL(name, import.meta.url))),
});

export function getS3Config() {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3?.trim() || process.env.AWS_ENDPOINT_URL?.trim())?.replace(/\/+$/, "");
  const bucket = process.env.S3_BUCKET?.trim();
  const prefix = process.env.S3_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  const region = process.env.AWS_REGION?.trim();

  if (!endpoint || !bucket || !prefix || !region
    || !process.env.AWS_ACCESS_KEY_ID?.trim() || !process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
    return undefined;
  }

  return { endpoint, bucket, prefix, region };
}
