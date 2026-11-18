import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { ClientResponseError } from "pocketbase"
import { minskDay } from "./dates"
import { pb } from "./pb"
import type { NewsResponse } from "./pocketbase-types"

const PAGE = 12
const LIST_FIELDS =
  "id,collectionId,slug,title,tag,cover,published_at,created,source_url,is_published,body:excerpt(220,true)"

export type NewsItem = Pick<
  NewsResponse,
  | "id"
  | "collectionId"
  | "slug"
  | "title"
  | "tag"
  | "cover"
  | "published_at"
  | "created"
  | "source_url"
  | "is_published"
  | "body"
>

export const newsDay = (n: Pick<NewsItem, "published_at" | "created">) =>
  minskDay(n.published_at || n.created)

export const newsCoverUrl = (n: Pick<NewsItem, "id" | "collectionId" | "cover">, thumb?: "640x0") =>
  n.cover ? pb.files.getURL(n, n.cover, thumb ? { thumb } : undefined) : null

export const newsListQuery = (tag: string | null) =>
  infiniteQueryOptions({
    queryKey: ["news", "list", tag],
    queryFn: ({ pageParam }) =>
      pb.collection("news").getList<NewsItem>(pageParam, PAGE, {
        filter: tag ? pb.filter("tag = {:tag}", { tag }) : "",
        sort: "-published_at,-created",
        fields: LIST_FIELDS,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  })

export const newsTagsQuery = () =>
  queryOptions({
    queryKey: ["news", "tags"],
    queryFn: async () => {
      const rows = await pb.collection("news").getFullList<Pick<NewsItem, "tag">>({ fields: "tag" })
      return [...new Set(rows.map((r) => r.tag).filter((t): t is string => !!t))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      )
    },
  })

export const newsItemQuery = (slug: string) =>
  queryOptions({
    queryKey: ["news", "item", slug],
    queryFn: async () => {
      try {
        return await pb.collection("news").getFirstListItem<NewsItem>(pb.filter("slug = {:slug}", { slug }))
      } catch (e) {
        if (e instanceof ClientResponseError && e.status === 404) return null
        throw e
      }
    },
  })

export const useNewsList = (tag: string | null) => useInfiniteQuery(newsListQuery(tag))
export const useNewsTags = () => useQuery(newsTagsQuery())
export const useNewsItem = (slug: string) => useQuery(newsItemQuery(slug))
