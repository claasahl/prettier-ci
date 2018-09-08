import { ChecksCreateParams, ChecksCreateResult, ChecksUpdateParams, ChecksUpdateResult } from '../types'

const defaultChecksCreateParams = {
  name: 'Prettier',
  status: 'queued' as 'queued'
}

export async function create (params: ChecksCreateParams): Promise<ChecksCreateResult> {
  const mixedParams = { ...defaultChecksCreateParams, ...params }
  const { github, log, ...createParams } = mixedParams
  try {
    await github.checks.create(createParams)
    return {params: mixedParams, created: true}
  } catch (error) {
    log('error while creating check_run', createParams, error)
  }
  return {params: mixedParams, created: false}
}

const defaultChecksUpdateParams = {
  name: 'Prettier'
}

export async function update (params: ChecksUpdateParams): Promise<ChecksUpdateResult> {
  const mixedParams = { ...defaultChecksUpdateParams, ...params }
  const { github, log, ...upatedParams } = mixedParams
  try {
    await github.checks.update(upatedParams)
    return {params: mixedParams, updated: true}
  } catch (error) {
    log('error while updating check_run', upatedParams, error)
  }
  return {params: mixedParams, updated: false}
}
