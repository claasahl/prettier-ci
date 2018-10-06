import * as gh from "@octokit/rest";
import { checks} from "../actions/github"
import { Context } from 'probot'
import { Config } from "../types";

export async function requested (context: Context, config: Config): Promise<void> {
  await checks.create(context, config, requested2ChecksCreateParams)
}

function requested2ChecksCreateParams(context: Context, config: Config): gh.ChecksCreateParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_suite.head_sha
  return { owner, repo, name: config.checks.name, head_sha }
}
