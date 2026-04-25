export function visibleChatContent(message) {
  const content = message?.content;
  if (content == null) return '';
  if (typeof content === 'string') return content.trim();
  try {
    return JSON.stringify(content).trim();
  } catch {
    return String(content).trim();
  }
}

export function shouldRenderChatMessage(message) {
  const role = message?.role || 'unknown';

  // Tool result rows are low-level transcript plumbing. The live stream already
  // has tool cards, and replaying raw JSON tool results makes normal chat
  // sessions noisy (for example skill_view success/error payloads).
  if (role === 'tool') return false;

  // Some providers store assistant reasoning/tool-call bookkeeping as separate
  // assistant rows with no user-visible answer. Hide those transcript artifacts.
  if (role === 'assistant' && !visibleChatContent(message)) return false;

  return true;
}
