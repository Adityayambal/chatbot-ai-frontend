interface CitationChipProps {
  id: string;
  onClick?: (id: string) => void;
}

export default function CitationChip({ id, onClick }: CitationChipProps) {
  return (
    <a
      href={`#src-${id}`}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(id);
      }}
      title="Show this source"
      className="mx-0.5 inline-flex items-center rounded-md bg-white/15 px-1.5 py-px align-[0.1em] text-[11px] font-bold leading-4 text-white no-underline ring-1 ring-inset ring-white/25 transition hover:bg-white/25"
    >
      {id}
    </a>
  );
}
