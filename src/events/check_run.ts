import * as rx from "rxjs";
import * as gh from "@octokit/rest";
import { rxRepos, rxChecks, promiseChecks, promiseRepos } from "../reactivex/rxGithub"
import { rxPrettier }  from "../reactivex/rxPrettier"
import { Context } from 'probot'
import * as prettier from "prettier"

import { map, flatMap, reduce, tap } from 'rxjs/operators';
import { CHECKS_NAME } from '../utils';
import { Projection, Overwrite } from '../types';
import btoa from "btoa";

export async function createdd(context: Context): Promise<Context> {
  await _markCheckAsInProgress(context);
  const {files} = await _fetchModifiedFiles(context);
  const results: {file: string, passed: boolean}[] = [];
  for(const file of files) {
    const {content} = await _fetchContent({context, file})
    const {passed} = await _checkContent({context, file, content})
    results.push({file, passed})
  }
  const report = asReport(results)
  await _markCheckAsCompleted({context, report})
  return context
}

export function created(context: Context): rx.Observable<Context> {
  return rx.of(context).pipe(
    markCheckAsInProgress,
    fetchModifiedFiles,
    // skipBinaryFiles
    fetchContent,
    checkContent,
    compileReport,
    markCheckAsCompleted
  );
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

async function _markCheckAsInProgress(context: Context): Promise<Context> {
  const result = await promiseChecks.update(context, created2ChecksUpdateParams({status: "in_progress"}));
  return result.context
}

function markCheckAsInProgress(source: rx.Observable<Context>): rx.Observable<Context> {
  return source.pipe(
    flatMap(context => rxChecks.update(context, created2ChecksUpdateParams({status: "in_progress"}))),
    map(data => data.context)
    )
}

async function _fetchModifiedFiles(context: Context): Promise<{context: Context, files: string[]}> {
  const commits = await promiseRepos.compareCommits(context, created2ReposCompareCommitsParams)
  const files: string[] = commits.response.data.files.filter((file: any) => file.status !== "deleted").map((file: any) => file.filename)
  return {context, files}
}

function fetchModifiedFiles(source: rx.Observable<Context>): rx.Observable<{context: Context, file: string}> {
  const files = source.pipe(
    flatMap(context => rxRepos.compareCommits(context, created2ReposCompareCommitsParams)),
    flatMap(data => rx.from(data.response.data.files.filter((file: any) => file.status != "deleted").map((file: any) => file.filename) as string[]))
  )
  return rx.combineLatest(source, files, (context, file) => ({context, file}))
}

async function _fetchContent(data: {context: Context, file: string}): Promise<{context: Context, file: string, content: string}> {
  const result = await promiseRepos.getContent(data.context, created2ReposGetContent({path: data.file}))
  if(result.response.data.encoding === 'base64') {
    const content = btoa(result.response.data);
    return {context: result.context, file: data.file, content}
  } else {
    throw new Error("unsupported encoding '"+result.response.data.encoding+"' for file '"+data.file+"'")
  }
}

function fetchContent(source: rx.Observable<{context: Context, file: string}>): rx.Observable<{context: Context, file: string, content: string}> {
  const content = source.pipe(
    flatMap(data => rxRepos.getContent(data.context, created2ReposGetContent({path: data.file}))),
    map(data => data.response.data)
  )
  return rx.combineLatest(source, content, (data, content) => ({context: data.context, file: data.file, content}))
}

async function _checkContent(data: {context: Context, file: string, content: string}): Promise<{context: Context, file: string, passed: boolean}> {
  const passed = await prettier.check(data.content, {filepath: data.file})
  return {context: data.context, file: data.file, passed}
}

function checkContent(source: rx.Observable<{context: Context, file: string, content: string}>): rx.Observable<{context: Context, file: string, passed: boolean}> {
  const passedCheck = source.pipe(
    flatMap(data => rxPrettier.check(data.content, {filepath: data.file}))
  )
  return rx.combineLatest(source, passedCheck, (data, passed) => ({context: data.context, file: data.file, passed}))
}

function compileReport(source: rx.Observable<{context: Context, file: string, passed: boolean}>): rx.Observable<{context: Context, report: Partial<gh.ChecksUpdateParams>}> {
  const report = source.pipe(
    reduce<{context: Context, file: string, passed: boolean}, {file: string, passed: boolean}[]>((acc, data) => [...acc, {file: data.file, passed: data.passed}], []),
    map(results => asReport(results))
  )
  return rx.combineLatest(source, report, (data, report) => ({context: data.context, report}))
}

async function _markCheckAsCompleted(data: {context: Context, report: Partial<gh.ChecksUpdateParams>}): Promise<Context> {
  const completed_at = new Date().toISOString()
  const result = await promiseChecks.update(data.context, created2ChecksUpdateParams({...data.report, status: "completed", completed_at}))
  return result.context
}

function markCheckAsCompleted(source: rx.Observable<{context: Context, report: Partial<gh.ChecksUpdateParams>}>): rx.Observable<Context> {
  return source.pipe(
    flatMap(data => rxChecks.update(data.context, created2ChecksUpdateParams({...data.report, status: "completed", completed_at: new Date().toISOString()}))),
    map(data => data.context)
    )
}


export function rerequested(context: Context): rx.Observable<Context> {
  return rxChecks.create(context, rerequested2ChecksCreateParams)
  .pipe(map(r => r.context))
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
  if (!passed) {
    text = 'Here is a list of files which be *prettier*.\r\n'
    failedResults.forEach(result => {
      text += `* ${result.file}\r\n`
    })
  }
  return {output: { title: 'Prettier', summary, text }, conclusion: passed ? "success" : "failure"}
}
