import type { ReactNode } from "react";

/**
 * A deliberately small markdown renderer — paragraphs, bullet lists, `code`,
 * and **bold**. Lesson prose never needs more than that, and a full markdown
 * dependency would be larger than the whole engine.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={`${keyPrefix}-c${i}`}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>);
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*[-*]\s+/.test(line));

        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, li) => (
                <li key={li}>{inline(line.replace(/^\s*[-*]\s+/, ""), `${index}-${li}`)}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{inline(lines.join(" "), String(index))}</p>;
      })}
    </div>
  );
}
