// Dispatch rejection log — the learning loop.
// When you remove a story (from Published or Quarantine), record its signature +
// your reason here. The sync-dispatch bot reads this to (1) never re-surface a
// rejected story, and (2) learn your taste: reasons become negative examples the
// rules filter checks future candidates against.
//
// Add entries by hand or via the in-app moderation control (writes here / KV).

export interface DispatchRejection {
  signature: string;   // matches DispatchCandidate.signature
  reason: string;      // why you rejected it (this teaches the filter)
  date: string;        // ISO date you rejected it
}

export const DISPATCH_REJECTIONS: DispatchRejection[] = [];

// Keyword hints distilled from your rejection reasons — the bot down-weights or
// rejects candidates matching these. Grows as the reasons accumulate.
export const REJECTION_KEYWORDS: string[] = [];
