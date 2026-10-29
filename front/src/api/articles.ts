import { queryOptions, useQuery } from "@tanstack/react-query"
import { ClientResponseError } from "pocketbase"
import { pb } from "./pb"
import type { ArticlesResponse } from "./pocketbase-types"

// База знаний (CLAUDE.md §4 S4): статьи из PocketBase. Стартовый набор — back/seed/articles.json (seed добавляет
// только новые), дальше — через админку. Черновики видит только admin.

export type Article = Pick<
  ArticlesResponse,
  "id" | "slug" | "title" | "category" | "order" | "is_published" | "updated" | "body"
>

const STALE = 10 * 60_000

/** Все статьи с анонсом вместо текста — для оглавления и «Ещё в разделе» */
export const articlesQuery = () =>
  queryOptions({
    queryKey: ["articles", "list"],
    queryFn: () =>
      pb.collection("articles").getFullList<Article>({
        sort: "order,title",
        fields: "id,slug,title,category,order,is_published,updated,body:excerpt(180,true)",
      }),
    staleTime: STALE,
  })

/** Статья по slug; null — такой нет (или это черновик, а смотрит не админ) */
export const articleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["articles", "item", slug],
    queryFn: async () => {
      try {
        return await pb
          .collection("articles")
          .getFirstListItem<Article>(pb.filter("slug = {:slug}", { slug }))
      } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) return null
        throw e
      }
    },
    staleTime: STALE,
  })

export const useArticles = () => useQuery(articlesQuery())
export const useArticle = (slug: string) => useQuery(articleQuery(slug))
