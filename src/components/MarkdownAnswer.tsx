import { useMemo } from "react";
import clsx from "clsx";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import CitationChip from "./CitationChip";

interface MarkdownAnswerProps {
  content: string;
  streaming?: boolean;
  onCitationClick?: (id: string) => void;
}

const CITATION_RE = /\[S(\d+)\]/g;

function preprocessCitations(text: string): string {
  return text.replace(CITATION_RE, (_match, n: string) => `[S${n}](#src-S${n})`);
}

// Always rendered on the dark purple tutor bubble, hence prose-invert in both themes.
const PROSE = clsx(
  "prose prose-invert max-w-[72ch] text-[15px] leading-7 text-violet-50",
  "prose-p:my-2.5 prose-li:my-1 prose-li:marker:text-violet-300",
  "prose-headings:font-display prose-headings:font-semibold prose-headings:text-white prose-h2:text-lg prose-h3:text-base",
  "prose-strong:text-white prose-a:text-violet-200 prose-hr:border-white/15",
  "prose-blockquote:border-violet-400 prose-blockquote:text-violet-100",
  "prose-code:rounded-md prose-code:bg-white/15 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:text-violet-100 prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:rounded-xl prose-pre:bg-black/30 prose-pre:ring-1 prose-pre:ring-white/10",
  "prose-th:text-white prose-td:border-white/10 prose-thead:border-white/20",
);

export default function MarkdownAnswer({ content, streaming, onCitationClick }: MarkdownAnswerProps) {
  // Memoized so citation chips aren't remounted on every streamed delta (new component identity = remount).
  const components = useMemo<Components>(
    () => ({
      a: ({ href, children }) => {
        if (href?.startsWith("#src-S")) {
          return <CitationChip id={href.replace("#src-", "")} onClick={onCitationClick} />;
        }
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
      // Wide tables scroll inside the bubble instead of overflowing it on narrow screens.
      table: ({ children }) => (
        <div className="overflow-x-auto">
          <table>{children}</table>
        </div>
      ),
    }),
    [onCitationClick],
  );

  return (
    <div className={clsx(PROSE, streaming && "is-streaming")}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml components={components}>
        {preprocessCitations(content)}
      </ReactMarkdown>
    </div>
  );
}
