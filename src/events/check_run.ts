import * as gh from "@octokit/rest";
import { gitdata, checks, repos, pullRequests } from "../reactivex/rxGithub"
import { Context } from 'probot'
import * as prettier from "prettier"

import { CHECKS_NAME, REFERENCE_PREFIX, COMMIT_MESSAGE_PREFIX, PULL_REQUEST_TITLE_PREFIX } from '../utils';
import { Projection, Overwrite } from '../types';
import btoa from "btoa";
import atob from "atob";

export async function created(context: Context): Promise<Context> {
  await markCheckAsInProgress(context);
  const {files} = await fetchModifiedFiles(context);
  const results: {file: string, passed: boolean}[] = [];
  for(const file of files) {
    const {content} = await fetchContent({context, file})
    const {passed} = await checkContent({context, file, content})
    results.push({file, passed})
  }
  const report = asReport(results)
  await markCheckAsCompleted({context, report})
  return context
}

function created2ChecksUpdateParams(params: Partial<gh.ChecksUpdateParams>): Projection<gh.ChecksUpdateParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const check_run_id = context.payload.check_run.id
    return { ...params, owner, repo, name: CHECKS_NAME, check_run_id }
  }
}

function created2ReposCompareCommitsParams(context: Context): gh.ReposCompareCommitsParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const { before, after } = context.payload.check_run.check_suite
  return { owner, repo, head: after, base: before }
}

function created2ReposGetContent(params: Overwrite<Partial<gh.ReposGetContentParams>, {path: string}>): Projection<gh.ReposGetContentParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const { head_branch } = context.payload.check_run.check_suite
    return { ...params, owner, repo, ref: head_branch }
  }
}

async function markCheckAsInProgress(context: Context): Promise<Context> {
  const result = await checks.update(context, created2ChecksUpdateParams({status: "in_progress"}));
  return result.context
}

async function fetchModifiedFiles(context: Context): Promise<{context: Context, files: string[]}> {
  const commits = await repos.compareCommits(context, created2ReposCompareCommitsParams)
  const files: string[] = commits.response.data.files.filter((file: any) => file.status !== "deleted").map((file: any) => file.filename)
  return {context, files}
}

async function fetchContent(data: {context: Context, file: string}): Promise<{context: Context, file: string, content: string, sha: string}> {
  const result = await repos.getContent(data.context, created2ReposGetContent({path: data.file}))
  if(result.response.data.encoding === 'base64') {
    const content = atob(result.response.data.content);
    return {context: result.context, file: data.file, content, sha: result.response.data.sha}
  } else {
    throw new Error("unsupported encoding '"+result.response.data.encoding+"' for file '"+data.file+"'")
  }
}

async function checkContent(data: {context: Context, file: string, content: string}): Promise<{context: Context, file: string, passed: boolean}> {
  const passed = await prettier.check(data.content, {filepath: data.file})
  return {context: data.context, file: data.file, passed}
}

async function formatContent(data: {context: Context, file: string, content: string}): Promise<{context: Context, file: string, content: string}> {
  const formatted = await prettier.format(data.content, {filepath: data.file})
  return {context: data.context, file: data.file, content: formatted}
}

async function markCheckAsCompleted(data: {context: Context, report: Partial<gh.ChecksUpdateParams>}): Promise<Context> {
  const completed_at = new Date().toISOString()
  const result = await checks.update(data.context, created2ChecksUpdateParams({...data.report, status: "completed", completed_at}))
  return result.context
}


export async function rerequested(context: Context): Promise<Context> {
   await checks.create(context, rerequested2ChecksCreateParams)
   return context
}

function rerequested2ChecksCreateParams(context: Context): gh.ChecksCreateParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_run.head_sha
  return { owner, repo, name: CHECKS_NAME, head_sha }
}

interface FileCheck {
  file: string,
  passed: boolean
}


function asReport(results: FileCheck[]): Partial<gh.ChecksUpdateParams> {
  const failedResults = results.filter(result => !result.passed)
  const passed = failedResults.length === 0
  const summary = passed ? 'Pretty. Keep up the **good work**.' : `Found ${failedResults.length} files which could be *prettier*`
  let text: string | undefined
  let actions: gh.ChecksUpdateParamsActions[] = []
  if (!passed) {
    text = 'Here is a list of files which be *prettier*.\r\n'
    failedResults.forEach(result => {
      text += `* ${result.file}\r\n`
    })

    actions.push({
      label: "Fix",
      description: "Make files *prettier*.",
      identifier: "fix"
    })
  }
  return {output: { title: 'Prettier', summary, text }, conclusion: passed ? "success" : "failure", actions}
}


export async function requested_action(context: Context): Promise<Context> {
  const {identifier} = context.payload.requested_action;
  if(identifier === "fix") {
    return requested_action_fix(context)
  } else {
    throw new Error("unsupported action requested '"+identifier+"'")
  }
}

async function requested_action_fix(context: Context): Promise<Context> {
  const createReference = await gitdata.createReference(context, fix2CreateReferenceParams)
  const branch = createReference.response.data.ref
  const {files} = await fetchModifiedFiles(context);
  const results: {file: string, passed: boolean}[] = [];
  for(const file of files) {
    const {content, sha} = await fetchContent({context, file})
    const {passed} = await checkContent({context, file, content})
    if(!passed) {
      const formatted = await formatContent({context, file, content})
      await repos.updateFile(context, fix2ReposUpdateFileParams({path: file, content: btoa(formatted.content), branch, sha}))
    }
    results.push({file, passed})
  }
  const body = asPullRequestBody(context, results)
  await pullRequests.create(context, fix2PullRequestsCreateParams({head: branch, body, maintainer_can_modify: true}))
  return context 
}

function fix2CreateReferenceParams(context: Context): gh.GitdataCreateReferenceParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const ref = REFERENCE_PREFIX + context.payload.check_run.check_suite.head_branch
  const sha = context.payload.check_run.head_sha
  return { owner, repo, ref, sha }
}

function fix2ReposUpdateFileParams(params: Overwrite<Partial<gh.ReposUpdateFileParams>, {path: string, content: string, branch: string, sha: string}>): Projection<gh.ReposUpdateFileParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const message = COMMIT_MESSAGE_PREFIX + params.path
    return { ...params, owner, repo, message }
  }
}

function fix2PullRequestsCreateParams(params: Overwrite<Partial<gh.PullRequestsCreateParams>, {head: string, body: string}>): Projection<gh.PullRequestsCreateParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const base = context.payload.check_run.check_suite.head_branch
    const title = PULL_REQUEST_TITLE_PREFIX + base
    return { ...params, owner, repo, title, base }
  }
}

function asPullRequestBody(context: Context, results: FileCheck[]): string {
  const failedResults = results.filter(result => !result.passed)
  return `This [check run](${context.payload.check_run.html_url}) identified ${failedResults.length} files, which need formatting.

  @${context.payload.sender.login} requested these files to be fixed.`
}
