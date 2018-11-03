import { Context } from "probot";
import { createParams } from "../checks_params";
import { Config } from "../config";

export async function requested(context: Context, config: Config): Promise<void> {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const sha = context.payload.check_suite.head_sha;
  await context.github.checks.create({
    ...createParams(config),
    owner,
    repo,
    head_sha: sha
  });
}

export async function rerequested(context: Context, config: Config): Promise<void> {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const sha = context.payload.check_suite.head_sha;
  await context.github.checks.create({
    ...createParams(config),
    owner,
    repo,
    head_sha: sha
  });
}
