import * as gh from "@octokit/rest";
import * as prettier from "prettier"
import { Context } from 'probot'
import { Config } from '../types'
import { checks } from "../actions/github"

export abstract class BaseChecks {
    protected context: Context;
    protected config: Config;
    private updateCheckRunProps: gh.ChecksUpdateParams
    private extensions: string[];
    protected constructor(context: Context, config: Config) {
        this.context = context;
        this.config = config;
        this.updateCheckRunProps = {
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            check_run_id: `${context.payload.check_run.id}`
        }
        const info = prettier.getSupportInfo();
        this.extensions = info.languages.map(language => language.extensions).reduce((acc, val) => acc.concat(val), [])
    }


    protected async abstract files(): Promise<string[]>;

    protected async skip(file: string): Promise<boolean> {
        return this.extensions.filter(extension => file.endsWith(extension)).length <= 0
    }

    protected async abstract content(file: string): Promise<string>;

    protected async check(file: string, content: string): Promise<boolean> {
        return prettier.check(content, { filepath: file })
    }

    protected async markAsInProgress(): Promise<void> {
        await checks.update(this.context, this.config, () => ({ ...this.updateCheckRunProps, status: "in_progress" }));
    }

    protected async markAsCompleted(skipped: string[], passed: string[], failed: string[]): Promise<void> {
        const completed_at = new Date().toISOString()
        const output = {
            title: "",
            summary: "",
            text: JSON.stringify({skipped, passed, failed}, null, 2)
        }
        const conclusion = failed.length > 0 ? "failure" : "success"
        await checks.update(this.context, this.config, () => ({ ...this.updateCheckRunProps, status: "completed", conclusion, completed_at, output }))
    }

    async onCheckRun(): Promise<void> {
        await this.markAsInProgress();
        const files = await this.files()
        const skipped: string[] = []
        const passed: string[] = []
        const failed: string[] = []
        for (const file of files) {
            if (await this.skip(file)) {
                skipped.push(file)
                continue
            }
            const content = await this.content(file);
            if (await this.check(file, content)) {
                passed.push(file)
            } else {
                failed.push(file)
            }
        }
        await this.markAsCompleted(skipped, passed, failed);
    }
}