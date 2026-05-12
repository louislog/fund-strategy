import { Action, ConflictEntry } from '../types'

/**
 * 单侧（仅 SELL 或仅 BUY）候选动作的稳定排序与同组互斥（mutex）：
 * - 先 priority 升序，再 strategyId 字典序；
 * - 若带 mutexGroup：同组同日只保留先出现的一条，其余记入 rejected。
 */
export function resolvePhaseActions(
  raw: Action[],
  phaseHint: string
): { accepted: Action[]; rejected: ConflictEntry[] } {
  const sorted = [...raw].sort((a, b) => {
    const pa = a.priority ?? 100
    const pb = b.priority ?? 100
    if (pa !== pb) return pa - pb
    return String(a.strategyId).localeCompare(String(b.strategyId))
  })

  const accepted: Action[] = []
  const rejected: ConflictEntry[] = []
  const seenMutex = new Set<string>()

  for (const a of sorted) {
    const g = a.mutexGroup
    if (!g) {
      accepted.push(a)
      continue
    }
    if (seenMutex.has(g)) {
      rejected.push({
        phaseHint,
        action: a,
        reason: `mutex:${g}`,
      })
      continue
    }
    seenMutex.add(g)
    accepted.push(a)
  }

  return { accepted, rejected }
}
