import { patchLegalLocale } from "./legal/patch-legal.mjs";
import { patchBreadcrumbLocale } from "./breadcrumb/patch-breadcrumb.mjs";

export default function patchUR(d) {
  d.Nav = {
    ...d.Nav,
    home: "ہوم",
    about: "ہمارے بارے میں",
    flights: "پروازیں",
    cars: "کاریں",
    hotels: "ہوٹلز",
    contact: "رابطہ",
    theme: "تھیم",
    currency: "کرنسی",
    language: "زبان",
    account: "اکاؤنٹ",
    profile: "پروفائل",
    bookings: "بکنگز",
    adminConsole: "ایڈمن کنسول",
    logout: "لاگ آؤٹ",
    login: "لاگ ان",
    signup: "سائن اپ",
    navigationSection: "نیویگیشن",
    languageCurrencyHeading: "زبان اور کرنسی",
    toggleMenu: "مینو کھولیں",
    themeSettingsAria: "تھیم کی ترتیبات",
    lightModeAria: "لائٹ موڈ",
    darkModeAria: "ڈارک موڈ",
    adminPanel: "ایڈمن پینل",
  };
  d.Footer = {
    ...d.Footer,
    rights: "تمام حقوق محفوظ ہیں۔",
    stayTitle: "اپ ڈیٹ رہیں",
    staySubtitle:
      "خصوصی ڈیلز، ٹریول ٹپس اور رہنمائی آپ کی ای میل پر۔",
    subscribedTitle: "سب ٹھیک!",
    subscribedSubtitle: "خوش آمدیدی ای میل کے لیے ان باکس چیک کریں۔",
    emailPlaceholder: "اپنی ای میل",
    subscribe: "سبسکرائب",
    subscribing: "سبسکرائب ہو رہا ہے…",
    noSpam: "اسپام نہیں۔ کسی بھی وقت ان سبسکرائب۔",
    tagline:
      "بھول نہ جانے والے سفر کے لیے آپ کا بھروسے مند شراکت دار۔ دنیا بھر میں خصوصی ڈیلز کے ساتھ پروازیں، ہوٹل، کاریں اور ٹورز بک کریں۔",
    quickLinksTitle: "فوری لنکس",
    servicesTitle: "خدمات",
    contactTitle: "رابطہ",
    copyright: "TravelTourUp. تمام حقوق محفوظ ہیں۔",
    weAccept: "ہم قبول کرتے ہیں",
    privacy: "پرائیویسی پالیسی",
    terms: "سروس کی شرائط",
    quick_home: "ہوم",
    quick_about: "ہمارے بارے میں",
    quick_blog: "بلاگ",
    quick_contact: "ہم سے رابطہ",
    svc_hotels: "ہوٹل بکنگ",
    svc_flights: "پرواز کے ٹکٹ",
    svc_cars: "کار کرایہ",
    svc_tours: "ٹور پیکجز",
    svc_faqs: "اکثر پوچھے گئے سوالات",
    newsletterEmailInvalid: "درست ای میل درج کریں۔",
    newsletterEmailRequired: "اپنی ای میل درج کریں۔",
    newsletterEmailAria: "نیوز لیٹر کے لیے ای میل",
    brandAlt: "TravelTourUp",
  };
  d.Common = {
    clearAll: "سب صاف کریں",
    filters: "فلٹرز",
    applyFilters: "فلٹر لگائیں",
    previous: "پچھلا",
    next: "اگلا",
    close: "بند کریں",
    loading: "لوڈ ہو رہا ہے…",
  };
  d.Hero = {
    ...d.Hero,
    headlinePrefix: "دنیا دریافت کریں اور",
    tagline:
      "آپ کا اگلا سفر ایک کلک دور ہے — ناقابل فراموش تجربے، بہترین ڈیلز۔",
    rotate0: "دریافت",
    rotate1: "مہم جوئی",
    rotate2: "تلاش",
    rotate3: "سفر",
    rotate4: "گھومنا",
    rotate5: "جینا",
    rotate6: "خواب",
    rotate7: "فرار",
    rotate8: "جشن",
    rotate9: "آرام",
    rotate10: "لطف",
    tabFlights: "پروازیں",
    tabCars: "کاریں",
    tabHotels: "ہوٹلز",
    tabMore: "مزید",
  };
  d.Featured = {
    ...d.Featured,
    flightsHeading: "نمایاں پروازیں",
    flightsSubtitle:
      "تحریک — ہمارے پارٹنر سے مختصر کیش شدہ قیمتیں",
    flightsHeroTitle: "نمایاں پروازیں",
    flightsHeroDescription:
      "مقبول مقامات کی پیشکشیں — براہ راست تلاش سے قیمتیں (اکثر ریفریش کریں).",
    flightsCta: "تمام پروازیں دیکھیں",
    hotelsHeading: "نمایاں ہوٹلز",
    hotelsSubtitle: "بہترین جگہیں معقول قیمتوں پر",
    hotelsEmptyTitle: "نمایاں ہوٹلز",
    hotelsEmptySubtitle: "فی الوقت کوئی ہوٹل دستیاب نہیں۔",
    hotelsLoadingAria: "نمایاں ہوٹلز لوڈ ہو رہے ہیں",
    hotelsDiscoverTitle: "زبردست ڈیلز اٹھائیں",
    hotelsDiscoverSubtitle: "دنیا بھر کے ہوٹلز پر",
    hotelsViewMore: "مزید دیکھیں",
    hotelsAdAlt: "دنیا بھر میں ہوٹل ڈیلز",
    hotelsFallbackBanner: "ہوٹل ڈیلز",
  };
  d.Categories = {
    ...d.Categories,
    title: "اقسام",
    subtitle: "اپنے اگلے سفر کے لیے انوکھی جگہیں دریافت کریں",
    prevAria: "پچھلے زمرے",
    nextAria: "اگلے زمرے",
    goToSlide: "سلائیڈ {n} پر جائیں",
  };
  d.RecommendedCars = {
    ...d.RecommendedCars,
    sectionTitle: "تجویز کردہ ٹرانسفر کاریں",
    sectionSubtitle: "آپ کی تمام گزرگاہوں کے لیے آرام دہ اور قابل بھروسہ نقل و حمل",
    featuredFallbackTitle: "پریمیم کار ٹرانسفر",
    featuredFallbackDesc: "پروفیشنل ڈرائیورز کے ساتھ آرام اور عیش",
    exploreAll: "تمام کاریں دیکھیں",
    placeholderBanner: "کار کرایہ",
    bannerAlt: "پریمیم ٹرانسفر — سفر میں آرام اور عیش",
  };
  d.Stats = {
    ...d.Stats,
    hotelsTitle: "دنیا بھر میں ہوٹلز",
    hotelsDesc: "بہترین قیمتوں پر عیش و آرام کی رہائش",
    destinationsTitle: "منزلیں",
    destinationsDesc: "انوکھی جگہیں دریافت کریں",
    satisfactionTitle: "کسٹمر کی مطمئنی",
    satisfactionDesc: "مطمئن مسافر اور مثبت جائزے",
  };
  d.FAQ.title = "اکثر پوچھے گئے سوالات";
  d.FAQ.subtitle =
    "ہماری خدمات، بکنگ اور پالیسیوں سے متعلق عام سوالات کے جواب";
  d.FAQ.items = [
    {
      question: "میں پرواز کی بکنگ کیسے تبدیل یا منسوخ کروں؟",
      answer:
        "اپنے اکاؤنٹ میں سائن ان کریں اور بکنگز کھولیں۔ تبدیلی یا منسوخی ایئر لائن کی شرائط اور فیس پر منحصر ہے۔",
    },
    {
      question: "بین الاقوامی سفر کے لیے کون سے دستاویزات چاہیں؟",
      answer:
        "عام طور پر درست پاسپورٹ، ضرورت پر ویزا، اور ملک کی طبی ضروریات۔ روانگی سے پہلے داخلہ کی شرائط چیک کریں۔",
    },
    {
      question: "مجھے کیسے پتہ چلے کہ ٹکٹ واپسی ہے؟",
      answer:
        "یہ فیئر کی شرائط پر منحصر ہے۔ بکنگ کنفرمیشن دیکھیں یا سپورٹ سے رابطہ کریں۔",
    },
    {
      question: "کیا میں بکنگ کے وقت سیٹ منتخب کر سکتا ہوں؟",
      answer:
        "اکثر بکنگ کے دوران؛ ورنہ عام طور پر آن لائن چیک ان پر۔",
    },
    {
      question: "پرواز میں تاخیر یا منسوخی پر کیا کریں؟",
      answer:
        "ایئر لائن اکثر ای میل یا ایس ایم ایس سے بتاتی ہے۔ ہمارے سائٹ یا ایپ پر بھی اسٹیٹس چیک کریں۔ نئے ٹکٹ کے لیے سپورٹ سے رابطہ کریں۔",
    },
    {
      question: "مجموعہ کے لیے بکنگ کیسے کروں؟",
      answer:
        "بکنگ کے وقت مسافروں کی تعداد بتائیں۔ 10 سے زیادہ افراد کے لیے گروپ ٹیم سے رابطہ کریں۔",
    },
    {
      question: "کیا پروازوں پر چھپی فیس ہوتی ہے؟",
      answer:
        "ہم ٹیکس اور لازمی چارجز حتمی قیمت میں دکھاتے ہیں۔ اختیارات (سامان، سیٹ وغیرہ) الگ ہو سکتے ہیں۔",
    },
    {
      question: "سامان کی حد کیسے معلوم ہو؟",
      answer:
        "یہ ایئر لائن اور فیئر پر منحصر ہے۔ کنفرمیشن یا ایئر لائن کی ویب سائٹ دیکھیں۔",
    },
    {
      question: "کیا آپ کی سائٹ پر آن لائن بکنگ محفوظ ہے؟",
      answer:
        "جی ہاں، ڈیٹا اور ادائیگیوں کے لیے محفوظ انکرپشن استعمال ہوتی ہے۔",
    },
    {
      question: "کیا میں اپنے اکاؤنٹ سے کسی اور کے لیے بک کر سکتا ہوں؟",
      answer:
        "جی ہاں۔ بکنگ کے وقت مسافر کی تفصیلات درج کریں۔",
    },
  ];
  d.Reviews.prevAria = "پچھلا جائزہ";
  d.Reviews.nextAria = "اگلا جائزہ";
  d.Reviews.goToSlide = "سلائیڈ {n} پر جائیں";
  d.Reviews.items = [
    {
      name: "Maria Smantha",
      role: "ویب ڈویلپر",
      text: "TravelTourUp نے بکنگ بہت آسان بنا دی۔ چند منٹوں میں بہترین ہوٹل مل گیا اور سب کچھ آسانی سے ہوا۔ قیمتیں دوسروں سے بہتر تھیں۔",
      image: d.Reviews.items[0].image,
    },
    {
      name: "Lisa Cudrow",
      role: "گرافک ڈیزائنر",
      text: "پلیٹ فارم واضح اور خوشگوار ہے۔ ہوٹل اور پروازیں بغیر الجھن کے موازنہ کیں۔ اچھی ڈیلز اور فوری سپورٹ۔",
      image: d.Reviews.items[1].image,
    },
    {
      name: "John Smith",
      role: "مارکیٹنگ مینیجر",
      text: "زبردست تجربہ: سستی پروازیں اور آرام دہ ہوٹل۔ میں دوبارہ TravelTourUp استعمال کروں گا۔",
      image: d.Reviews.items[2].image,
    },
  ];
  d.MoreServices.message = "مزید خدمات جلد…";
  d.About = {
    ...d.About,
    historyTitle: "ہمارے ساتھ دنیا دریافت کریں",
    historySubtitle: "1998 سے",
    historyDescription:
      "ہمارا مقصد قابل اعتماد اور آرام دہ سفر کی خدمات ہیں۔ آج ہم آپ کی گزرگاہوں کے لیے اعلیٰ معیار کی گاڑیوں کا وسیع انتخاب پیش کرتے ہیں۔",
    feat1: "لگژری کاروں کا وسیع انتخاب",
    feat2: "عیش و آرام کے ہوٹل بہترین حالت میں",
    feat3: "بکنگ آسان اور سمجھنے میں آسان",
    feat4: "شاندار کسٹمر سپورٹ",
  };
  d.Flights.sort = {
    best: "بہترین میچ",
    price_asc: "سست ترین",
    price_desc: "مہنگا ترین",
    duration_asc: "سب سے مختصر مدت",
    duration_desc: "سب سے لمبی مدت",
    sortBy: "ترتیب",
  };
  d.Flights.stops = {
    any: "کوئی بھی اسٹاپ تعداد",
    direct: "صرف براہ راست",
    one: "زیادہ سے زیادہ 1 اسٹاپ",
    two: "زیادہ سے زیادہ 2 اسٹاپ",
    label: "اسٹاپس",
  };
  d.Flights.filters = {
    title: "فلٹرز",
    price: "قیمت",
    airlines: "ایئر لائنز",
    flightNumber: "پرواز نمبر",
    flightNumberPlaceholder: "مثال AF 123",
    flightTime: "پرواز کے اوقات",
    flightTimeHint:
      "پہلے سگمنٹ کا روانگی / آخری سگمنٹ کی آمد (مقامی وقت)",
  };
  d.Flights.results = {
    ...d.Flights.results,
    searchFailed: "پروازوں کی تلاش ناکام",
    roundTripTotal: "کل راؤنڈ ٹرپ",
    oneWayTotal: "کل ایک طرفہ",
    roundTripSteps: "سفر کے مراحل",
    outbound: "جانا",
    inbound: "واپسی",
    returnStep: "واپسی",
    changeOutbound: "جانے کا راستہ بدلیں",
    loadingResults: "نتائج لوڈ ہو رہے ہیں…",
    noMatching: "کوئی موزوں پرواز نہیں",
    listView: "لسٹ ویو",
    gridView: "گرڈ ویو",
    filtersSortButton: "فلٹر اور ترتیب",
    mobileFilters: "فلٹرز",
    done: "ہو گیا",
    startSearchTitle: "پروازیں تلاش کریں",
    startSearchBody:
      "اوپر فارم سے راستہ، تاریخیں اور مسافر منتخب کریں۔",
    noFlightsTitle: "کوئی پرواز نہیں ملی",
    noFlightsBody: "فلٹر ایڈجسٹ کرنے کی کوشش کریں",
    clearFilters: "فلٹر صاف کریں",
    showingRange: "{total} پروازوں میں سے {start}–{end} دکھایا جا رہا ہے",
    paginationPage: "صفحہ {page} از {total}",
    prevPage: "پچھلا صفحہ",
    nextPage: "اگلا صفحہ",
    importantTitle: "اہم معلومات",
    importantSubtitle: "پرواز کنفرم کرنے سے پہلے جانیں۔",
    baggageTitle: "سامان",
    baggageBody:
      "حدود ایئر لائن اور فیئر پر منحصر ہیں — پیشکش اور قواعد چیک کریں۔",
    requirementsTitle: "سفر کی ضروریات",
    requirementsBody:
      "اپنی منزل کے ویزا، داخلہ اور صحت کی ضروریات چیک کریں۔",
    flexibleTitle: "لچکدار بکنگ",
    flexibleBody:
      "تبدیلی اور ریفنڈ فیئر کی شرائط پر — ادائیگی سے پہلے پڑھیں۔",
    paginationNav: "پرواز نتائج کا صفحہ بندی",
  };
  d.Hotels.tab = {
    ...d.Hotels.tab,
    alertSelectDestination: "براہ کرم منزل منتخب کریں۔",
    alertSelectDates: "آمد اور روانگی کی تاریخیں منتخب کریں۔",
    alertDestinationUnavailable:
      "یہ منزل ابھی براہ راست ہوٹل تلاش کے لیے دستیاب نہیں۔",
    searchFailed: "تلاش ناکام۔ دوبارہ کوشش کریں یا ترتیب چیک کریں۔",
    destinationLabel: "منزل",
    destinationPlaceholder: "فلٹر کے لیے ٹائپ کریں",
    popularSection: "مقبول منزلیں",
    popularHint:
      "مقبول منزلیں — Duffel تلاش کے لیے کم از کم 2 حرف لکھیں",
    noMatching: "کوئی جگہ نہیں ملی",
    roomsTravelers: "کمرے اور مسافر",
    nationality: "قومیت",
    searchHotels: "ہوٹل تلاش کریں",
    selectDestination: "منزل چنیں",
    selectDate: "تاریخ چنیں",
    checkIn: "چیک ان",
    checkOut: "چیک آؤٹ",
    checkInDateLabel: "چیک ان تاریخ",
    checkOutDateLabel: "چیک آؤٹ تاریخ",
    destinationsAria: "ہوٹل منزلیں",
    roomsGuestsLabel: "کمرے اور مہمان",
    roomsCounterLabel: "کمرے",
    roomSingular: "کمرہ",
    roomsPlural: "کمرے",
    travelerSingular: "مسافر",
    travelersPlural: "مسافر",
    adults: "بالغ",
    children: "بچے",
  };
  d.Hotels.results = {
    ...d.Hotels.results,
    sortLabel: "ترتیب:",
    sortPlaceholder: "ترتیب",
    loadingResults: "نتائج لوڈ ہو رہے ہیں…",
    noMatching: "کوئی موزوں جگہ نہیں",
    showingRange: "{total} میں سے {start}–{end} دکھایا جا رہا ہے",
    propertySingular: "پراپرٹی",
    propertyPlural: "پراپرٹیز",
    totalInParens: " ({total} کل)",
    filtersSortButton: "فلٹر اور ترتیب",
    filtersTitle: "فلٹرز",
    done: "ہو گیا",
    showFiltersButton: "فلٹر دکھائیں",
    applyFilters: "فلٹر لگائیں",
    sortOpenMenuAria: "ترتیب، مینو کھولیں",
    sortByFallback: "ترتیب",
    clearAllFilters: "سب صاف کریں",
    sort: {
      best: "بہترین",
      price_low: "قیمت (کم سے زیادہ)",
      price_high: "قیمت (زیادہ سے کم)",
      rating: "گیسٹ ریٹنگ",
      stars: "ستارے",
      distance: "فاصلہ",
    },
  };
  d.Cars.tab = {
    ...d.Cars.tab,
    fromAirportLabel: "ایئرپورٹ سے",
    searchPlaceholder: "جگہ تلاش کریں…",
    selectLocation: "جگہ چنیں",
    dateLabel: "تاریخ",
    selectDate: "تاریخ چنیں",
    travelersLabel: "مسافر",
    adults: "بالغ",
    children: "بچے",
    travelerSingular: "مسافر",
    travelerPlural: "مسافر",
    searchCarsAria: "کاریں تلاش کریں",
  };
  d.Auth = {
    ...d.Auth,
    loginTitle: "دوبارہ خوش آمدید",
    loginSubtitle: "ای میل سے سائن ان کریں",
    signupTitle: "اکاؤنٹ بنائیں",
    email: "ای میل",
    password: "پاس ورڈ",
    rememberMe: "مجھے یاد رکھیں",
    forgotPassword: "پاس ورڈ بھول گئے؟",
    signIn: "سائن ان",
    signUp: "سائن اپ",
    noAccount: "اکاؤنٹ نہیں؟",
    hasAccount: "پہلے سے اکاؤنٹ ہے؟",
    orContinueWith: "یا جاری رکھیں",
    terms: "استعمال کی شرائط",
    privacy: "پرائیویسی پالیسی",
    oauthRedirecting: "ری ڈائریکٹ…",
    signInFailed:
      "سائن ان ناکام۔ دوبارہ کوشش کریں یا ای میل اور پاس ورڈ استعمال کریں۔",
    passwordUpdated:
      "پاس ورڈ اپ ڈیٹ ہو گیا۔ نئے پاس ورڈ سے سائن ان کریں۔",
  };

  // Home: hotels
  d.Home.hotels = [
    {
      name: "لگژری بیچ ریزورٹ اینڈ اسپا",
      location: "بالی، انڈونیشیا",
      price: 299,
      rating: 4.8,
      reviews: "1.2k",
      facilities: ["وائی فائی", "پول", "سپا", "جم"],
    },
    {
      name: "Grand Palace ہوٹل",
      location: "پیرس، فرانس",
      price: 320,
      rating: 4.9,
      reviews: "892",
      facilities: ["وائی فائی", "ریستوران", "بار", "سپا"],
    },
    {
      name: "اوشن ویو پارڈائز ریزورٹ",
      location: "مالدیپ",
      price: 450,
      rating: 4.7,
      reviews: "1.5k",
      facilities: ["ساحل", "پول", "سپا", "ڈائیونگ"],
    },
    {
      name: "ماؤنٹین ٹاپ ریٹریٹ",
      location: "سوئس آلپس",
      price: 280,
      rating: 4.6,
      reviews: "734",
      facilities: ["سکینگ", "سپا", "چمنی", "وائی فائی"],
    },
    {
      name: "شہری لگژری سویٹس",
      location: "نیویارک، USA",
      price: 380,
      rating: 4.8,
      reviews: "2.1k",
      facilities: ["وائی فائی", "جم", "بار", "سیمینار"],
    },
    {
      name: "صحرائی ایکوا ریزورٹ",
      location: "دبئی، UAE",
      price: 420,
      rating: 4.9,
      reviews: "1.8k",
      facilities: ["پول", "سپا", "گولف", "ساحل"],
    },
  ];
  d.Home.categories = [
    { key: "beach", name: "ساحل" },
    { key: "desert", name: "صحرا" },
    { key: "mountain", name: "پہاڑ" },
    { key: "temple", name: "مندر" },
    { key: "tower", name: "مینار" },
    { key: "pyramid", name: "اہرام" },
    { key: "city", name: "شہر" },
    { key: "forest", name: "جنگل" },
    { key: "waterfall", name: "آبشار" },
    { key: "lake", name: "جھیل" },
    { key: "island", name: "جزیرہ" },
    { key: "canyon", name: "کھائی" },
  ];
  d.Home.featuredCar = {
    title: "پریمیم کار ٹرانسفر",
    description: "پروفیشنل ڈرائیورز کے ساتھ آرام اور عیش",
    buttonText: "تمام کاریں دیکھیں",
  };
  d.Home.cars = [
    {
      name: "Toyota Camry",
      type: "سڈان",
      passengers: 4,
      luggage: 2,
      price: 45,
      originalPrice: 60,
      features: ["ایئر کن", "وائی فائی", "GPS"],
    },
    {
      name: "Honda Accord",
      type: "سڈان",
      passengers: 4,
      luggage: 3,
      price: 48,
      originalPrice: 65,
      features: ["ایئر کن", "USB", "چمڑا"],
    },
    {
      name: "Toyota RAV4",
      type: "SUV",
      passengers: 5,
      luggage: 4,
      price: 65,
      originalPrice: 85,
      features: ["ایئر کن", "4x4", "روف ریل"],
    },
    {
      name: "Ford Explorer",
      type: "SUV",
      passengers: 7,
      luggage: 5,
      price: 75,
      originalPrice: 95,
      features: ["ایئر کن", "7 سیٹیں", "پریمیم آڈیو"],
    },
    {
      name: "Mercedes E-Class",
      type: "لگژری",
      passengers: 4,
      luggage: 3,
      price: 120,
      originalPrice: 150,
      features: ["چمڑا", "پینورامک روف", "مساج سیٹیں"],
    },
    {
      name: "BMW 5 Series",
      type: "لگژری",
      passengers: 4,
      luggage: 2,
      price: 125,
      originalPrice: 160,
      features: ["پریمیم", "گرم سیٹیں", "انٹرٹینمنٹ"],
    },
    {
      name: "Toyota Sienna",
      type: "منی وین",
      passengers: 8,
      luggage: 6,
      price: 85,
      originalPrice: 110,
      features: ["ایئر کن", "8 سیٹیں", "سلائیڈنگ دروازے"],
    },
    {
      name: "Mercedes V-Class",
      type: "منی وین",
      passengers: 8,
      luggage: 7,
      price: 110,
      originalPrice: 140,
      features: ["لگژری", "TV", "فریج"],
    },
  ];

  patchLegalLocale(d, "ur");
  patchBreadcrumbLocale(d, "ur");
}
