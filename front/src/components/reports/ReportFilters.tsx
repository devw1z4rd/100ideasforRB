import type { ReactNode } from "react"
import type { ReportsCategoryOptions } from "@/api/pocketbase-types"
import { useDistricts } from "@/api/reference"
import { districtName } from "@/content/placeNames"
import { categoryLabels, reportFilters as text } from "@/content/reports"

const categories = Object.keys(categoryLabels) as ReportsCategoryOptions[]

export function parseReportCategory(value: string | null): ReportsCategoryOptions | "" {
  return categories.find((category) => category === value) ?? ""
}

export function ReportFilters({ district, category, onDistrict, onCategory }: {
  district: string
  category: ReportsCategoryOptions | ""
  onDistrict: (value: string) => void
  onCategory: (value: ReportsCategoryOptions | "") => void
}) {
  const { data: districts } = useDistricts()
  return (
    <>
      <ReportFilterSelect label={text.district} value={district} onChange={onDistrict}>
        <option value="">{text.allDistricts}</option>
        {districts?.map((district) => (
          <option key={district.id} value={district.id}>{districtName(district)}</option>
        ))}
      </ReportFilterSelect>
      <ReportFilterSelect label={text.category} value={category} onChange={(value) => onCategory(parseReportCategory(value))}>
        <option value="">{text.allCategories}</option>
        {categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
      </ReportFilterSelect>
    </>
  )
}

export function ReportFilterSelect({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="min-w-0 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </label>
  )
}
