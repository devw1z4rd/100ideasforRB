import type { ReportsCategoryOptions, ReportsStatusOptions } from "@/api/pocketbase-types"

export const categoryLabels: Record<ReportsCategoryOptions, string> = {
  dump: "Свалка",
  discharge: "Сброс в воду",
  smoke: "Дым, выбросы",
  felling: "Вырубка",
  burning: "Пал, горение",
  other: "Другое",
}

export const statusLabels: Record<ReportsStatusOptions, string> = {
  new: "Новое",
  accepted: "Принято",
  forwarded: "Передано",
  resolved: "Устранено",
  rejected: "Отклонено",
}

export const publicStatuses: readonly ReportsStatusOptions[] = ["accepted", "forwarded", "resolved"]

export const statusTransitions: Record<ReportsStatusOptions, readonly ReportsStatusOptions[]> = {
  new: ["accepted", "rejected"],
  accepted: ["forwarded", "resolved", "rejected"],
  forwarded: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
}

export const statusHints: Record<ReportsStatusOptions, string> = {
  new: "Ждёт проверки модератором. До проверки его видите только вы.",
  accepted: "Модератор проверил обращение — оно видно всем на карте.",
  forwarded: "Передано в службу, которая может устранить проблему.",
  resolved: "Проблема устранена.",
  rejected: "Отклонено модератором — причина в комментарии.",
}

export const statusActions: Partial<Record<ReportsStatusOptions, string>> = {
  accepted: "Принять",
  forwarded: "Передать в службу",
  resolved: "Отметить устранённым",
  rejected: "Отклонить",
}

export const reportForm = {
  title: "Сообщить о проблеме",
  lead: "Без регистрации, меньше минуты: фото, место и что случилось. Модератор проверит обращение, и оно появится на карте.",
  photos: "Фото",
  photosHint: "до 5 снимков",
  addPhoto: "Сфотографировать или выбрать",
  removePhoto: "Убрать фото",
  photosTooMany: "Не больше 5 фото",
  photoTooBig: (name: string) => `${name} больше 8 МБ`,
  photoUnreadable: (name: string) =>
    `${name}: браузер не открывает этот формат. Выберите JPEG или PNG либо сфотографируйте камерой`,
  photosProcessing: "Готовим фото…",
  point: "Где это",
  locate: "Определить моё место",
  locateAgain: "Я здесь",
  locating: "Определяем…",
  pointHint: "или отметьте точку на карте",
  pointSet: "Место отмечено — можно уточнить, перетащив метку",
  yandexMap: "Яндекс Карты",
  loadingMap: "Загрузка карты…",
  zoomIn: "Приблизить карту",
  zoomOut: "Отдалить карту",
  locateFailed: "Не удалось определить — отметьте точку на карте",
  outside: "Точка вне Гомельской области — обращения принимаются только по области",
  category: "Что случилось",
  description: "Пара слов",
  optional: "необязательно",
  descriptionPlaceholder: "Что вы видите, как найти место",
  anonymous: "Отправляется без регистрации — следить за статусом можно по ссылке, которую вы получите.",
  loginOptional: "Войти, чтобы обращения были в профиле",
  asUser: (name: string) => `Отправляете как ${name} — обращение будет в вашем профиле.`,
  remaining: "Осталось",
  missingPoint: "место",
  missingCategory: "что случилось",
  ready: "Всё готово",
  submit: "Отправить",
  submitting: "Отправляем…",
  failed: "Не удалось отправить. Проверьте соединение и попробуйте ещё раз",
  tooMany: "Слишком много обращений подряд — попробуйте через несколько минут",
} as const

