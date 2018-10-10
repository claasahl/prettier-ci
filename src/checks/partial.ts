import * as gh from "@octokit/rest";
import * as pug from "pug"
import { BaseChecks } from "./base"
import { repos } from "../actions/github"
import { Context } from "probot";
import { Config } from "../types";
import atob from "atob";

export class PartialChecks extends BaseChecks {
    private compareCommitsProps: gh.ReposCompareCommitsParams;
    private getContentProps: gh.ReposGetContentParams;

    constructor(context: Context, config: Config) {
        super(context, config)
        const owner = context.payload.repository.owner.login
        const repo = context.payload.repository.name
        this.compareCommitsProps = {
            owner, repo,
            head: context.payload.check_run.check_suite.after,
            base: context.payload.check_run.check_suite.before,
        }
        this.getContentProps = {
            owner, repo,
            ref: context.payload.check_run.check_suite,
            path: "TO BE REPLACED"
        }
    }

    protected async files(): Promise<string[]> {
        const commits = await repos.compareCommits(this.context, this.config, () => ({ ...this.compareCommitsProps }))
        return commits.response.data.files.filter((file: any) => file.status !== "removed").map((file: any) => file.filename)
    }

    protected async content(file: string): Promise<string> {
        const result = await repos.getContent(this.context, this.config, () => ({ ...this.getContentProps, path: file }))
        const { encoding } = result.response.data
        if (encoding === 'base64') {
            return atob(result.response.data.content);
        } else {
            throw new Error(pug.render(this.config.errors.repos.encoding_not_supported, { event: this.context.payload, encoding, file }))
        }
    }

}