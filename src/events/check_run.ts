import { Context } from "probot";
import * as git from "isomorphic-git";
import * as params from "../checks_params";
import * as prettier from "prettier";
import memoryFs from "memory-fs";


export async function rerequested(context: Context): Promise<void> {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const sha = context.payload.check_run.head_sha;
  await context.github.checks.create({
    ...params.createParams(),
    owner,
    repo,
    head_sha: sha
  });
}

export async function created(context: Context): Promise<void> {
  const fs = new memoryFs()

  // #2.1
  const check_run_id = context.payload.check_run.id;
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  await context.github.checks.update({
    ...params.inProgressParams(),
    check_run_id,
    owner,
    repo
  });

  // #2.2
  const dir = '/';
  const url = context.payload.repository.clone_url;
  const ref = context.payload.check_run.head_sha;
  await git.clone({ dir, url, fs });
  await git.checkout({ dir, ref, fs });

  // #2.3
  const skipped: string[] = []
  const passed: string[] = []
  const failed: string[] = []
  for(const file of readdirp(fs, dir)) {
    const info = await prettier.getFileInfo(file);
    if(info.ignored) {
      skipped.push(file);
    } else {
      const content = fs.readFileSync(file)
      const formatted = prettier.check(content, {filepath: file});
      (formatted ? passed : failed).push(file);
    }
  }
  const failedCheck = failed.length > 0;
  
  // #2.4
  await context.github.checks.update({
    ...(failedCheck ? params.failureParams(skipped, passed, failed) : params.successParams(skipped, passed, failed)),
    check_run_id,
    owner,
    repo
  });
}

function readdirp(fs: memoryFs, dir: string): string[] {
  const files: string[] = []
  for(const file of fs.readdirSync(dir)) {
    const stat = fs.statSync(file);
    if(stat.isFile()) {
      files.push(file);
    } else if(stat.isDirectory()) {
      files.push(...readdirp(fs, dir + "/" + file))
    }
  }
  return files;
}