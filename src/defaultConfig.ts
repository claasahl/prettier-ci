import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
    REFERENCE_PREFIX: "refs/heads/prettier/",
    COMMIT_MESSAGE_PREFIX: "formatted file: ",
    PULL_REQUEST_TITLE_PREFIX: "Prettified branch: ",
    checks: {
        name: "Prettier-CI",
        output: {
            title: "Prettier-CI",
            summary: summary()
        },
        actions: {
            fix: {
                identifier: "fix",
                label: "Fix",
                description: "Make files *prettier*.",
            }
        }
    }
}

function summary(): string {
    return `
if passed
  | Pretty. Keep up the **good work**.
else
  | Found #{failedResults.length} files which could be *prettier*
`;
}