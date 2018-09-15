import * as rx from "rxjs";
import * as gh from "@octokit/rest";
import { rxRepos, rxChecks} from "../reactivex/rxGithub"
import { rxPrettier }  from "../reactivex/rxPrettier"
import { Context } from 'probot'

import { map, flatMap, reduce } from 'rxjs/operators';
import { CHECKS_NAME } from '../utils';
import { Projection, Overwrite } from '../types';

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

function markCheckAsInProgress(source: rx.Observable<Context>): rx.Observable<Context> {
  return source.pipe(
    flatMap(context => rxChecks.update(context, created2ChecksUpdateParams({status: "in_progress"}))),
    map(data => data.context)
    )
}

function fetchModifiedFiles(source: rx.Observable<Context>): rx.Observable<{context: Context, file: string}> {
  const files = source.pipe(
    flatMap(context => rxRepos.compareCommits(context, created2ReposCompareCommitsParams)),
    flatMap(data => rx.from(data.response.data.files.filter((file: any) => file.status != "deleted").map((file: any) => file.name) as string[]))
  )
  return rx.combineLatest(source, files, (context, file) => ({context, file}))
}

function fetchContent(source: rx.Observable<{context: Context, file: string}>): rx.Observable<{context: Context, file: string, content: string}> {
  const content = source.pipe(
    flatMap(data => rxRepos.getContent(data.context, created2ReposGetContent({path: data.file}))),
    map(data => data.response.data)
  )
  return rx.combineLatest(source, content, (data, content) => ({context: data.context, file: data.file, content}))
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

function markCheckAsCompleted(source: rx.Observable<{context: Context, report: Partial<gh.ChecksUpdateParams>}>): rx.Observable<Context> {
  return source.pipe(
    flatMap(data => rxChecks.update(data.context, created2ChecksUpdateParams({...data.report, status: "completed"}))),
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
