import * as gh from "@octokit/rest";
import * as pug from "pug"
import { BaseFixAction } from "./base_fix";
import {repos, gitdata} from "../github"
import { Context } from "probot";
import { Config } from "../types";
import atob from "atob";
import btoa from "btoa";

export class PartialFixAction extends BaseFixAction {
    private createReferenceProps: gh.GitdataCreateReferenceParams;
    private compareCommitsProps: gh.ReposCompareCommitsParams;
    private getContentProps: gh.ReposGetContentParams;
    private updateFileProps: gh.ReposUpdateFileParams;

    constructor(context: Context, config: Config) {
        super(context, config)
        const owner = context.payload.repository.owner.login
        const repo = context.payload.repository.name
        const {after, before} = context.payload.check_run.check_suite
        this.createReferenceProps = {
            owner, repo,
            ref: "UNKNOWN",
            sha: this.headBranch
        }
        this.compareCommitsProps = {
            owner, repo,
            head: after,
            base: before,
        }
        this.getContentProps = {
            owner, repo,
            ref: this.headBranch,
            path: "TO BE REPLACED"
        }
        this.updateFileProps = {
            owner, repo,
            message: "TO BE REPLACED",
            content: btoa("TO BE REPLACED"),
            path: "UNKNOWN",
            sha: "UNKNOWN"
        }
    }

    protected async createBranch(branch: string): Promise<void> {
        await gitdata.createReference(this.context, this.config, () => ({...this.createReferenceProps, ref: branch}))
    }

    protected async files(): Promise<string[]> {
        // copy + pasted
        const commits = await repos.compareCommits(this.context, this.config, () => ({ ...this.compareCommitsProps }))
        return commits.response.data.files.filter((file: any) => file.status !== "removed").map((file: any) => file.filename)
    }

    protected async content(file: string): Promise<string> {
        // copy + pasted
        const result = await repos.getContent(this.context, this.config, () => ({ ...this.getContentProps, path: file }))
        const { encoding } = result.response.data
        if (encoding === 'base64') {
            return atob(result.response.data.content);
        } else {
            throw new Error(pug.render(this.config.errors.repos.encoding_not_supported, { event: this.context.payload, encoding, file }))
        }
    }

    protected async update(file: string, content: string, message: string): Promise<void> {
        const sha = ""
        await repos.updateFile(this.context, this.config, () => ({...this.updateFileProps, path: file, content: btoa(content), branch: this.headBranch, message, sha}))
    }
}