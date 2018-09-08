import { Context } from 'probot'
import * as checks from '../actions/checks'
import { ChecksCreateParams } from '../types'

export async function requested (context: Context): Promise<void> {
  const { github, log } = context
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_suite.head_sha
  await checks.create({ github, log, owner, repo, head_sha })
}

export async function requested2 (context: Context): Promise<ChecksCreateParams> {
  const { github, log } = context
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_suite.head_sha
  return { github, log, owner, repo, head_sha }
}
