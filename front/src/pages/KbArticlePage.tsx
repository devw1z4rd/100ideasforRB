import { Link, useParams } from "react-router"
import { useArticle, useArticles } from "@/api/articles"
import { minskDay } from "@/api/dates"
import { DraftBadge } from "@/components/content/DraftBadge"
import { RichText } from "@/components/content/RichText"
import { Container } from "@/components/layout/Container"
import { Skeleton } from "@/components/ui/skeleton"
import { kb as text } from "@/content/kb"
import { formatDate } from "@/lib/format"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const link = "font-medium text-link transition-colors hover:text-link-hover"

/** Статья базы знаний (§11 /kb/:slug): текст через DOMPurify, справа — другие статьи той же рубрики. */
export function KbArticlePage() {
  const { slug = "" } = useParams()
  const item = useArticle(slug)
  const all = useArticles()
  const a = item.data
  useDocumentTitle(a?.title ?? (item.isPending ? text.title : text.notFound))

  const category = a?.category?.trim() || text.other
  const related = (all.data ?? []).filter(
    (x) => x.id !== a?.id && (x.category?.trim() || text.other) === category,
  )

  return (
    <Container className="py-12 md:py-20">
      <nav aria-label={text.breadcrumb} className="text-[13px]">
        <Link to="/kb" className={link}>
          {text.title}
        </Link>
        {a && <span className="text-muted-foreground"> / {category}</span>}
      </nav>

      {item.isError ? (
        <p className="mt-10 text-sm text-muted-foreground">{text.error}</p>
      ) : item.isPending ? (
        <div className="mt-8 max-w-[70ch] space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !a ? (
        <div className="mt-8">
          <h1 className="font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em]">
            {text.notFound}
          </h1>
          <p className="mt-3 text-muted-foreground">{text.notFoundLead}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,70ch)_minmax(0,1fr)] lg:gap-16">
          <article className="min-w-0">
            <h1 className="font-heading text-[clamp(28px,3.2vw,44px)] leading-[1.1] font-semibold tracking-[-0.03em]">
              {a.title}
            </h1>
            {!a.is_published && <DraftBadge label={text.draft} className="mt-3" />}
            <RichText html={a.body} className="mt-8" />
            <p className="mt-10 border-t border-border pt-4 text-[13px] text-muted-foreground">
              {text.updated(formatDate(minskDay(a.updated)))}
            </p>
          </article>

          {related.length > 0 && (
            <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
              <h2 className="text-[13px] font-medium text-muted-foreground">{text.more(category)}</h2>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {related.map((x) => (
                  <li key={x.id}>
                    <Link to={`/kb/${x.slug}`} className="block py-3 text-[15px] font-medium hover:underline">
                      {x.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/kb" className={`mt-4 inline-block text-[13px] ${link}`}>
                {text.all} →
              </Link>
            </aside>
          )}
        </div>
      )}
    </Container>
  )
}
