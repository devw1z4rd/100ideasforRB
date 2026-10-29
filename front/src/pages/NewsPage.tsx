import { Link, useSearchParams } from "react-router"
import { newsCoverUrl, newsDay, useNewsList, useNewsTags, type NewsItem } from "@/api/news"
import { DraftBadge } from "@/components/content/DraftBadge"
import { Container } from "@/components/layout/Container"
import { Skeleton } from "@/components/ui/skeleton"
import { news as text } from "@/content/news"
import { formatDate, hostname } from "@/lib/format"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

/** «Новости» (§11): лента из PocketBase, фильтр по рубрике в адресе (?tag=), подгрузка по 12. */
export function NewsPage() {
  useDocumentTitle(text.title)
  const [params, setParams] = useSearchParams()
  const tag = params.get("tag")
  const tags = useNewsTags()
  const list = useNewsList(tag)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <p className="mt-4 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>

      {tags.data && tags.data.length > 0 && (
        <div role="radiogroup" aria-label={text.filterLabel} className="mt-8 flex flex-wrap gap-2">
          {[null, ...tags.data].map((t) => (
            <button
              key={t ?? "all"}
              type="button"
              role="radio"
              aria-checked={tag === t}
              onClick={() => setParams(t ? { tag: t } : {}, { replace: true })}
              className={cn(
                "h-8 cursor-pointer rounded-md border px-3 text-[13px] transition-colors",
                tag === t
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {t ?? text.all}
            </button>
          ))}
        </div>
      )}

      {list.isError ? (
        <p className="mt-10 text-sm text-muted-foreground">{text.error}</p>
      ) : list.isPending ? (
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{tag ? text.emptyTag : text.empty}</p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {items.map((n) => (
            <li key={n.id}>
              <NewsRow item={n} />
            </li>
          ))}
        </ul>
      )}

      {list.hasNextPage && (
        <button
          type="button"
          onClick={() => list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
          className="mt-8 h-10 cursor-pointer rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
        >
          {text.more}
        </button>
      )}
    </Container>
  )
}

function NewsRow({ item: n }: { item: NewsItem }) {
  const cover = newsCoverUrl(n, "640x0")
  const to = `/news/${n.slug}`
  return (
    <article className="grid gap-x-8 gap-y-3 py-6 md:grid-cols-[9rem_minmax(0,1fr)_12rem] lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
      <p className="text-[13px] text-muted-foreground tabular-nums">
        <time dateTime={newsDay(n)}>{formatDate(newsDay(n))}</time>
        {n.tag && <span className="ml-2 md:ml-0 md:block">{n.tag}</span>}
      </p>
      <div className="min-w-0">
        <h2 className="font-heading text-xl leading-snug font-semibold tracking-[-0.02em] md:text-2xl">
          <Link to={to} className="hover:underline hover:decoration-1 hover:underline-offset-4">
            {n.title}
          </Link>
          {!n.is_published && <DraftBadge label={text.draft} className="ml-2 align-middle" />}
        </h2>
        {n.body && <p className="mt-2 line-clamp-3 text-[15px] leading-[1.55] text-fg-secondary">{n.body}</p>}
        {n.source_url && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {text.source}: {hostname(n.source_url)}
          </p>
        )}
      </div>
      {cover && (
        <Link to={to} tabIndex={-1} aria-hidden="true" className="hidden md:block">
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full rounded-lg border border-border bg-muted object-cover"
          />
        </Link>
      )}
    </article>
  )
}
