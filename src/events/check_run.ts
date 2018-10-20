import { Context } from "probot";
import * as git from "isomorphic-git";
import * as shelljs from "shelljs";
import { createParams } from "../checks_params";

export async function rerequested(context: Context): Promise<void> {
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const sha = context.payload.check_run.head_sha;
    await context.github.checks.create({
        ...createParams(),
        owner,
        repo,
        head_sha: sha
    });
}

export async function created(context: Context): Promise<void> {
    // #2.1
    const check_run_id = context.payload.check_run.id;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    await context.github.checks.update({
      check_run_id,
      owner,
      repo,
      status: "in_progress"
    });

    // #2.2
    const dir = `./repos/${owner}/${repo}`;
    const url = context.payload.repository.clone_url;
    const ref = context.payload.check_run.head_sha;
    if (shelljs.test("-e", dir)) {
      const completed_at = new Date().toISOString();
      await context.github.checks.update({
        check_run_id,
        owner,
        repo,
        status: "completed",
        conclusion: "cancelled",
        completed_at
      });
      return;
    }
    await git.clone({ dir, url });
    await git.checkout({ dir, ref });

    // #2.3
    const { stdout: files } = shelljs.exec(`cd ${dir} && prettier -l --write ./**`);
    const formattedFiles = files.trim().split(/\r?\n/);
    const failedCheck = formattedFiles.length > 0

    // #2.4
    const completed_at = new Date().toISOString();
    await context.github.checks.update({
      check_run_id,
      owner,
      repo,
      status: "completed",
      conclusion: failedCheck ? "failure" : "success",
      completed_at
    });

    // #2.5
    shelljs.rm("-rf", dir);
  }