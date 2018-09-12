import { Context } from "probot";
import * as checks from "../actions/checks";
import * as repos from "../actions/repos";
import * as prettier from "../actions/prettier";
import { ChecksUpdateParamsOutput } from "@octokit/rest";
import { ChecksCreateParams } from "../types";

export async function created(context: Context): Promise<void> {
    const status = context.payload.check_run.status
    switch (status) {
        case "queued":
            return queued(context);
        case "in_progress":
            return inProgress(context);
        default:
            context.log("got unexpected status for check_run", status, context)
    }
}

export async function rerequested(context: Context): Promise<void> {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const head_sha = context.payload.check_run.head_sha;
    await checks.create({ github, log, owner, repo, head_sha })
}

export async function rerequested2(context: Context): Promise<ChecksCreateParams> {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const head_sha = context.payload.check_run.head_sha;
    return { github, log, owner, repo, head_sha }
}

interface FileCheck {
    name: string,
    passed: boolean
}

async function queued(context: Context) {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const check_run_id = context.payload.check_run.id;
    await checks.update({ github, log, owner, repo, check_run_id, status: "in_progress" });
    await inProgress(context);
}

async function inProgress(context: Context) {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const { before, after, head_branch } = context.payload.check_run.check_suite;
    const commits = await repos.compareCommits({ github, log, owner, repo, head: after, base: before })
    const results: FileCheck[] = [];
    for (const file of commits.files) {
        if (file.status != "deleted") {
            const result = await repos.getContent({ github, log, owner, repo, path: file.name, ref: head_branch })
            if (result.content && await prettier.check(result.content, { filepath: file.name })) {
                results.push({ name: file.name, passed: true });
            } else {
                results.push({ name: file.name, passed: false });
            }
        }
    }
    await completed(context, results)
}

async function completed(context: Context, results: FileCheck[]) {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const check_run_id = context.payload.check_run.id;
    const failed = results.map(result => result.passed).includes(false);
    await checks.update({
        github, log, owner, repo, check_run_id, status: "completed", conclusion: failed ? "failure" : "success",
        completed_at: new Date().toISOString(),
        output: report(results)
    });
}

function report(results: FileCheck[]): ChecksUpdateParamsOutput {
    const failedResults = results.filter(result => !result.passed);
    const passed = failedResults.length === 0;
    const summary = passed ? "Pretty. Keep up the **good work**." : `Found ${failedResults.length} files which could be *prettier*`;
    let text: string | undefined = undefined;
    if (!passed) {
        text = "Here is a list of files which be *prettier*.\r\n"
        failedResults.forEach(result => {
            text += `* ${result.name}\r\n`
        })
    }
    return { title: "Prettier", summary, text }
}