import { Context } from "probot";
import { createParams } from "../checks_params";

export async function rerequested(context: Context): Promise<void> {
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const sha = context.payload.check_run.head_sha;
    await context.github.checks.create({
        ...createParams(),
        owner,
        repo,
        head_sha: sha
    });
}