import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const btnBase =
  "bg-transparent border-[var(--line)] text-[var(--text-muted)] hover:bg-[rgba(118,157,194,0.12)] hover:text-[var(--text)] hover:border-[rgba(118,157,194,0.4)]";
const btnActive = "bg-[#5b9bf0] border-[#5b9bf0] text-white hover:bg-[#5b9bf0] hover:text-white";

function buildPageList(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 2;
  const pages: (number | "...")[] = [1];
  let start = Math.max(2, page - delta);
  let end = Math.min(totalPages - 1, page + delta);

  if (page === 1) end = Math.min(totalPages - 1, 1 + delta * 2);
  else if (page === totalPages) start = Math.max(2, totalPages - delta * 2);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) {
    if (i !== 1 && i !== totalPages) pages.push(i);
  }
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 0) return null;
  const pages = buildPageList(page, totalPages);

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="icon"
        className={btnBase}
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        aria-label="이전"
      >
        <ChevronLeftIcon />
      </Button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <Button key={`ellipsis-${idx}`} variant="outline" className={btnBase} disabled>
            ...
          </Button>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            className={p === page ? btnActive : btnBase}
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className={btnBase}
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        aria-label="다음"
      >
        <ChevronRightIcon />
      </Button>
    </ButtonGroup>
  );
}
