import { Link } from "react-router"
import { useArticles, type Article } from "@/api/articles"
import { DraftBadge } from "@/components/content/DraftBadge"
import { Container } from "@/components/layout/Container"
import { Skeleton } from "@/components/ui/skeleton"
import { kb as text } from "@/content/kb"
import { groupByCategory } from "@/lib/kb"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

/** «База знаний» (§11): статьи из PocketBase по рубрикам, порядок — поле order. */
export function KbPage() {
  useDocumentTitle(text.title)
  const articles = useArticles()
  const groups = articles.data ? groupByCategory(articles.data, text.categories, text.other) : []

  return (
    <Container className="py-16 md:py-24">
      <h1 className="font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <p className="mt-4 max-w-[70ch] text-base leading-[1.55] text-fg-secondary">{text.lead}</p>

      {groups.length > 1 && (
        <nav aria-label={text.categoriesLabel} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {groups.map((g, i) => (
            <a key={g.category} href={`#kb-${i}`} className="font-medium text-link hover:text-link-hover">
              {g.category}
            </a>
          ))}
        </nav>
      )}

      {articles.isError ? (
        <p className="mt-10 text-sm text-muted-foreground">{text.error}</p>
      ) : articles.isPending ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        groups.map((g, i) => (
          <section key={g.category} aria-labelledby={`kb-${i}`} className="mt-12">
            <h2
              id={`kb-${i}`}
              className="scroll-mt-[calc(var(--header-h)+1rem)] font-heading text-[clamp(22px,2.4vw,28px)] leading-tight font-semibold tracking-[-0.02em]"
            >
              {g.category}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.articles.map((a) => (
                <li key={a.id}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Container>
  )
}

function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Link
      to={`/kb/${a.slug}`}
      className="group block h-full rounded-xl border border-border p-5 transition-colors hover:bg-muted"
    >
      <h3 className="font-heading text-lg leading-snug font-semibold tracking-[-0.01em] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {a.title}
      </h3>
      {!a.is_published && <DraftBadge label={text.draft} className="mt-2" />}
      {a.body && (
        <p className="mt-2 line-clamp-3 text-[14px] leading-[1.55] text-muted-foreground">{a.body}</p>
      )}
    </Link>
  )
}
