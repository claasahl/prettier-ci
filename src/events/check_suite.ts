import * as gh from "@octokit/rest";
import { promiseChecks} from "../reactivex/rxGithub"
import { Context } from 'probot'

import { CHECKS_NAME } from '../utils';

export async function requested (context: Context): Promise<Context> {
  await promiseChecks.create(context, requested2ChecksCreateParams)
  return context
}

function requested2ChecksCreateParams(context: Context): gh.ChecksCreateParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_suite.head_sha
  return { owner, repo, name: CHECKS_NAME, head_sha }
}
