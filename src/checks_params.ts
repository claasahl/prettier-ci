import * as pug from "pug";
import {
  Config,
  SimplifiedChecksCreateParams,
  SimplifiedChecksUpdateParams
} from "./types";

export function createParams(config: Config): SimplifiedChecksCreateParams {
  return { ...config.check_run.create };
}

export function inProgressParams(config: Config): SimplifiedChecksUpdateParams {
  return { ...config.check_run.inProgress };
}

export function successParams(
  config: Config,
  skipped: string[],
  passed: string[],
  failed: string[]
): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return renderTemplates(
    {
      ...config.check_run.success,
      completed_at
    },
    skipped,
    passed,
    failed
  );
}

export function failureParams(
  config: Config,
  skipped: string[],
  passed: string[],
  failed: string[]
): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return renderTemplates(
    {
      ...config.check_run.failure,
      completed_at
    },
    skipped,
    passed,
    failed
  );
}

export function cancelledParams(config: Config): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return {
    ...config.check_run.cancelled,
    completed_at
  };
}

function renderTemplates(
  update: SimplifiedChecksUpdateParams,
  skipped: string[],
  passed: string[],
  failed: string[]
): SimplifiedChecksUpdateParams {
  const params = { ...update };
  let output = undefined;
  if (params && params.output) {
    output = { ...params.output };
    if (output.summary) {
      output.summary = pug.render(output.summary, { skipped, passed, failed });
    }
    if (output.text) {
      output.text = pug.render(output.text, { skipped, passed, failed });
    }
  }
  if (output) {
    return { ...params, output };
  }
  return params;
}
