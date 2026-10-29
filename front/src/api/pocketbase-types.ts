/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	AirDaily: "air_daily",
	AirPoints: "air_points",
	AirReadings: "air_readings",
	Articles: "articles",
	Districts: "districts",
	Enterprises: "enterprises",
	News: "news",
	Places: "places",
	ReportEvents: "report_events",
	Reports: "reports",
	Sources: "sources",
	Users: "users",
	WaterReadings: "water_readings",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

export type GeoPoint = {
	lon: number
	lat: number
}

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export type AirDailyRecord = {
	aqi_max?: number
	co_avg?: number
	co_max?: number
	created: IsoAutoDateString
	date: IsoDateString
	id: string
	no2_avg?: number
	no2_max?: number
	o3_avg?: number
	o3_max?: number
	pm10_avg?: number
	pm10_max?: number
	pm2_5_avg?: number
	pm2_5_max?: number
	point: RecordIdString
	so2_avg?: number
	so2_max?: number
	updated: IsoAutoDateString
}

export type AirPointsRecord = {
	active?: boolean
	created: IsoAutoDateString
	district?: RecordIdString
	id: string
	lat: number
	lon: number
	name: string
	updated: IsoAutoDateString
}

export type AirReadingsRecord = {
	co?: number
	created: IsoAutoDateString
	id: string
	is_forecast?: boolean
	no2?: number
	o3?: number
	pm10?: number
	pm2_5?: number
	point: RecordIdString
	so2?: number
	ts: IsoDateString
	updated: IsoAutoDateString
	us_aqi?: number
}

export type ArticlesRecord = {
	body: HTMLString
	category?: string
	created: IsoAutoDateString
	id: string
	is_published?: boolean
	order?: number
	slug: string
	title: string
	updated: IsoAutoDateString
}

export type DistrictsRecord<Tgeometry = unknown> = {
	area_km2?: number
	center?: GeoPoint
	created: IsoAutoDateString
	forest_cover?: number
	geometry?: null | Tgeometry
	id: string
	name: string
	name_be?: string
	population?: number
	updated: IsoAutoDateString
}

export type EnterprisesRecord = {
	city?: string
	created: IsoAutoDateString
	district?: RecordIdString
	emission_share?: number
	id: string
	location?: GeoPoint
	name: string
	short_name?: string
	source?: RecordIdString
	updated: IsoAutoDateString
	year?: number
}

export type NewsRecord = {
	body: HTMLString
	cover?: FileNameString
	created: IsoAutoDateString
	id: string
	is_published?: boolean
	published_at?: IsoDateString
	slug: string
	source_url?: string
	tag?: string
	title: string
	updated: IsoAutoDateString
}

export const PlacesKindOptions = {
	"problem": "problem",
	"clean": "clean",
	"oopt": "oopt",
} as const
export type PlacesKindOptions = typeof PlacesKindOptions[keyof typeof PlacesKindOptions]

export const PlacesSeverityOptions = {
	"high": "high",
	"medium": "medium",
	"low": "low",
} as const
export type PlacesSeverityOptions = typeof PlacesSeverityOptions[keyof typeof PlacesSeverityOptions]

export const PlacesPollutantsOptions = {
	"PM2.5": "PM2.5",
	"PM10": "PM10",
	"NO2": "NO2",
	"SO2": "SO2",
	"VOC": "VOC",
	"hydrocarbons": "hydrocarbons",
	"radionuclides": "radionuclides",
	"heavy_metals": "heavy_metals",
	"solid_waste": "solid_waste",
	"phosphates": "phosphates",
	"dust": "dust",
	"noise": "noise",
} as const
export type PlacesPollutantsOptions = typeof PlacesPollutantsOptions[keyof typeof PlacesPollutantsOptions]

export const PlacesCategoriesOptions = {
	"particles": "particles",
	"gases": "gases",
	"hydrocarbons": "hydrocarbons",
	"radionuclides": "radionuclides",
	"waste": "waste",
	"other": "other",
} as const
export type PlacesCategoriesOptions = typeof PlacesCategoriesOptions[keyof typeof PlacesCategoriesOptions]
export type PlacesRecord = {
	categories?: PlacesCategoriesOptions[]
	created: IsoAutoDateString
	district?: RecordIdString
	enterprise?: RecordIdString
	id: string
	kind: PlacesKindOptions
	location?: GeoPoint
	name: string
	note?: string
	pollutants?: PlacesPollutantsOptions[]
	severity?: PlacesSeverityOptions
	source?: RecordIdString
	updated: IsoAutoDateString
}

export type ReportEventsRecord = {
	actor?: RecordIdString
	comment?: string
	created: IsoAutoDateString
	from_status?: string
	id: string
	report: RecordIdString
	to_status: string
}

export const ReportsCategoryOptions = {
	"dump": "dump",
	"discharge": "discharge",
	"smoke": "smoke",
	"felling": "felling",
	"burning": "burning",
	"other": "other",
} as const
export type ReportsCategoryOptions = typeof ReportsCategoryOptions[keyof typeof ReportsCategoryOptions]

