"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Shows long free text collapsed, with a toggle to read the whole thing. */
export function LongText({ text, emptyLabel, collapsedLines = 12 }: { text: string; emptyLabel: string; collapsedLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!text.trim()) return <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>;

  const lineCount = text.split("\n").length;
  const isLong = lineCount > collapsedLines || text.length > collapsedLines * 90;

  return (
    <div>
      <div
        className="text-sm leading-relaxed break-words whitespace-pre-wrap"
        style={!expanded && isLong ? { maxHeight: `${collapsedLines * 1.625}rem`, overflow: "hidden", maskImage: "linear-gradient(to bottom, black 75%, transparent)" } : undefined}
      >
        {text}
      </div>
      {isLong && (
        <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? "Show less" : "Show full text"}
        </Button>
      )}
    </div>
  );
}
