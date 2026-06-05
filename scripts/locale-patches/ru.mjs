import { patchLegalLocale } from "./legal/patch-legal.mjs";
import { patchBreadcrumbLocale } from "./breadcrumb/patch-breadcrumb.mjs";

export default function patchRU(d) {
  d.Nav = {
    ...d.Nav,
    home: "Главная",
    about: "О нас",
    flights: "Авиабилеты",
    cars: "Авто",
    hotels: "Отели",
    contact: "Контакты",
    theme: "Тема",
    currency: "Валюта",
    language: "Язык",
    account: "Аккаунт",
    profile: "Профиль",
    bookings: "Бронирования",
    adminConsole: "Админ-панель",
    logout: "Выйти",
    login: "Войти",
    signup: "Регистрация",
    navigationSection: "Навигация",
    languageCurrencyHeading: "Язык и валюта",
    toggleMenu: "Открыть меню",
    themeSettingsAria: "Настройки темы",
    lightModeAria: "Светлая тема",
    darkModeAria: "Тёмная тема",
    adminPanel: "Панель администратора",
  };
  d.Footer = {
    ...d.Footer,
    rights: "Все права защищены.",
    stayTitle: "Будьте в курсе",
    staySubtitle:
      "Эксклюзивные предложения, советы путешественникам и вдохновение — прямо на почту.",
    subscribedTitle: "Готово!",
    subscribedSubtitle: "Проверьте почту — мы отправили приветственное письмо.",
    emailPlaceholder: "Ваш e-mail",
    subscribe: "Подписаться",
    subscribing: "Подписка…",
    noSpam: "Без спама. Отписка в любой момент.",
    tagline:
      "Надёжный партнёр для незабываемых путешествий. Бронируйте авиабилеты, отели, авто и туры с эксклюзивными предложениями по всему миру.",
    quickLinksTitle: "Быстрые ссылки",
    servicesTitle: "Услуги",
    contactTitle: "Контакты",
    copyright: "TravelTourUp. Все права защищены.",
    weAccept: "Мы принимаем",
    privacy: "Политика конфиденциальности",
    terms: "Условия использования",
    quick_home: "Главная",
    quick_about: "О нас",
    quick_blog: "Блог",
    quick_contact: "Связаться с нами",
    svc_hotels: "Бронирование отелей",
    svc_flights: "Авиабилеты",
    svc_cars: "Аренда авто",
    svc_tours: "Туры",
    svc_faqs: "FAQ",
    newsletterEmailInvalid: "Введите корректный адрес e-mail.",
    newsletterEmailRequired: "Введите адрес e-mail.",
    newsletterEmailAria: "E-mail для рассылки",
    brandAlt: "TravelTourUp",
  };
  d.Common = {
    clearAll: "Сбросить всё",
    filters: "Фильтры",
    applyFilters: "Применить фильтры",
    previous: "Назад",
    next: "Далее",
    close: "Закрыть",
    loading: "Загрузка…",
  };
  d.Hero = {
    ...d.Hero,
    headlinePrefix: "Откройте мир и",
    tagline:
      "Ваше следующее путешествие — в один клик: незабываемые впечатления и выгодные цены.",
    rotate0: "Открыть",
    rotate1: "Приключение",
    rotate2: "Исследовать",
    rotate3: "Путешествовать",
    rotate4: "Бродить",
    rotate5: "Жить",
    rotate6: "Мечтать",
    rotate7: "Сбежать",
    rotate8: "Праздновать",
    rotate9: "Расслабиться",
    rotate10: "Наслаждаться",
    tabFlights: "РЕЙСЫ",
    tabCars: "АВТО",
    tabHotels: "ОТЕЛИ",
    tabMore: "ЕЩЁ",
  };
  d.Featured = {
    ...d.Featured,
    flightsHeading: "Популярные рейсы",
    flightsSubtitle:
      "Вдохновение — цены ненадолго из кэша нашего партнёра",
    flightsHeroTitle: "Популярные рейсы",
    flightsHeroDescription:
      "Направления с высоким спросом — цены из поиска в реальном времени (обновляйте чаще).",
    flightsCta: "Все рейсы",
    hotelsHeading: "Популярные отели",
    hotelsSubtitle: "Выдающиеся места по выгодным ценам",
    hotelsEmptyTitle: "Популярные отели",
    hotelsEmptySubtitle: "Пока нет доступных отелей.",
    hotelsLoadingAria: "Загрузка популярных отелей",
    hotelsDiscoverTitle: "Выгодные предложения",
    hotelsDiscoverSubtitle: "на отели по всему миру",
    hotelsViewMore: "Ещё",
    hotelsAdAlt: "Выгодные предложения на отели по всему миру",
    hotelsFallbackBanner: "Предложения отелей",
  };
  d.Categories = {
    ...d.Categories,
    title: "Категории",
    subtitle: "Необычные места для вашего следующего путешествия",
    prevAria: "Предыдущие категории",
    nextAria: "Следующие категории",
    goToSlide: "Перейти к слайду {n}",
  };
  d.RecommendedCars = {
    ...d.RecommendedCars,
    sectionTitle: "Рекомендуемые трансферы на авто",
    sectionSubtitle: "Комфортный и надёжный транспорт для любых поездок",
    featuredFallbackTitle: "Премиум-трансферы на авто",
    featuredFallbackDesc: "Комфорт и люкс с профессиональными водителями",
    exploreAll: "Все автомобили",
    placeholderBanner: "АРЕНДА АВТО",
    bannerAlt: "Премиум-трансферы — комфорт и люкс в дороге",
  };
  d.Stats = {
    ...d.Stats,
    hotelsTitle: "Отели по всему миру",
    hotelsDesc: "Роскошное размещение по лучшим ценам",
    destinationsTitle: "Направления",
    destinationsDesc: "Исследуйте необычные места",
    satisfactionTitle: "Довольство клиентов",
    satisfactionDesc: "Довольные путешественники и положительные отзывы",
  };
  d.FAQ.title = "Частые вопросы";
  d.FAQ.subtitle =
    "Ответы на популярные вопросы о сервисе, бронировании и правилах";
  d.FAQ.items = [
    {
      question: "Как изменить или отменить бронирование авиабилета?",
      answer:
        "Войдите в аккаунт и откройте «Бронирования». Изменения и отмена могут зависеть от правил и сборов авиакомпании.",
    },
    {
      question: "Какие документы нужны для международной поездки?",
      answer:
        "Обычно: действующий паспорт, виза при необходимости, медицинские документы по требованиям страны. Проверьте условия въезда до выезда.",
    },
    {
      question: "Как узнать, возвратный ли билет?",
      answer:
        "Это зависит от тарифа. Смотрите подтверждение бронирования или напишите в поддержку.",
    },
    {
      question: "Можно ли выбрать место при бронировании?",
      answer:
        "Часто да при оформлении; иначе обычно при онлайн-регистрации.",
    },
    {
      question: "Что делать при задержке или отмене рейса?",
      answer:
        "Авиакомпания часто сообщает по e-mail или SMS. Проверьте статус на сайте или в приложении. Обратитесь в поддержку для нового билета.",
    },
    {
      question: "Как забронировать для группы?",
      answer:
        "Укажите число пассажиров при бронировании. Для более чем 10 человек свяжитесь с отделом групп для тарифов и помощи.",
    },
    {
      question: "Есть ли скрытые платежи по авиабилетам?",
      answer:
        "Мы показываем налоги и обязательные сборы в итоговой цене. Опции (багаж, место и т. д.) могут оплачиваться отдельно.",
    },
    {
      question: "Как узнать норму багажа?",
      answer:
        "Зависит от авиакомпании и тарифа. Смотрите подтверждение или сайт перевозчика.",
    },
    {
      question: "Безопасно ли бронировать на сайте?",
      answer:
        "Да, сайт использует шифрование для персональных данных и платежей.",
    },
    {
      question: "Могу ли забронировать другого человека с моего аккаунта?",
      answer:
        "Да. Укажите данные путешественника при оформлении.",
    },
  ];
  d.Reviews.prevAria = "Предыдущий отзыв";
  d.Reviews.nextAria = "Следующий отзыв";
  d.Reviews.goToSlide = "Перейти к слайду {n}";
  d.Reviews.items = [
    {
      name: "Maria Smantha",
      role: "Веб-разработчик",
      text: "TravelTourUp сделал бронирование очень простым. Я нашла идеальный отель за пару минут — всё прошло гладко. Цены были лучше, чем у других.",
      image: d.Reviews.items[0].image,
    },
    {
      name: "Lisa Cudrow",
      role: "Графический дизайнер",
      text: "Понятная и приятная платформа. Сравнивала отели и рейсы без путаницы. Хорошие предложения и быстрая поддержка.",
      image: d.Reviews.items[1].image,
    },
    {
      name: "John Smith",
      role: "Маркетолог",
      text: "Отличный опыт: доступные рейсы и удобный отель. Буду снова пользоваться TravelTourUp для поездок.",
      image: d.Reviews.items[2].image,
    },
  ];
  d.MoreServices.message = "Скоро ещё сервисы…";
  d.About = {
    ...d.About,
    historyTitle: "Открывайте мир с нами",
    historySubtitle: "С 1998 года",
    historyDescription:
      "Наша цель — надёжный и комфортный туризм. Сегодня мы предлагаем широкий выбор премиум-авто для ваших поездок.",
    feat1: "Большой выбор автомобилей класса люкс",
    feat2: "Роскошные отели в отличном состоянии",
    feat3: "Простое и понятное бронирование",
    feat4: "Высокий уровень поддержки клиентов",
  };
  d.Flights.sort = {
    best: "Лучшее совпадение",
    price_asc: "Дешевле",
    price_desc: "Дороже",
    duration_asc: "Короче по времени",
    duration_desc: "Дольше по времени",
    sortBy: "Сортировать по",
  };
  d.Flights.stops = {
    any: "Любое число пересадок",
    direct: "Только прямые",
    one: "Не более 1 пересадки",
    two: "Не более 2 пересадок",
    label: "Пересадки",
  };
  d.Flights.filters = {
    title: "Фильтры",
    price: "Цена",
    airlines: "Авиакомпании",
    flightNumber: "Номер рейса",
    flightNumberPlaceholder: "напр. SU 123",
    flightTime: "Время рейса",
    flightTimeHint:
      "Вылет первого сегмента / прилёт последнего (местное время)",
  };
  d.Flights.results = {
    ...d.Flights.results,
    searchFailed: "Не удалось выполнить поиск рейсов",
    roundTripTotal: "Итого туда-обратно",
    oneWayTotal: "Итого в одну сторону",
    roundTripSteps: "Этапы поездки",
    outbound: "Туда",
    inbound: "Обратно",
    returnStep: "Обратный",
    changeOutbound: "Изменить туда",
    loadingResults: "Загрузка результатов…",
    noMatching: "Нет подходящих рейсов",
    listView: "Список",
    gridView: "Сетка",
    filtersSortButton: "Фильтры и сортировка",
    mobileFilters: "Фильтры",
    done: "Готово",
    startSearchTitle: "Начните поиск рейсов",
    startSearchBody:
      "Укажите маршрут, даты и пассажиров в форме выше.",
    noFlightsTitle: "Рейсы не найдены",
    noFlightsBody: "Попробуйте изменить фильтры",
    clearFilters: "Сбросить фильтры",
    showingRange: "Показано {start}–{end} из {total} рейсов",
    paginationPage: "Страница {page} из {total}",
    prevPage: "Предыдущая страница",
    nextPage: "Следующая страница",
    importantTitle: "Важная информация",
    importantSubtitle: "Учтите перед подтверждением рейса.",
    baggageTitle: "Багаж",
    baggageBody:
      "Нормы зависят от авиакомпании и тарифа — проверьте условия предложения.",
    requirementsTitle: "Требования для поездки",
    requirementsBody:
      "Проверьте визы, правила въезда и медицинские требования для вашего направления.",
    flexibleTitle: "Гибкое бронирование",
    flexibleBody:
      "Обмен и возврат по правилам тарифа — прочитайте перед оплатой.",
    paginationNav: "Страницы результатов поиска рейсов",
  };
  d.Hotels.tab = {
    ...d.Hotels.tab,
    alertSelectDestination: "Выберите направление.",
    alertSelectDates: "Выберите даты заезда и выезда.",
    alertDestinationUnavailable:
      "Это направление пока недоступно для прямого поиска отелей.",
    searchFailed: "Поиск не удался. Повторите попытку или проверьте настройки.",
    destinationLabel: "Направление",
    destinationPlaceholder: "Введите для фильтра",
    popularSection: "Популярные направления",
    popularHint:
      "Популярные направления — введите минимум 2 буквы для поиска через Duffel",
    noMatching: "Нет подходящих мест",
    roomsTravelers: "Номера и гости",
    nationality: "Гражданство",
    searchHotels: "Искать отели",
    selectDestination: "Выбрать направление",
    selectDate: "Выбрать дату",
    checkIn: "Заезд",
    checkOut: "Выезд",
    checkInDateLabel: "Дата заезда",
    checkOutDateLabel: "Дата выезда",
    destinationsAria: "Направления для отелей",
    roomsGuestsLabel: "Номера и гости",
    roomsCounterLabel: "Номера",
    roomSingular: "Номер",
    roomsPlural: "Номера",
    travelerSingular: "Гость",
    travelersPlural: "Гости",
    adults: "Взрослые",
    children: "Дети",
  };
  d.Hotels.results = {
    ...d.Hotels.results,
    sortLabel: "Сортировать:",
    sortPlaceholder: "Сортировать по",
    loadingResults: "Загрузка результатов…",
    noMatching: "Нет подходящих объектов",
    showingRange: "Показано {start}–{end} из {total}",
    propertySingular: "объект",
    propertyPlural: "объектов",
    totalInParens: " ({total} всего)",
    filtersSortButton: "Фильтры и сортировка",
    filtersTitle: "Фильтры",
    done: "Готово",
    showFiltersButton: "Показать фильтры",
    applyFilters: "Применить фильтры",
    sortOpenMenuAria: "Сортировать по — открыть меню",
    sortByFallback: "Сортировать по",
    clearAllFilters: "Сбросить всё",
    sort: {
      best: "Лучший",
      price_low: "Цена (по возрастанию)",
      price_high: "Цена (по убыванию)",
      rating: "Оценка гостей",
      stars: "Звёзды",
      distance: "Расстояние",
    },
  };
  d.Cars.tab = {
    ...d.Cars.tab,
    fromAirportLabel: "Из аэропорта",
    searchPlaceholder: "Поиск места…",
    selectLocation: "Выбрать место",
    dateLabel: "Дата",
    selectDate: "Выбрать дату",
    travelersLabel: "Пассажиры",
    adults: "Взрослые",
    children: "Дети",
    travelerSingular: "пассажир",
    travelerPlural: "пассажиров",
    searchCarsAria: "Искать автомобили",
  };
  d.Auth = {
    ...d.Auth,
    loginTitle: "С возвращением",
    loginSubtitle: "Войдите по e-mail",
    signupTitle: "Создать аккаунт",
    email: "E-mail",
    password: "Пароль",
    rememberMe: "Запомнить меня",
    forgotPassword: "Забыли пароль?",
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    noAccount: "Нет аккаунта?",
    hasAccount: "Уже есть аккаунт?",
    orContinueWith: "Или продолжить с",
    terms: "Условия использования",
    privacy: "Политика конфиденциальности",
    oauthRedirecting: "Переход…",
    signInFailed:
      "Не удалось войти. Повторите попытку или используйте e-mail и пароль.",
    passwordUpdated:
      "Пароль обновлён. Войдите с новым паролем.",
  };

  // Home: hotels
  d.Home.hotels = [
    {
      name: "Люксовый курорт и спа на пляже",
      location: "Бали, Индонезия",
      price: 299,
      rating: 4.8,
      reviews: "1,2 тыс.",
      facilities: ["Wi‑Fi", "Бассейн", "Спа", "Спортзал"],
    },
    {
      name: "Отель Grand Palace",
      location: "Париж, Франция",
      price: 320,
      rating: 4.9,
      reviews: "892",
      facilities: ["Wi‑Fi", "Ресторан", "Бар", "Спа"],
    },
    {
      name: "Курорт с видом на океан",
      location: "Мальдивы",
      price: 450,
      rating: 4.7,
      reviews: "1,5 тыс.",
      facilities: ["Пляж", "Бассейн", "Спа", "Дайвинг"],
    },
    {
      name: "Горный ретрит «Вершина»",
      location: "Швейцарские Альпы",
      price: 280,
      rating: 4.6,
      reviews: "734",
      facilities: ["Лыжи", "Спа", "Камин", "Wi‑Fi"],
    },
    {
      name: "Люксовые городские люксы",
      location: "Нью-Йорк, США",
      price: 380,
      rating: 4.8,
      reviews: "2,1 тыс.",
      facilities: ["Wi‑Fi", "Спортзал", "Бар", "Конференции"],
    },
    {
      name: "Пустынный оазис-курорт",
      location: "Дубай, ОАЭ",
      price: 420,
      rating: 4.9,
      reviews: "1,8 тыс.",
      facilities: ["Бассейн", "Спа", "Гольф", "Пляж"],
    },
  ];
  d.Home.categories = [
    { key: "beach", name: "Пляж" },
    { key: "desert", name: "Пустыня" },
    { key: "mountain", name: "Горы" },
    { key: "temple", name: "Храм" },
    { key: "tower", name: "Башня" },
    { key: "pyramid", name: "Пирамида" },
    { key: "city", name: "Город" },
    { key: "forest", name: "Лес" },
    { key: "waterfall", name: "Водопад" },
    { key: "lake", name: "Озеро" },
    { key: "island", name: "Остров" },
    { key: "canyon", name: "Каньон" },
  ];
  d.Home.featuredCar = {
    title: "Премиум-трансферы на авто",
    description: "Комфорт и люкс с профессиональными водителями",
    buttonText: "Все автомобили",
  };
  d.Home.cars = [
    {
      name: "Toyota Camry",
      type: "Седан",
      passengers: 4,
      luggage: 2,
      price: 45,
      originalPrice: 60,
      features: ["Кондиционер", "Wi‑Fi", "GPS"],
    },
    {
      name: "Honda Accord",
      type: "Седан",
      passengers: 4,
      luggage: 3,
      price: 48,
      originalPrice: 65,
      features: ["Кондиционер", "USB", "Кожа"],
    },
    {
      name: "Toyota RAV4",
      type: "Внедорожник",
      passengers: 5,
      luggage: 4,
      price: 65,
      originalPrice: 85,
      features: ["Кондиционер", "Полный привод", "Рейлинги"],
    },
    {
      name: "Ford Explorer",
      type: "Внедорожник",
      passengers: 7,
      luggage: 5,
      price: 75,
      originalPrice: 95,
      features: ["Кондиционер", "7 мест", "Премиум-аудио"],
    },
    {
      name: "Mercedes E-Class",
      type: "Люкс",
      passengers: 4,
      luggage: 3,
      price: 120,
      originalPrice: 150,
      features: ["Кожа", "Панорама", "Массаж сидений"],
    },
    {
      name: "BMW 5 Series",
      type: "Люкс",
      passengers: 4,
      luggage: 2,
      price: 125,
      originalPrice: 160,
      features: ["Премиум", "Подогрев сидений", "Развлечения"],
    },
    {
      name: "Toyota Sienna",
      type: "Минивэн",
      passengers: 8,
      luggage: 6,
      price: 85,
      originalPrice: 110,
      features: ["Кондиционер", "8 мест", "Раздвижные двери"],
    },
    {
      name: "Mercedes V-Class",
      type: "Минивэн",
      passengers: 8,
      luggage: 7,
      price: 110,
      originalPrice: 140,
      features: ["Люкс", "TV", "Холодильник"],
    },
  ];

  patchLegalLocale(d, "ru");
  patchBreadcrumbLocale(d, "ru");
}