export const ReportsStatusOptions = {
	"new": "new",
	"accepted": "accepted",
	"forwarded": "forwarded",
	"resolved": "resolved",
	"rejected": "rejected",
} as const
export type ReportsStatusOptions = typeof ReportsStatusOptions[keyof typeof ReportsStatusOptions]
export type ReportsRecord = {
	ai_category?: string
	ai_confidence?: number
	author: RecordIdString
	category: ReportsCategoryOptions
	created: IsoAutoDateString
	description: string
	district?: RecordIdString
	duplicate_of?: RecordIdString
	id: string
	location: GeoPoint
	moderator_comment?: string
	photos?: FileNameString[]
	status: ReportsStatusOptions
	updated: IsoAutoDateString
}

export const SourcesKindOptions = {
	"model": "model",
	"official": "official",
	"media": "media",
	"user": "user",
	"reference": "reference",
} as const
export type SourcesKindOptions = typeof SourcesKindOptions[keyof typeof SourcesKindOptions]
export type SourcesRecord = {
	accessed_at?: IsoDateString
	created: IsoAutoDateString
	id: string
	kind: SourcesKindOptions
	license?: string
	publisher?: string
	title: string
	updated: IsoAutoDateString
	url?: string
}

export const UsersRoleOptions = {
	"user": "user",
	"moderator": "moderator",
	"admin": "admin",
} as const
export type UsersRoleOptions = typeof UsersRoleOptions[keyof typeof UsersRoleOptions]
export type UsersRecord = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	notify_aqi_threshold?: number
	notify_district?: RecordIdString
	password: string
	role: UsersRoleOptions
	telegram_id?: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const WaterReadingsRiverOptions = {
	"Сож": "Сож",
	"Припять": "Припять",
	"Днепр": "Днепр",
	"Березина": "Березина",
} as const
export type WaterReadingsRiverOptions = typeof WaterReadingsRiverOptions[keyof typeof WaterReadingsRiverOptions]

export const WaterReadingsIndicatorOptions = {
	"turbidity": "turbidity",
	"nitrates": "nitrates",
	"bod5": "bod5",
	"ph": "ph",
	"hardness": "hardness",
} as const
export type WaterReadingsIndicatorOptions = typeof WaterReadingsIndicatorOptions[keyof typeof WaterReadingsIndicatorOptions]
export type WaterReadingsRecord = {
	created: IsoAutoDateString
	id: string
	indicator: WaterReadingsIndicatorOptions
	norm?: number
	period: IsoDateString
	post?: string
	river: WaterReadingsRiverOptions
	source?: RecordIdString
	unit?: string
	updated: IsoAutoDateString
	value: number
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AirDailyResponse<Texpand = unknown> = Required<AirDailyRecord> & BaseSystemFields<Texpand>
export type AirPointsResponse<Texpand = unknown> = Required<AirPointsRecord> & BaseSystemFields<Texpand>
export type AirReadingsResponse<Texpand = unknown> = Required<AirReadingsRecord> & BaseSystemFields<Texpand>
export type ArticlesResponse<Texpand = unknown> = Required<ArticlesRecord> & BaseSystemFields<Texpand>
export type DistrictsResponse<Tgeometry = unknown, Texpand = unknown> = Required<DistrictsRecord<Tgeometry>> & BaseSystemFields<Texpand>
export type EnterprisesResponse<Texpand = unknown> = Required<EnterprisesRecord> & BaseSystemFields<Texpand>
export type NewsResponse<Texpand = unknown> = Required<NewsRecord> & BaseSystemFields<Texpand>
export type PlacesResponse<Texpand = unknown> = Required<PlacesRecord> & BaseSystemFields<Texpand>
export type ReportEventsResponse<Texpand = unknown> = Required<ReportEventsRecord> & BaseSystemFields<Texpand>
export type ReportsResponse<Texpand = unknown> = Required<ReportsRecord> & BaseSystemFields<Texpand>
export type SourcesResponse<Texpand = unknown> = Required<SourcesRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type WaterReadingsResponse<Texpand = unknown> = Required<WaterReadingsRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	air_daily: AirDailyRecord
	air_points: AirPointsRecord
	air_readings: AirReadingsRecord
	articles: ArticlesRecord
	districts: DistrictsRecord
	enterprises: EnterprisesRecord
	news: NewsRecord
	places: PlacesRecord
	report_events: ReportEventsRecord
	reports: ReportsRecord
	sources: SourcesRecord
	users: UsersRecord
	water_readings: WaterReadingsRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	air_daily: AirDailyResponse
	air_points: AirPointsResponse
	air_readings: AirReadingsResponse
	articles: ArticlesResponse
	districts: DistrictsResponse
	enterprises: EnterprisesResponse
	news: NewsResponse
	places: PlacesResponse
	report_events: ReportEventsResponse
	reports: ReportsResponse
	sources: SourcesResponse
	users: UsersResponse
	water_readings: WaterReadingsResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
