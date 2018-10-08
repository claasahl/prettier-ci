import * as gh from "@octokit/rest";
import { gitdata, checks, repos, pullRequests } from "../actions/github"
import { Context } from 'probot'
import * as prettier from "prettier"

import { Projection, Overwrite, Config } from '../types';
import btoa from "btoa";
import atob from "atob";
import * as pug from "pug"

export async function created(context: Context, config: Config): Promise<void> {
  await markCheckAsInProgress(context, config);
  const {files, ref} = await fetchModifiedFiles(context, config);
  const results: {file: string, passed: boolean}[] = [];
  for(const file of files) {
    const {content} = await fetchContent({context, config, file, sha: ref})
    const {passed} = await checkContent({context, config, file, content})
    results.push({file, passed})
  }
  const report = asReport(results, config)
  await markCheckAsCompleted({context, config, report})
}

function created2ChecksUpdateParams(params: Partial<gh.ChecksUpdateParams>): Projection<gh.ChecksUpdateParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const check_run_id = `${context.payload.check_run.id}`
    return { ...params, owner, repo, check_run_id }
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
    return { owner, repo, ref: head_branch, ...params }
  }
}

async function markCheckAsInProgress(context: Context, config: Config): Promise<Context> {
  const result = await checks.update(context, config, created2ChecksUpdateParams({status: "in_progress"}));
  return result.context
}

async function fetchModifiedFiles(context: Context, config: Config): Promise<{context: Context, files: string[], ref: string}> {
  const commits = await repos.compareCommits(context, config, created2ReposCompareCommitsParams)
  const {head} = created2ReposCompareCommitsParams(context)
  const files: string[] = commits.response.data.files.filter((file: any) => file.status !== "removed").map((file: any) => file.filename)
  return {context, files, ref: head}
}

async function fetchContent(data: {context: Context, config: Config, file: string, sha: string}): Promise<{context: Context, file: string, content: string, sha: string}> {
  const result = await repos.getContent(data.context, data.config, created2ReposGetContent({path: data.file, ref: data.sha}))
  if(result.response.data.encoding === 'base64') {
    const content = atob(result.response.data.content);
    return {context: result.context, file: data.file, content, sha: result.response.data.sha}
  } else {
    const {context, file, sha} = data
    throw new Error(pug.render(data.config.errors.repos.encoding_not_supported, {context, file, sha}))
  }
}

async function checkContent(data: {context: Context, config: Config, file: string, content: string}): Promise<{context: Context, file: string, passed: boolean}> {
  const passed = await prettier.check(data.content, {filepath: data.file})
  return {context: data.context, file: data.file, passed}
}

async function formatContent(data: {context: Context, file: string, content: string}): Promise<{context: Context, file: string, content: string}> {
  const formatted = await prettier.format(data.content, {filepath: data.file})
  return {context: data.context, file: data.file, content: formatted}
}

async function markCheckAsCompleted(data: {context: Context, config: Config, report: Partial<gh.ChecksUpdateParams>}): Promise<Context> {
  const completed_at = new Date().toISOString()
  const result = await checks.update(data.context, data.config, created2ChecksUpdateParams({...data.report, status: "completed", completed_at}))
  return result.context
}


export async function rerequested(context: Context, config: Config): Promise<void> {
   await checks.create(context, config, rerequested2ChecksCreateParams)
}

function rerequested2ChecksCreateParams(context: Context, config: Config): gh.ChecksCreateParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const head_sha = context.payload.check_run.head_sha
  return { owner, repo, name: config.checks.name, head_sha }
}

interface FileCheck {
  file: string,
  passed: boolean
}


function asReport(results: FileCheck[], config: Config): Partial<gh.ChecksUpdateParams> {
  const failedResults = results.filter(result => !result.passed)
  const passed = failedResults.length === 0
  const summary = pug.render(config.checks.output.summary, {results, failedResults, passed, config})
  const text = pug.render(config.checks.output.text, {results, failedResults, passed, config})
  let actions: gh.ChecksUpdateParamsActions[] = []
  if (!passed) {
    actions.push(config.checks.actions.fix)
  }
  return {output: { title: config.checks.output.title, summary, text }, conclusion: passed ? "success" : "failure", actions}
}


export async function requested_action(context: Context, config: Config): Promise<void> {
  const {identifier} = context.payload.requested_action;
  if(identifier === config.checks.actions.fix.identifier) {
    await requested_action_fix(context, config)
  } else {
    throw new Error(pug.render(config.errors.checks.action_not_supported, {context}))
  }
}

async function requested_action_fix(context: Context, config: Config): Promise<Context> {
  const createReference = await gitdata.createReference(context, config, fix2CreateReferenceParams)
  const branch = createReference.response.data.ref
  const {files} = await fetchModifiedFiles(context, config);
  const results: {file: string, passed: boolean}[] = [];
  for(const file of files) {
    const {content, sha} = await fetchContent({context, config, file, sha: branch})
    const {passed} = await checkContent({context, config, file, content})
    if(!passed) {
      const formatted = await formatContent({context, file, content})
      await repos.updateFile(context, config, fix2ReposUpdateFileParams({path: file, content: btoa(formatted.content), branch, sha}))
    }
    results.push({file, passed})
  }
  const body = pug.render(config.pullRequests.body, {context, results})
  const { response } = await pullRequests.create(context, config, fix2PullRequestsCreateParams({head: branch, body, maintainer_can_modify: true}))
  pullRequests.merge(context, config, fix2PullRequestsMergeParams({number: response.data.number}))
  // delete branch
  return context 
}

function fix2CreateReferenceParams(context: Context, config: Config): gh.GitdataCreateReferenceParams {
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const ref = pug.render(config.pullRequests.branch, {context})
  const sha = context.payload.check_run.head_sha
  return { owner, repo, ref, sha }
}

function fix2ReposUpdateFileParams(params: Overwrite<Partial<gh.ReposUpdateFileParams>, {path: string, content: string, branch: string, sha: string}>): Projection<gh.ReposUpdateFileParams> {
  return (context, config) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const message = pug.render(config.commitMessage, {context, params})
    return { ...params, owner, repo, message }
  }
}

function fix2PullRequestsCreateParams(params: Overwrite<Partial<gh.PullRequestsCreateParams>, {head: string, body: string}>): Projection<gh.PullRequestsCreateParams> {
  return (context, config) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const base = context.payload.check_run.check_suite.head_branch
    const title = pug.render(config.pullRequests.title, {context})
    return { ...params, owner, repo, title, base }
  }
}

function fix2PullRequestsMergeParams(params: Overwrite<Partial<gh.PullRequestsMergeParams>, {number: number}>): Projection<gh.PullRequestsMergeParams> {
  return (context) => {
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    return { owner, repo, ...params }
  }
}
