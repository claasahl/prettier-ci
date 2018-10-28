import * as fs from "fs";

export function readdirp(dir: string): string[] {
    const files: string[] = []
    for(const file of fs.readdirSync(dir)) {
      const stat = fs.statSync(dir + "/" + file);
      if(stat.isFile()) {
        files.push(dir + "/" + file);
      } else if(stat.isDirectory()) {
        files.push(...readdirp(dir + "/" + file))
      }
    }
    return files;
  }
