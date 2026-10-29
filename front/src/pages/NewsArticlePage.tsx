import { Link, useParams } from "react-router"
import { newsCoverUrl, newsDay, useNewsItem } from "@/api/news"
import { DraftBadge } from "@/components/content/DraftBadge"
import { RichText } from "@/components/content/RichText"
import { Container } from "@/components/layout/Container"
import { Skeleton } from "@/components/ui/skeleton"
import { news as text } from "@/content/news"
import { formatDate, hostname } from "@/lib/format"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const backLink = "text-[13px] font-medium text-link transition-colors hover:text-link-hover"

/** Новость (§11 /news/:slug): текст из админки через DOMPurify, обложка справа, источник внизу. */
export function NewsArticlePage() {
  const { slug = "" } = useParams()
  const item = useNewsItem(slug)
  const n = item.data
  useDocumentTitle(n?.title ?? (item.isPending ? text.title : text.notFound))

  return (
    <Container className="py-12 md:py-20">
      <Link to="/news" className={backLink}>
        ← {text.back}
      </Link>

      {item.isError ? (
        <p className="mt-10 text-sm text-muted-foreground">{text.error}</p>
      ) : item.isPending ? (
        <div className="mt-8 max-w-[760px] space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !n ? (
        <div className="mt-8">
          <h1 className="font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em]">
            {text.notFound}
          </h1>
          <p className="mt-3 text-muted-foreground">{text.notFoundLead}</p>
        </div>
      ) : (
        <article className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,70ch)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground tabular-nums">
              <time dateTime={newsDay(n)}>{formatDate(newsDay(n))}</time>
              {n.tag && (
                <>
                  {" · "}
                  <Link
                    to={{ pathname: "/news", search: `?tag=${encodeURIComponent(n.tag)}` }}
                    className="hover:text-foreground"
                  >
                    {n.tag}
                  </Link>
                </>
              )}
            </p>
            <h1 className="mt-2 font-heading text-[clamp(28px,3.2vw,44px)] leading-[1.1] font-semibold tracking-[-0.03em]">
              {n.title}
            </h1>
            {!n.is_published && <DraftBadge label={text.draft} className="mt-3" />}

            <RichText html={n.body} className="mt-8" />

            {n.source_url && (
              <p className="mt-10 border-t border-border pt-4 text-[13px] text-muted-foreground">
                {text.source}:{" "}
                <a
                  href={n.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-link transition-colors hover:text-link-hover"
                >
                  {hostname(n.source_url)} →
                </a>
              </p>
            )}
          </div>

          {n.cover && (
            <figure className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
              <a href={newsCoverUrl(n)!} target="_blank" rel="noopener noreferrer">
                <img
                  src={newsCoverUrl(n)!}
                  alt={text.coverAlt(n.title)}
                  className="w-full rounded-xl border border-border bg-muted"
                />
              </a>
            </figure>
          )}
        </article>
      )}
    </Container>
  )
}
