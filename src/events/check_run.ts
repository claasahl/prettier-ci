import { Context } from "probot";
import * as params from "../checks_params";
import { Config } from "../types";
import { check } from "../checks";


export async function rerequested(context: Context, config: Config): Promise<void> {
  const {owner, repo} = context.repo();
  const sha = context.payload.check_run.head_sha;
  await context.github.checks.create({
    ...params.createParams(config),
    owner,
    repo,
    head_sha: sha
  });
}

export async function created(context: Context, config: Config): Promise<void> {
  const {owner, repo} = context.repo();
  const check_run_id = context.payload.check_run.id;
  const base = {owner, repo, check_run_id}
  await context.github.checks.update({
    ...params.inProgressParams(config),
    ...base
  });

  try {
    const { skipped, passed, failed } = await check(context)
    const failedCheck = failed.length > 0;

    // opt-in auto-formatting
    // if(config) {
    //   const branch = context.payload.check_run.check_suite.head_branch;
    //   await git.checkout({dir, fs, ref: branch})
    //   for (const file of readdirp(dir)) {
    //     const shortFileName = file.replace(dir, "");
    //     const info = await prettier.getFileInfo(file);
    //     if (info.ignored || !info.inferredParser) {
    //       // nothing to do
    //     } else {
    //       const content = fs.readFileSync(file).toString();
    //       const formatted = prettier.check(content, { filepath: file });
    //       if(!formatted) {
    //         const formattedContent = prettier.format(content, { filepath: file });
    //         fs.writeFileSync(file, formattedContent);
    //         await git.add({dir, fs, filepath: file})
    //       }
    //       (formatted ? passed : failed).push(shortFileName);
    //     }
    //   }
    // }

    // #2.4
    await context.github.checks.update({
      ...(failedCheck
        ? params.failureParams(config, skipped, passed, failed)
        : params.successParams(config, skipped, passed, failed)),
        ...base
    });
  } catch (error) {
    await context.github.checks.update({
      ...params.cancelledParams(config),
      ...base
    });
  }
}
