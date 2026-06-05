import { patchLegalLocale } from "./legal/patch-legal.mjs";
import { patchBreadcrumbLocale } from "./breadcrumb/patch-breadcrumb.mjs";

export default function patchAR(d) {
  d.Nav = {
    ...d.Nav,
    home: "الرئيسية",
    about: "من نحن",
    flights: "الطيران",
    cars: "السيارات",
    hotels: "الفنادق",
    contact: "اتصل بنا",
    theme: "المظهر",
    currency: "العملة",
    language: "اللغة",
    account: "الحساب",
    profile: "الملف الشخصي",
    bookings: "الحجوزات",
    adminConsole: "لوحة الإدارة",
    logout: "تسجيل الخروج",
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    navigationSection: "التنقل",
    languageCurrencyHeading: "اللغة والعملة",
    toggleMenu: "فتح القائمة",
    themeSettingsAria: "إعدادات المظهر",
    lightModeAria: "الوضع الفاتح",
    darkModeAria: "الوضع الداكن",
    adminPanel: "لوحة الإدارة",
  };
  d.Footer = {
    ...d.Footer,
    rights: "جميع الحقوق محفوظة.",
    stayTitle: "ابقَ على اطلاع",
    staySubtitle:
      "احصل على عروض حصرية ونصائح سفر وإلهام في بريدك.",
    subscribedTitle: "تم!",
    subscribedSubtitle: "تحقق من بريدك للرسالة الترحيبية.",
    emailPlaceholder: "بريدك الإلكتروني",
    subscribe: "اشترك",
    subscribing: "جاري الاشتراك…",
    noSpam: "بدون إزعاج. يمكنك إلغاء الاشتراك في أي وقت.",
    tagline:
      "شريكك الموثوق لتجارب سفر لا تُنسى. احجز طيرانًا وفنادق وسيارات وجولات بعروض حصرية حول العالم.",
    quickLinksTitle: "روابط سريعة",
    servicesTitle: "الخدمات",
    contactTitle: "تواصل",
    copyright: "TravelTourUp. جميع الحقوق محفوظة.",
    weAccept: "نقبل",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    quick_home: "الرئيسية",
    quick_about: "من نحن",
    quick_blog: "المدونة",
    quick_contact: "اتصل بنا",
    svc_hotels: "حجز فندق",
    svc_flights: "تذاكر طيران",
    svc_cars: "تأجير سيارات",
    svc_tours: "باقات جولات",
    svc_faqs: "الأسئلة الشائعة",
    newsletterEmailInvalid: "يرجى إدخال بريد إلكتروني صالح.",
    newsletterEmailRequired: "يرجى إدخال بريدك الإلكتروني.",
    newsletterEmailAria: "البريد للنشرة الإخبارية",
    brandAlt: "TravelTourUp",
  };
  d.Common = {
    clearAll: "مسح الكل",
    filters: "عوامل التصفية",
    applyFilters: "تطبيق المرشحات",
    previous: "السابق",
    next: "التالي",
    close: "إغلاق",
    loading: "جاري التحميل…",
  };
  d.Hero = {
    ...d.Hero,
    headlinePrefix: "اكتشف العالم و",
    tagline:
      "مغامرتك القادمة بنقرة واحدة — تجارب لا تُنسى وعروض لا تُضاهى.",
    rotate0: "اكتشف",
    rotate1: "مغامرة",
    rotate2: "استكشف",
    rotate3: "سافر",
    rotate4: "تجوّل",
    rotate5: "عِش",
    rotate6: "احلم",
    rotate7: "اهرب",
    rotate8: "احتفل",
    rotate9: "استرخِ",
    rotate10: "استمتع",
    tabFlights: "طيران",
    tabCars: "سيارات",
    tabHotels: "فنادق",
    tabMore: "المزيد",
  };
  d.Featured = {
    ...d.Featured,
    flightsHeading: "رحلات مميزة",
    flightsSubtitle:
      "للإلهام — أسعار مخزنة مؤقتًا من شريكنا",
    flightsHeroTitle: "رحلات مميزة",
    flightsHeroDescription:
      "عروض لوجهات شائعة — أسعار من البحث المباشر (حدّث بانتظام).",
    flightsCta: "عرض كل الرحلات",
    hotelsHeading: "فنادق مميزة",
    hotelsSubtitle: "أماكن استثنائية بأسعار مناسبة",
    hotelsEmptyTitle: "فنادق مميزة",
    hotelsEmptySubtitle: "لا توجد فنادق متاحة حاليًا.",
    hotelsLoadingAria: "جاري تحميل الفنادق المميزة",
    hotelsDiscoverTitle: "استفد من عروض رائعة",
    hotelsDiscoverSubtitle: "على فنادق حول العالم",
    hotelsViewMore: "عرض المزيد",
    hotelsAdAlt: "عروض فنادق رائعة حول العالم",
    hotelsFallbackBanner: "عروض فنادق",
  };
  d.Categories = {
    ...d.Categories,
    title: "التصنيفات",
    subtitle: "اكتشف أماكن استثنائية لمغامرتك القادمة",
    prevAria: "التصنيفات السابقة",
    nextAria: "التصنيفات التالية",
    goToSlide: "الانتقال إلى الشريحة {n}",
  };
  d.RecommendedCars = {
    ...d.RecommendedCars,
    sectionTitle: "سيارات نقل موصى بها",
    sectionSubtitle: "نقل مريح وموثوق لجميع تنقلاتك",
    featuredFallbackTitle: "نقل فاخر بالسيارة",
    featuredFallbackDesc: "راحة وفخامة مع سائقين محترفين",
    exploreAll: "عرض كل السيارات",
    placeholderBanner: "تأجير سيارات",
    bannerAlt: "نقل فاخر — راحة وفخامة لرحلتك",
  };
  d.Stats = {
    ...d.Stats,
    hotelsTitle: "فنادق حول العالم",
    hotelsDesc: "إقامات فاخرة بأفضل الأسعار",
    destinationsTitle: "الوجهات",
    destinationsDesc: "استكشف أماكن استثنائية",
    satisfactionTitle: "رضا العملاء",
    satisfactionDesc: "مسافرون راضون وتقييمات إيجابية",
  };
  d.FAQ.title = "الأسئلة الشائعة";
  d.FAQ.subtitle =
    "إجابات عن الأسئلة المتكررة حول خدماتنا والحجوزات والسياسات";
  d.FAQ.items = [
    {
      question: "كيف أعدّل أو ألغي حجز رحلة طيران؟",
      answer:
        "سجّل الدخول إلى حسابك وافتح الحجوزات. التعديل أو الإلغاء يخضع لشروط ورسوم شركة الطيران.",
    },
    {
      question: "ما المستندات المطلوبة للسفر الدولي؟",
      answer:
        "عادةً: جواز سفر ساري، وتأشيرة إن لزم، ومستندات صحية حسب الدولة. تحقق من شروط الدخول قبل السفر.",
    },
    {
      question: "كيف أعرف إن كان تذكرتي قابلة للاسترداد؟",
      answer:
        "يعتمد على قواعد السعر. راجع تأكيد الحجز أو تواصل مع الدعم.",
    },
    {
      question: "هل يمكنني اختيار مقعدي عند الحجز؟",
      answer:
        "غالبًا أثناء الحجز؛ وإلا غالبًا عند إتمام تسجيل الوصول عبر الإنترنت.",
    },
    {
      question: "ماذا أفعل عند تأخير أو إلغاء رحلة؟",
      answer:
        "غالبًا تُعلِمك شركة الطيران عبر البريد أو الرسائل. تحقق أيضًا من الحالة على موقعنا أو التطبيق. تواصل مع الدعم لتذكرة بديلة.",
    },
    {
      question: "كيف أحجز لمجموعة؟",
      answer:
        "حدّد عدد المسافرين أثناء الحجز. لأكثر من 10 أشخاص تواصل مع فريق المجموعات للأسعار والمساعدة.",
    },
    {
      question: "هل توجد رسوم مخفية على الطيران؟",
      answer:
        "نعرض الضرائب والرسوم الإلزامية في السعر النهائي. الخيارات (أمتعة، مقعد…) قد تُحسب بشكل منفصل.",
    },
    {
      question: "كيف أعرف حصتي من الأمتعة؟",
      answer:
        "تختلف حسب شركة الطيران والسعر. راجع التأكيد أو موقع الشركة.",
    },
    {
      question: "هل الحجز عبر موقعكم آمٍ؟",
      answer:
        "نعم، يستخدم موقعنا تشفيرًا آمِنًا لبياناتك ومدفوعاتك.",
    },
    {
      question: "هل يمكنني الحجز لشخص آخر بحسابي؟",
      answer:
        "نعم. أدخل بيانات المسافر أثناء الحجز.",
    },
  ];
  d.Reviews.prevAria = "التقييم السابق";
  d.Reviews.nextAria = "التقييم التالي";
  d.Reviews.goToSlide = "الانتقال إلى الشريحة {n}";
  d.Reviews.items = [
    {
      name: "Maria Smantha",
      role: "مطوّرة ويب",
      text: "جعل TravelTourUp الحجز سهلًا جدًا. وجدت الفندق المثالي في دقائق وكل شيء سار بسلاسة. الأسعار أفضل من غيره.",
      image: d.Reviews.items[0].image,
    },
    {
      name: "Lisa Cudrow",
      role: "مصممة جرافيك",
      text: "منصة واضحة وممتعة. قارنت الفنادق والطيران دون ارتباك. عروض جيدة ودعم سريع.",
      image: d.Reviews.items[1].image,
    },
    {
      name: "John Smith",
      role: "مسؤول تسويق",
      text: "تجربة رائعة: طيران بأسعار مناسبة وفندق مريح. سأستخدم TravelTourUp مجددًا.",
      image: d.Reviews.items[2].image,
    },
  ];
  d.MoreServices.message = "خدمات إضافية قريبًا…";
  d.About = {
    ...d.About,
    historyTitle: "اكتشف العالم معنا",
    historySubtitle: "منذ 1998",
    historyDescription:
      "هدفنا خدمات سفر موثوقة ومريحة. اليوم نقدّم مجموعة واسعة من المركبات الفاخرة لرحلاتك.",
    feat1: "خيارات واسعة من سيارات الفخامة",
    feat2: "فنادق فاخرة بحالة ممتازة",
    feat3: "حجز بسيط وبديهي",
    feat4: "دعم عملاء متميز",
  };
  d.Flights.sort = {
    best: "أفضل تطابق",
    price_asc: "الأرخص",
    price_desc: "الأغلى",
    duration_asc: "أقصر مدة",
    duration_desc: "أطول مدة",
    sortBy: "ترتيب حسب",
  };
  d.Flights.stops = {
    any: "أي عدد توقفات",
    direct: "مباشر فقط",
    one: "توقف واحد كحد أقصى",
    two: "توقفتان كحد أقصى",
    label: "التوقفات",
  };
  d.Flights.filters = {
    title: "عوامل التصفية",
    price: "السعر",
    airlines: "شركات الطيران",
    flightNumber: "رقم الرحلة",
    flightNumberPlaceholder: "مثال AF 123",
    flightTime: "أوقات الرحلة",
    flightTimeHint:
      "إقلاع أول مقطع / وصول آخر مقطع (التوقيت المحلي)",
  };
  d.Flights.results = {
    ...d.Flights.results,
    searchFailed: "فشل البحث عن الرحلات",
    roundTripTotal: "إجمالي ذهاب وإياب",
    oneWayTotal: "إجمالي اتجاه واحد",
    roundTripSteps: "مراحل الرحلة",
    outbound: "الذهاب",
    inbound: "العودة",
    returnStep: "العودة",
    changeOutbound: "تغيير الذهاب",
    loadingResults: "جاري تحميل النتائج…",
    noMatching: "لا توجد رحلات مطابقة",
    listView: "عرض قائمة",
    gridView: "عرض شبكة",
    filtersSortButton: "عوامل التصفية والفرز",
    mobileFilters: "عوامل التصفية",
    done: "تم",
    startSearchTitle: "ابدأ بحث الرحلات",
    startSearchBody:
      "استخدم النموذج أعلاه لاختيار المسار والتواريخ والمسافرين.",
    noFlightsTitle: "لا توجد رحلات",
    noFlightsBody: "جرّب تعديل المرشحات",
    clearFilters: "مسح المرشحات",
    showingRange: "عرض {start}–{end} من {total} رحلات",
    paginationPage: "صفحة {page} من {total}",
    prevPage: "الصفحة السابقة",
    nextPage: "الصفحة التالية",
    importantTitle: "معلومات مهمة",
    importantSubtitle: "ما يجب معرفته قبل تأكيد رحلتك.",
    baggageTitle: "الأمتعة",
    baggageBody:
      "تختلف الحصص بحسب شركة الطيران والسعر — راجع العرض والشروط.",
    requirementsTitle: "متطلبات السفر",
    requirementsBody:
      "تحقق من التأشيرات والدخول والمتطلبات الصحية لوجهتك.",
    flexibleTitle: "حجز مرن",
    flexibleBody:
      "الاستبدال والاسترداد وفق شروط السعر — اقرأ قبل الدفع.",
    paginationNav: "ترقيم صفحات نتائج الرحلات",
  };
  d.Hotels.tab = {
    ...d.Hotels.tab,
    alertSelectDestination: "يرجى اختيار الوجهة.",
    alertSelectDates: "يرجى اختيار تواريخ الوصول والمغادرة.",
    alertDestinationUnavailable:
      "هذه الوجهة غير متاحة بعد للبحث المباشر عن الفنادق.",
    searchFailed: "فشل البحث. أعد المحاولة أو تحقق من الإعدادات.",
    destinationLabel: "الوجهة",
    destinationPlaceholder: "اكتب للتصفية",
    popularSection: "وجهات شائعة",
    popularHint:
      "وجهات شائعة — اكتب حرفين على الأقل للبحث عبر Duffel",
    noMatching: "لا توجد أماكن مطابقة",
    roomsTravelers: "الغرف والمسافرون",
    nationality: "الجنسية",
    searchHotels: "بحث عن فنادق",
    selectDestination: "اختر وجهة",
    selectDate: "اختر تاريخًا",
    checkIn: "الوصول",
    checkOut: "المغادرة",
    checkInDateLabel: "تاريخ الوصول",
    checkOutDateLabel: "تاريخ المغادرة",
    destinationsAria: "وجهات الفنادق",
    roomsGuestsLabel: "الغرف والمسافرون",
    roomsCounterLabel: "الغرف",
    roomSingular: "غرفة",
    roomsPlural: "غرف",
    travelerSingular: "مسافر",
    travelersPlural: "مسافرون",
    adults: "بالغون",
    children: "أطفال",
  };
  d.Hotels.results = {
    ...d.Hotels.results,
    sortLabel: "ترتيب حسب:",
    sortPlaceholder: "ترتيب حسب",
    loadingResults: "جاري تحميل النتائج…",
    noMatching: "لا توجد منشآت مطابقة",
    showingRange: "عرض {start}–{end} من {total}",
    propertySingular: "منشأة",
    propertyPlural: "منشآت",
    totalInParens: " ({total} إجمالًا)",
    filtersSortButton: "عوامل التصفية والفرز",
    filtersTitle: "عوامل التصفية",
    done: "تم",
    showFiltersButton: "عرض المرشحات",
    applyFilters: "تطبيق المرشحات",
    sortOpenMenuAria: "ترتيب حسب، فتح القائمة",
    sortByFallback: "ترتيب حسب",
    clearAllFilters: "مسح الكل",
    sort: {
      best: "الأفضل",
      price_low: "السعر (تصاعدي)",
      price_high: "السعر (تنازلي)",
      rating: "تقييم الضيوف",
      stars: "النجوم",
      distance: "المسافة",
    },
  };
  d.Cars.tab = {
    ...d.Cars.tab,
    fromAirportLabel: "من المطار",
    searchPlaceholder: "ابحث عن مكان…",
    selectLocation: "اختر مكانًا",
    dateLabel: "التاريخ",
    selectDate: "اختر تاريخًا",
    travelersLabel: "المسافرون",
    adults: "بالغون",
    children: "أطفال",
    travelerSingular: "مسافر",
    travelerPlural: "مسافرون",
    searchCarsAria: "بحث عن سيارات",
  };
  d.Auth = {
    ...d.Auth,
    loginTitle: "مرحبًا بعودتك",
    loginSubtitle: "سجّل الدخول بالبريد الإلكتروني",
    signupTitle: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    orContinueWith: "أو تابع مع",
    terms: "شروط الخدمة",
    privacy: "سياسة الخصوصية",
    oauthRedirecting: "إعادة توجيه…",
    signInFailed:
      "فشل تسجيل الدخول. أعد المحاولة أو استخدم البريد وكلمة المرور.",
    passwordUpdated:
      "تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.",
  };

  // Home: hotels
  d.Home.hotels = [
    {
      name: "منتجع وسبا شاطئ فاخر",
      location: "بالي، إندونيسيا",
      price: 299,
      rating: 4.8,
      reviews: "1.2 ألف",
      facilities: ["واي فاي", "مسبح", "سبا", "صالة رياضية"],
    },
    {
      name: "فندق غراند بالاس",
      location: "باريس، فرنسا",
      price: 320,
      rating: 4.9,
      reviews: "892",
      facilities: ["واي فاي", "مطعم", "بار", "سبا"],
    },
    {
      name: "منتجع إطلالة محيطية",
      location: "المالديف",
      price: 450,
      rating: 4.7,
      reviews: "1.5 ألف",
      facilities: ["شاطئ", "مسبح", "سبا", "غطس"],
    },
    {
      name: "ملاذ جبلي قمة",
      location: "جبال الألب السويسرية",
      price: 280,
      rating: 4.6,
      reviews: "734",
      facilities: ["تزلج", "سبا", "مدفأة", "واي فاي"],
    },
    {
      name: "أجنحة حضرية فاخرة",
      location: "نيويورك، الولايات المتحدة",
      price: 380,
      rating: 4.8,
      reviews: "2.1 ألف",
      facilities: ["واي فاي", "صالة رياضية", "بار", "مؤتمرات"],
    },
    {
      name: "منتجع واحة صحراوية",
      location: "دبي، الإمارات",
      price: 420,
      rating: 4.9,
      reviews: "1.8 ألف",
      facilities: ["مسبح", "سبا", "غولف", "شاطئ"],
    },
  ];
  d.Home.categories = [
    { key: "beach", name: "شاطئ" },
    { key: "desert", name: "صحراء" },
    { key: "mountain", name: "جبل" },
    { key: "temple", name: "معبد" },
    { key: "tower", name: "برج" },
    { key: "pyramid", name: "هرم" },
    { key: "city", name: "مدينة" },
    { key: "forest", name: "غابة" },
    { key: "waterfall", name: "شلال" },
    { key: "lake", name: "بحيرة" },
    { key: "island", name: "جزيرة" },
    { key: "canyon", name: "وادي ضيق" },
  ];
  d.Home.featuredCar = {
    title: "نقل فاخر بالسيارة",
    description: "راحة وفخامة مع سائقين محترفين",
    buttonText: "عرض كل السيارات",
  };
  d.Home.cars = [
    {
      name: "Toyota Camry",
      type: "سيدان",
      passengers: 4,
      luggage: 2,
      price: 45,
      originalPrice: 60,
      features: ["تكييف", "واي فاي", "GPS"],
    },
    {
      name: "Honda Accord",
      type: "سيدان",
      passengers: 4,
      luggage: 3,
      price: 48,
      originalPrice: 65,
      features: ["تكييف", "USB", "جلد"],
    },
    {
      name: "Toyota RAV4",
      type: "دفع رباعي",
      passengers: 5,
      luggage: 4,
      price: 65,
      originalPrice: 85,
      features: ["تكييف", "4x4", "قضبان سقف"],
    },
    {
      name: "Ford Explorer",
      type: "دفع رباعي",
      passengers: 7,
      luggage: 5,
      price: 75,
      originalPrice: 95,
      features: ["تكييف", "7 مقاعد", "صوت فاخر"],
    },
    {
      name: "Mercedes الفئة E",
      type: "فاخر",
      passengers: 4,
      luggage: 3,
      price: 120,
      originalPrice: 150,
      features: ["جلد", "سقف بانوراما", "مقاعد تدليك"],
    },
    {
      name: "BMW الفئة 5",
      type: "فاخر",
      passengers: 4,
      luggage: 2,
      price: 125,
      originalPrice: 160,
      features: ["بريميوم", "مقاعد مدفأة", "ترفيه"],
    },
    {
      name: "Toyota Sienna",
      type: "فان",
      passengers: 8,
      luggage: 6,
      price: 85,
      originalPrice: 110,
      features: ["تكييف", "8 مقاعد", "أبواب منزلقة"],
    },
    {
      name: "Mercedes الفئة V",
      type: "فان",
      passengers: 8,
      luggage: 7,
      price: 110,
      originalPrice: 140,
      features: ["فاخر", "TV", "ثلاجة"],
    },
  ];

  patchLegalLocale(d, "ar");
  patchBreadcrumbLocale(d, "ar");
}
