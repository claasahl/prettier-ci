import * as git from "isomorphic-git";
import * as prettier from "prettier";
import * as fs from "fs";
import { readdirp, removedirp } from "./util";
import { CheckResult } from "./types";
import { Context } from "probot";

export async function check(context: Context): Promise<CheckResult> {
  const { owner, repo } = context.repo();
  const check_run_id = context.payload.check_run.id;
  const dir = `./repos/${owner}-${repo}-${check_run_id}/`;
  const url = context.payload.repository.clone_url;
  const ref = context.payload.check_run.head_sha;
  try {
    // #2.2
    await git.clone({ dir, url, fs });
    await git.checkout({ dir, ref, fs });

    // #2.3
    const skipped: string[] = [];
    const passed: string[] = [];
    const failed: string[] = [];
    for (const file of readdirp(dir)) {
      const shortFileName = file.replace(dir, "");
      const info = await prettier.getFileInfo(file);
      if (info.ignored || !info.inferredParser) {
        skipped.push(shortFileName);
      } else {
        const content = fs.readFileSync(file).toString();
        const formatted = prettier.check(content, { filepath: file });
        (formatted ? passed : failed).push(shortFileName);
      }
    }
    return { skipped, passed, failed };
  } finally {
    await removedirp(dir);
  }
}
