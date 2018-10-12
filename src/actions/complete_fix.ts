import * as fs from "fs"
import * as git from "isomorphic-git"
import * as jsonwebtoken from "jsonwebtoken"
import { BaseFixAction } from "./base_fix";
import { GitHubAPI } from "probot/lib/github";
import { findPrivateKey } from "probot/lib/private-key";
import { Context } from "probot";
import { Config } from "../types";
import { URL } from "url";

export class CompleteFixAction extends BaseFixAction {
    private url: string;
    private dir: string;
    private installationId: string;
    private readonly encoding = "utf8";
    private readonly ref: string;
    constructor(context: Context, config: Config) {
        super(context, config)
        git.plugins.set("fs", fs);
        const owner = context.payload.repository.owner.login;
        const repo = context.payload.repository.name;
        this.url = new URL(`https://github.com/${owner}/${repo}.git`).toString()
        this.dir = `../repos/${owner}/${repo}`
        this.installationId = context.payload.installation.id
        this.ref = context.payload.check_run.head_sha
    }

    protected async createBranch(branch: string): Promise<void> {
        await git.branch({dir: this.dir, ref: branch})
    }

    protected async files(): Promise<string[]> {
        // copy + pasted
        await this.cloneOrUpdateRepository(this.ref)
        return this.readDir(this.dir).filter(file => !file.startsWith(".git/"))
    }

    protected async content(file: string): Promise<string> {
        // copy + pasted
        return fs.readFileSync(this.dir + "/" + file, { encoding: this.encoding });
    }

    protected async update(file: string, content: string, message: string): Promise<void> {
        fs.writeFileSync(file, content, {encoding: this.encoding})
        await git.add({dir: this.dir, filepath: file})
        await git.commit({dir: this.dir, author: {}, message})
    }

    async generateJWT(exp: number = 60) {
        // copy + pasted
        var options = {
            id: process.env.APP_ID,
            cert: findPrivateKey()
        };
        var payload = {
            exp: Math.floor(Date.now() / 1000) + exp,
            iat: Math.floor(Date.now() / 1000),
            iss: options.id // GitHub App ID
        };
        return jsonwebtoken.sign(payload, options.cert, {
            algorithm: "RS256"
        });
    }

    async cloneOrUpdateRepository(ref: string) {
        // copy + pasted
        const api = GitHubAPI()
        const jwt = await this.generateJWT()
        api.authenticate({ type: "app", token: jwt });
        const response = await api.apps.createInstallationToken({ installation_id: this.installationId });
        const { token } = response.data

        if (!fs.existsSync(this.dir)) {
            await git.clone({ url: this.url, dir: this.dir, username: "x-access-token", password: token });
        } else {
            await git.fetch({ dir: this.dir, username: "x-access-token", password: token });
        }
        await git.checkout({ dir: this.dir, ref })
    }

    readDir(dir: string): string[] {
        // copy + pasted
        // only list all files within dir
        const files = fs.readdirSync(dir, { encoding: this.encoding });
        for (const file of fs.readdirSync(dir, { encoding: this.encoding })) {
            const lstat = fs.lstatSync(dir + "/" + file);
            if (lstat.isDirectory()) {
                files.push(
                    ...this.readDir(dir + "/" + file).map(entry => file + "/" + entry)
                );
            }
        }
        return files;
    }
}