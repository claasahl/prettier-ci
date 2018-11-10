import { Context } from "probot";
import { createParams } from "../checks_params";
import { Config } from "../types";

export async function requested(
  context: Context,
  config: Config
): Promise<void> {
  const { owner, repo } = context.repo();
  const sha = context.payload.check_suite.head_sha;
  await context.github.checks.create({
    ...createParams(config),
    owner,
    repo,
    head_sha: sha
  });
}

export async function rerequested(
  context: Context,
  config: Config
): Promise<void> {
  const { owner, repo } = context.repo();
  const sha = context.payload.check_suite.head_sha;
  await context.github.checks.create({
    ...createParams(config),
    owner,
    repo,
    head_sha: sha
  });
}
