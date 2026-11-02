import fs from "fs";
import fsPromises from "fs/promises";

type WriteData = Parameters<typeof fsPromises.writeFile>[1];
type WriteOptions = Parameters<typeof fsPromises.writeFile>[2];

function toBuffer(data: WriteData, options?: WriteOptions): Buffer {
  if (typeof data !== "string") {
    return Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
  }

  const encoding =
    typeof options === "string"
      ? options
      : options && "encoding" in options
        ? options.encoding ?? "utf8"
        : "utf8";
  return Buffer.from(data, encoding);
}

/**
 * 仅当文件内容变化时才重写文件。
 *
 * 这可以减少提取阶段的无意义磁盘写入；上传阶段由 rclone --checksum 独立根据
 * 文件大小和 MD5 判断差异，不依赖这里保留的 mtime。
 */
export async function writeFileIfChanged(
  file: fs.PathLike,
  data: WriteData,
  options?: WriteOptions,
): Promise<boolean> {
  const next = toBuffer(data, options);

  try {
    const current = await fsPromises.readFile(file);
    if (current.equals(next)) {
      return false;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fsPromises.writeFile(file, data, options);
  return true;
}

export function writeFileSyncIfChanged(
  file: fs.PathLike,
  data: Parameters<typeof fs.writeFileSync>[1],
  options?: Parameters<typeof fs.writeFileSync>[2],
): boolean {
  const next = toBuffer(data as WriteData, options as WriteOptions);

  try {
    const current = fs.readFileSync(file);
    if (current.equals(next)) {
      return false;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  fs.writeFileSync(file, data, options);
  return true;
}
