import { ChecksCreateParams, ChecksUpdateParams } from "../types";

const defaultChecksCreateParams = {
  name: "Prettier",
  status: "queued" as "queued"
};

export async function create(params: ChecksCreateParams): Promise<void> {
  const mixedParams = { ...defaultChecksCreateParams, ...params };
  const { github, log, ...createParams } = mixedParams;
  await github.checks.create(createParams);
}

const defaultChecksUpdateParams = {
  name: "Prettier"
};

export async function update(params: ChecksUpdateParams): Promise<void> {
  const mixedParams = { ...defaultChecksUpdateParams, ...params };
  const { github, log, ...upatedParams } = mixedParams;
  await github.checks.update(upatedParams);
}
