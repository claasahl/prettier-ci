import * as fs from "fs";
import rimraf from "rimraf";
import { promisify } from "util";

const rmrf = promisify(rimraf);

export function readdirp(dir: string): string[] {
  const files: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    const stat = fs.statSync(dir + "/" + file);
    if (stat.isFile()) {
      files.push(dir + "/" + file);
    } else if (stat.isDirectory()) {
      files.push(...readdirp(dir + "/" + file));
    }
  }
  return files;
}

export async function removedirp(dir: string) {
  return rmrf(dir);
}