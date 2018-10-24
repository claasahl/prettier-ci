import { Context } from "probot";
import * as git from "isomorphic-git";
import * as shelljs from "shelljs";
import * as params from "../checks_params";

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
  const dir = `./repos/${owner}/${repo}`;
  const url = context.payload.repository.clone_url;
  const ref = context.payload.check_run.head_sha;
  if (shelljs.test("-e", dir)) {
    await context.github.checks.update({
      ...params.cancelledParams(),
      check_run_id,
      owner,
      repo
    });
    return;
  }
  await git.clone({ dir, url });
  await git.checkout({ dir, ref });

  // #2.3
  const result = shelljs.exec(
    `cd ${dir} && prettier -l --write ./**`
  );
  const skipped = result.stderr.trim().split(/\r?\n/).map(file => file.trim()).filter(file => file.length > 0);
  const passed = [] as string[];
  const failed = result.stdout.trim().split(/\r?\n/).map(file => file.trim()).filter(file => file.length > 0);
  const failedCheck = failed.length > 0;

  // #2.4
  await context.github.checks.update({
    ...(failedCheck ? params.failureParams(skipped, passed, failed) : params.successParams(skipped, passed, failed)),
    check_run_id,
    owner,
    repo
  });

  // #2.5
  shelljs.rm("-rf", dir);
}
