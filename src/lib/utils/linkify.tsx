import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
// Trailing punctuation that reads as part of the sentence, not the URL
// (e.g. "check out example.com." or "(see example.com)").
const TRAILING_PUNCTUATION = /[.,!?;:)]+$/;

// Turns any http(s):// or www. URL in plain text into a clickable link,
// leaving everything else as-is — used for free-form text fields (like a
// note's content) that have no rich-text editor of their own.
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    let url = match[0];
    const trailingMatch = url.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    if (trailing) url = url.slice(0, -trailing.length);

    nodes.push(
      <a
        key={key++}
        href={url.startsWith("http") ? url : `https://${url}`}
        target="_blank"
        rel="noreferrer"
        className="text-primaryStrong underline"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
