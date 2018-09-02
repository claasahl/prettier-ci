import { Context } from "probot";
import * as checks from "../actions/checks";

export async function requested(context: Context): Promise<void> {
    const { github, log } = context;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const head_sha = context.payload.check_suite.head_sha;
    await checks.create({ github, log, owner, repo, head_sha })
}