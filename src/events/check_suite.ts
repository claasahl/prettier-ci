import * as rx from "rxjs";
import * as gh from "@octokit/rest";
import { rxChecks} from "../reactivex/rxGithub"
import { Context } from 'probot'

import { CHECKS_NAME } from '../utils';
import { map } from 'rxjs/operators';

export function requested (context: Context): rx.Observable<Context> {
  return rxChecks.create(context, requested2ChecksCreateParams)
  .pipe(map(r => r.context))
}

function requested2ChecksCreateParams(context: Context): gh.ChecksCreateParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_suite.head_sha
  return { owner, repo, name: CHECKS_NAME, head_sha }
}
