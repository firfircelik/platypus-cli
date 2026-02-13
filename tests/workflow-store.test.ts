import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { WorkflowStore } from '../src/state/workflow-store.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('WorkflowStore', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-wf-'))
    process.env.PLATYPUS_HOME = tmpDir
    resetStateDb()
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('creates runs and steps', () => {
    const store = new WorkflowStore()
    const run = store.createRun('quick-spec', '/tmp')
    expect(run.name).toBe('quick-spec')
    store.setRunStatus(run.id, 'running')
    expect(store.getRun(run.id)?.id).toBe(run.id)
    expect(store.getRun('missing')).toBeNull()
    const step = store.addStep(run.id, 's1', 'in')
    store.setStepStatus(step.id, 'done', 'out')
    const latest = store.latestRun()
    expect(latest?.id).toBe(run.id)
    const steps = store.listSteps(run.id)
    expect(steps.length).toBe(1)
    expect(steps[0].output).toBe('out')
  })

  it('addStep without input defaults to null', () => {
    const store = new WorkflowStore()
    const run = store.createRun('test', '/tmp')
    const step = store.addStep(run.id, 'step-no-input')
    expect(step.input).toBeNull()
    expect(step.output).toBeNull()
    expect(step.status).toBe('pending')
  })

  it('listSteps returns empty array for run with no steps', () => {
    const store = new WorkflowStore()
    const run = store.createRun('test', '/tmp')
    const steps = store.listSteps(run.id)
    expect(steps).toEqual([])
  })

  it('latestRun returns null when no runs exist', () => {
    const store = new WorkflowStore()
    const latest = store.latestRun()
    expect(latest).toBeNull()
  })

  it('listSteps handles null input and output', () => {
    const store = new WorkflowStore()
    const run = store.createRun('test', '/tmp')
    store.addStep(run.id, 'step-without-io')
    store.addStep(run.id, 'step-with-input', 'input data')
    const steps = store.listSteps(run.id)
    expect(steps.length).toBe(2)
    expect(steps[0].input).toBeNull()
    expect(steps[0].output).toBeNull()
    expect(steps[1].input).toBe('input data')
    expect(steps[1].output).toBeNull()
  })

  it('setStepStatus updates output without null check', () => {
    const store = new WorkflowStore()
    const run = store.createRun('test', '/tmp')
    const step = store.addStep(run.id, 'step1')
    store.setStepStatus(step.id, 'done', 'final output')
    const steps = store.listSteps(run.id)
    expect(steps[0].output).toBe('final output')
    expect(steps[0].status).toBe('done')
  })
})
