import * as prettier from "prettier"
import { Context } from "probot";
import { Config } from "../types";

export abstract class BaseFixAction {
    protected context: Context;
    protected config: Config;
    private extensions: string[];
    protected constructor(context: Context, config: Config) {
        this.context = context;
        this.config = config;
        const info = prettier.getSupportInfo();
        this.extensions = info.languages.map(language => language.extensions).reduce((acc, val) => acc.concat(val), [])
    }

    protected async abstract files(): Promise<string[]>;

    protected async skip(file: string): Promise<boolean> {
        return this.extensions.filter(extension => file.endsWith(extension)).length <= 0
    }

    protected async abstract content(file: string): Promise<string>;

    protected async abstract content(file: string, content: string): Promise<void>;

    protected async check(file: string, content: string): Promise<boolean> {
        return prettier.check(content, { filepath: file })
    }

    protected async format(file: string, content: string): Promise<string> {
        return prettier.format(content, { filepath: file })
    }

    async onRequestedAction() {
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
            await this.content(file, formattedContent)
            formatted.push(file)
        }
    }
}