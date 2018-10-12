import * as prettier from "prettier"
import * as gh from "@octokit/rest";
import * as pug from "pug"
import {pullRequests} from "../github"
import { Context } from "probot";
import { Config } from "../types";

export abstract class BaseFixAction {
    protected context: Context;
    protected config: Config;
    protected baseBranch: string;
    protected headBranch: string;
    private extensions: string[];
    private createPullRequestProps: gh.PullRequestsCreateParams;
    private mergePullRequestProps: gh.PullRequestsMergeParams;
    protected constructor(context: Context, config: Config) {
        this.context = context;
        this.config = config;
        this.baseBranch = context.payload.check_run.check_suite.head_branch
        this.headBranch = pug.render(this.config.pullRequests.branch, {branch: this.baseBranch})

        const info = prettier.getSupportInfo();
        this.extensions = info.languages.map(language => language.extensions).reduce((acc, val) => acc.concat(val), [])

        const owner = context.payload.repository.owner.login
        const repo = context.payload.repository.name
        this.createPullRequestProps = {
            owner, repo,
            base: this.baseBranch,
            head: this.headBranch,
            title: "TO BE REPLACED"
        }
        this.mergePullRequestProps = {
            owner, repo,
            number: -1
        }
    }

    protected async abstract createBranch(branch: string): Promise<void>

    protected async abstract files(): Promise<string[]>;

    protected async skip(file: string): Promise<boolean> {
        return this.extensions.filter(extension => file.endsWith(extension)).length <= 0
    }

    protected async abstract content(file: string): Promise<string>;
    
    protected async check(file: string, content: string): Promise<boolean> {
        return prettier.check(content, { filepath: file })
    }
    
    protected async format(file: string, content: string): Promise<string> {
        return prettier.format(content, { filepath: file })
    }

    protected async message(file: string): Promise<string> {
        return pug.render(this.config.commitMessage, {file})
    }

    protected async abstract update(file: string, content: string, message: string): Promise<void>;

    protected async createPullRequest(ref: string, skipped: string[], untouched: string[], formatted: string[]): Promise<number> {
        const title = pug.render(this.config.pullRequests.title, {ref, skipped, untouched, formatted})
        const body = pug.render(this.config.pullRequests.body, {ref, skipped, untouched, formatted})
        const {response} = await pullRequests.create(this.context, this.config, () => ({...this.createPullRequestProps, title, body}))
        return response.data.id
    }

    protected async mergePullRequest(pullRequest: number): Promise<void> {
        await pullRequests.merge(this.context, this.config, () => ({...this.mergePullRequestProps, number: pullRequest}))
    }

    async onRequestedAction(merge: boolean) {
        await this.createBranch(this.headBranch)
        const files = await this.files()
        const skipped: string[] = []
        const formatted: string[] = []
        const untouched: string[] = []
        for(const file of files) {
            if(await this.skip(file)) {
                skipped.push(file)
                continue
            }
            const content = await this.content(file)
            if(await this.check(file, content)) {
                untouched.push(file)
                continue
            }
            const formattedContent = await this.format(file, content)
            const message = await this.message(file)
            await this.update(file, formattedContent, message)
            formatted.push(file)
        }
        //const pr = await this.createPullRequest(this.headBranch, skipped, untouched, formatted)
        //if(merge) {
        //    await this.mergePullRequest(pr)
        //}
    }
}