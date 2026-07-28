import { Fragment, type ReactNode } from "react";

// A small, dependency-free Markdown renderer for AI replies. Handles headings
// (#..######), bold (**…**), and bullet lists (-, *, •). Everything is rendered
// as React nodes (no dangerouslySetInnerHTML), so the model's text is inert.

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part)
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="my-2 ml-5 list-disc space-y-1">{list}</ul>);
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const cls = level <= 2 ? "mt-4 mb-1 text-base font-bold" : "mt-3 mb-1 text-sm font-semibold";
      blocks.push(<p key={i} className={cls}>{inline(heading[2])}</p>);
    } else if (bullet) {
      list.push(<li key={i} className="text-sm leading-relaxed">{inline(bullet[1])}</li>);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(<p key={i} className="my-1.5 text-sm leading-relaxed">{inline(line)}</p>);
    }
  });
  flush();

  return <div className={className}>{blocks}</div>;
}