export const reportCard = {
  back: "Все обращения",
  created: "Обращение отправлено. Модератор проверит его — статус обновится здесь сам.",
  createdAnonymous:
    "Обращение отправлено. Сохраните ссылку на эту страницу — по ней видно статус. На этом устройстве обращение есть и во вкладке «Мои».",
  copyLink: "Скопировать ссылку",
  copied: "Ссылка скопирована",
  history: "История",
  historyCreated: "Обращение создано",
  moderatorComment: "Комментарий модератора",
  moderate: "Модерация",
  autoCheckHint: "Автопроверка — подсказка по признакам обращения, не решение. Решает модератор.",
  showPhotos: "Показать фото",
  photosHidden: "Фото скрыты до проверки — на них может быть что угодно",
  commentPlaceholder: "Комментарий для автора — будет виден в истории",
  notFound: "Обращение не найдено или ещё не прошло модерацию",
  failed: "Не удалось сменить статус",
} as const

export const reportsPage = {
  title: "Обращения жителей",
  lead: "Свалки, сбросы, дым и вырубки, о которых сообщили жители, — после проверки модератором. Статусы обновляются сами.",
  mine: "Мои обращения",
  all: "Все",
  empty: "Обращений пока нет",
  mineEmpty: "Вы ещё не отправляли обращений",
} as const

export const moderationPage = {
  title: "Модерация",
  lead: "Сначала — самые давние. Решение можно принять прямо здесь; комментарий для автора — в карточке обращения.",
  queue: "Ждут проверки",
  inWork: "В работе",
  empty: "Очередь пуста",
  forbidden: "Раздел доступен только модераторам.",
  showPhoto: "Показать фото",
  noPhoto: "Без фото",
  noDescription: "Без описания",
  anonymous: "без входа",
  open: "Открыть",
  failed: "Не удалось сменить статус — обновите страницу",
  link: "Модерация",
} as const

export const authPage = {
  login: "Вход",
  register: "Регистрация",
  email: "Email",
  password: "Пароль",
  passwordHint: "Не короче 8 символов",
  name: "Имя",
  submitLogin: "Войти",
  submitRegister: "Зарегистрироваться",
  forgotPassword: "Забыли пароль?",
  wrong: "Неверный email или пароль",
  taken: "Такой email уже зарегистрирован — войдите",
  failed: "Не получилось. Проверьте данные и попробуйте ещё раз",
  lead: "Аккаунт нужен, чтобы отправлять обращения и следить за их статусом.",
} as const

export const resetPassword = {
  title: "Восстановление пароля",
  lead: "Укажите email, с которым зарегистрировались.",
  send: "Отправить ссылку",
  sent: "Если аккаунт с таким email существует, мы отправили письмо. Проверьте входящие и папку «Спам».",
  newTitle: "Новый пароль",
  repeat: "Повторите пароль",
  mismatch: "Пароли не совпадают",
  save: "Сохранить пароль",
  saved: "Пароль изменён. Войдите с новым паролем.",
  invalid: "Ссылка недействительна или срок её действия истёк.",
  requestAgain: "Отправить новую ссылку",
  back: "Ко входу",
} as const

export const mePage = {
  title: "Профиль",
  logout: "Выйти",
  moderation: "Очередь модерации",
  newReport: "Новое обращение",
} as const

export const resultsPage = {
  title: "Что уже исправили",
  nav: "Результаты",
  lead: "Обращения жителей, которые дошли до результата: что заметили, кто взялся и сколько это заняло. Каждая история — настоящее обращение, его можно открыть.",
  resolved: "Устранено",
  inWork: "В работе",
  published: "Опубликовано обращений",
  typical: "Обычно устраняют за",
  days: (n: number) =>
    `${n} ${n % 10 === 1 && n % 100 !== 11 ? "день" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "дня" : "дней"}`,
  byCategory: "По видам проблем",
  ofPublished: (resolved: number, total: number) => `${resolved} из ${total} устранено`,
  stories: "Истории",
  reported: "Сообщили",
  fixed: "устранили",
  took: (days: string) => `за ${days}`,
  sameDay: "в тот же день",
  done: "Что сделано",
  emptyTitle: "Пока ни одна проблема не отмечена устранённой",
  emptyLead: (n: number) =>
    n
      ? `Сейчас в работе — ${n}. Как только служба устранит проблему, история появится здесь.`
      : "Сообщите о первой — так витрина и начнётся.",
  nowInWork: "Сейчас в работе",
  cta: "Сообщить о проблеме",
} as const
