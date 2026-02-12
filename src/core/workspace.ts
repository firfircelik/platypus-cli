import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { FileLockManager } from "../state/file-lock-manager.js";
import { ConflictManager } from "../state/conflict-manager.js";
import { AuditLogger } from "./audit.js";

export class Workspace {
  private root: string;
  private locks: FileLockManager;
  private audit: AuditLogger;
  private conflicts: ConflictManager;

  constructor(
    root: string,
    locks: FileLockManager = new FileLockManager(),
    audit: AuditLogger = new AuditLogger(),
    conflicts: ConflictManager = new ConflictManager(),
  ) {
    this.root = root;
    this.locks = locks;
    this.audit = audit;
    this.conflicts = conflicts;
  }

  resolve(relPath: string): string {
    const full = path.resolve(this.root, relPath);
    if (!full.startsWith(path.resolve(this.root))) {
      throw new Error("Path traversal detected");
    }
    return full;
  }

  async readFile(relPath: string): Promise<string> {
    const full = this.resolve(relPath);
    return fs.readFile(full, "utf8");
  }

  async writeFile(
    agentId: string,
    relPath: string,
    content: string,
  ): Promise<void> {
    const full = this.resolve(relPath);
    let lock;
    try {
      lock = await this.locks.acquireLock(agentId, full);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Lock acquisition failed";
      const m = msg.match(/agent ([a-zA-Z0-9._-]+)/);
      const other = m?.[1];
      const agents = other ? [agentId, other] : [agentId];
      this.conflicts.recordConflict(full, agents);
      throw error;
    }
    try {
      await fs.writeFile(full, content, "utf8");
      this.audit.write({
        agentId,
        action: "file.write",
        resource: full,
        details: {
          sha256: crypto.createHash("sha256").update(content).digest("hex"),
        },
      });
    } finally {
      await this.locks.releaseLock(lock.id);
    }
  }

  changeRoot(newRoot: string): void {
    this.root = path.resolve(newRoot);
  }

  getRoot(): string {
    return this.root;
  }
}
