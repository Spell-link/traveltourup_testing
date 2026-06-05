import { patchLegalLocale } from "./legal/patch-legal.mjs";
import { patchBreadcrumbLocale } from "./breadcrumb/patch-breadcrumb.mjs";

export default function patchFR(d) {
  d.Nav = {
    ...d.Nav,
    home: "Accueil",
    about: "À propos",
    flights: "Vols",
    cars: "Voitures",
    hotels: "Hôtels",
    contact: "Contact",
    theme: "Thème",
    currency: "Devise",
    language: "Langue",
    account: "Compte",
    profile: "Profil",
    bookings: "Réservations",
    adminConsole: "Console admin",
    logout: "Se déconnecter",
    login: "Connexion",
    signup: "Inscription",
    navigationSection: "Navigation",
    languageCurrencyHeading: "Langue et devise",
    toggleMenu: "Ouvrir le menu",
    themeSettingsAria: "Paramètres du thème",
    lightModeAria: "Mode clair",
    darkModeAria: "Mode sombre",
    adminPanel: "Panneau d’administration",
  };
  d.Footer = {
    ...d.Footer,
    rights: "Tous droits réservés.",
    stayTitle: "Restez informé",
    staySubtitle:
      "Recevez offres exclusives, conseils voyage et inspiration dans votre boîte mail.",
    subscribedTitle: "C’est tout bon !",
    subscribedSubtitle: "Consultez votre boîte de réception pour un e-mail de bienvenue.",
    emailPlaceholder: "Votre adresse e-mail",
    subscribe: "S’abonner",
    subscribing: "Abonnement…",
    noSpam: "Pas de spam. Désabonnement à tout moment.",
    tagline:
      "Votre partenaire de confiance pour des voyages inoubliables. Réservez vols, hôtels, voitures et circuits avec des offres exclusives dans le monde entier.",
    quickLinksTitle: "Liens rapides",
    servicesTitle: "Services",
    contactTitle: "Contact",
    copyright: "TravelTourUp. Tous droits réservés.",
    weAccept: "Nous acceptons",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
    quick_home: "Accueil",
    quick_about: "À propos",
    quick_blog: "Blog",
    quick_contact: "Nous contacter",
    svc_hotels: "Réservation d’hôtel",
    svc_flights: "Billets d’avion",
    svc_cars: "Location de voiture",
    svc_tours: "Circuits",
    svc_faqs: "FAQ",
    newsletterEmailInvalid: "Veuillez entrer une adresse e-mail valide.",
    newsletterEmailRequired: "Veuillez entrer votre adresse e-mail.",
    newsletterEmailAria: "E-mail pour la newsletter",
    brandAlt: "TravelTourUp",
  };
  d.Common = {
    clearAll: "Tout effacer",
    filters: "Filtres",
    applyFilters: "Appliquer les filtres",
    previous: "Précédent",
    next: "Suivant",
    close: "Fermer",
    loading: "Chargement…",
  };
  d.Hero = {
    ...d.Hero,
    headlinePrefix: "Découvrez le monde et",
    tagline:
      "Votre prochaine aventure est à un clic — expériences inoubliables, offres imbattables.",
    rotate0: "Découvrir",
    rotate1: "Aventure",
    rotate2: "Explorer",
    rotate3: "Voyager",
    rotate4: "Rôder",
    rotate5: "Vivre",
    rotate6: "Rêver",
    rotate7: "S’échapper",
    rotate8: "Célébrer",
    rotate9: "Se détendre",
    rotate10: "Profiter",
    tabFlights: "VOLS",
    tabCars: "VOITURES",
    tabHotels: "HÔTELS",
    tabMore: "PLUS",
  };
  d.Featured = {
    ...d.Featured,
    flightsHeading: "Vols en vedette",
    flightsSubtitle:
      "Inspirez-vous — tarifs mis en cache brièvement depuis notre partenaire",
    flightsHeroTitle: "Vols en vedette",
    flightsHeroDescription:
      "Offres vers des destinations populaires — prix issus de la recherche en direct (actualisez régulièrement).",
    flightsCta: "Voir tous les vols",
    hotelsHeading: "Hôtels en vedette",
    hotelsSubtitle: "Des lieux exceptionnels à prix avantageux",
    hotelsEmptyTitle: "Hôtels en vedette",
    hotelsEmptySubtitle: "Aucun hôtel disponible pour le moment.",
    hotelsLoadingAria: "Chargement des hôtels en vedette",
    hotelsDiscoverTitle: "Profitez de superbes offres",
    hotelsDiscoverSubtitle: "sur les hôtels du monde entier",
    hotelsViewMore: "Voir plus",
    hotelsAdAlt: "Superbes offres hôtels dans le monde entier",
    hotelsFallbackBanner: "Offres hôtels",
  };
  d.Categories = {
    ...d.Categories,
    title: "Catégories",
    subtitle: "Découvrez des lieux extraordinaires pour votre prochaine aventure",
    prevAria: "Catégories précédentes",
    nextAria: "Catégories suivantes",
    goToSlide: "Aller à la diapositive {n}",
  };
  d.RecommendedCars = {
    ...d.RecommendedCars,
    sectionTitle: "Voitures de transfert recommandées",
    sectionSubtitle: "Transport confortable et fiable pour tous vos déplacements",
    featuredFallbackTitle: "Transferts premium en voiture",
    featuredFallbackDesc: "Confort et luxe avec chauffeurs professionnels",
    exploreAll: "Voir toutes les voitures",
    placeholderBanner: "LOCATION DE VOITURES",
    bannerAlt: "Transferts premium — luxe et confort pour votre trajet",
  };
  d.Stats = {
    ...d.Stats,
    hotelsTitle: "Hôtels dans le monde",
    hotelsDesc: "Hébergements de luxe aux meilleurs prix",
    destinationsTitle: "Destinations",
    destinationsDesc: "Explorez des lieux exceptionnels",
    satisfactionTitle: "Satisfaction clients",
    satisfactionDesc: "Voyageurs satisfaits et avis positifs",
  };
  d.FAQ.title = "Foire aux questions";
  d.FAQ.subtitle =
    "Réponses aux questions fréquentes sur nos services, réservations et politiques";
  d.FAQ.items = [
    {
      question: "Comment modifier ou annuler ma réservation de vol ?",
      answer:
        "Connectez-vous à votre compte et ouvrez vos réservations. Les modifications ou annulations peuvent être soumises aux conditions et frais des compagnies.",
    },
    {
      question: "Quels documents pour un voyage international ?",
      answer:
        "En général : passeport valide, visa si nécessaire, et documents sanitaires exigés. Vérifiez les conditions d’entrée avant le départ.",
    },
    {
      question: "Comment savoir si mon billet est remboursable ?",
      answer:
        "Cela dépend des conditions tarifaires. Consultez votre confirmation de réservation ou contactez notre support.",
    },
    {
      question: "Puis-je choisir mon siège lors de la réservation ?",
      answer:
        "Oui, souvent pendant la réservation ; sinon en général lors de l’enregistrement en ligne.",
    },
    {
      question: "Que faire en cas de retard ou d’annulation de vol ?",
      answer:
        "La compagnie vous informe souvent par e-mail ou SMS. Vérifiez aussi le statut sur notre site ou application. Contactez le support pour un nouveau billet.",
    },
    {
      question: "Comment réserver pour un groupe ?",
      answer:
        "Indiquez le nombre de passagers lors de la réservation. Au-delà de 10 personnes, contactez notre équipe groupes pour tarifs et aide.",
    },
    {
      question: "Y a-t-il des frais cachés sur les vols ?",
      answer:
        "Nous affichons les taxes et frais obligatoires dans le prix final. Les options (bagages, siège…) peuvent être facturées en plus.",
    },
    {
      question: "Comment connaître mon franchise bagages ?",
      answer:
        "Elle varie selon la compagnie et le tarif. Voir votre confirmation ou le site de la compagnie.",
    },
    {
      question: "Réserver en ligne sur votre site est-il sûr ?",
      answer:
        "Oui, notre site utilise un chiffrement sécurisé pour vos données personnelles et paiements.",
    },
    {
      question: "Puis-je réserver pour quelqu’un d’autre avec mon compte ?",
      answer:
        "Oui. Saisissez les coordonnées du voyageur lors de la réservation.",
    },
  ];
  d.Reviews.prevAria = "Témoignage précédent";
  d.Reviews.nextAria = "Témoignage suivant";
  d.Reviews.goToSlide = "Aller à la diapositive {n}";
  d.Reviews.items = [
    {
      name: "Maria Smantha",
      role: "Développeuse web",
      text: "TravelTourUp a rendu ma réservation très simple. J’ai trouvé l’hôtel idéal en quelques minutes et tout s’est déroulé sans accroc. Les prix étaient meilleurs qu’ailleurs.",
      image: d.Reviews.items[0].image,
    },
    {
      name: "Lisa Cudrow",
      role: "Designer graphique",
      text: "Plateforme claire et agréable. J’ai pu comparer hôtels et vols sans confusion. Bonnes offres et support réactif.",
      image: d.Reviews.items[1].image,
    },
    {
      name: "John Smith",
      role: "Responsable marketing",
      text: "Une excellente expérience : vols abordables et hôtel confortable. Je réutiliserai TravelTourUp pour mes prochains voyages.",
      image: d.Reviews.items[2].image,
    },
  ];
  d.MoreServices.message = "Plus de services bientôt…";
  d.About = {
    ...d.About,
    historyTitle: "Explorez le monde avec nous",
    historySubtitle: "Depuis 1998",
    historyDescription:
      "Notre ambition : des services de voyage fiables et confortables. Aujourd’hui, nous proposons une large gamme de véhicules haut de gamme pour vos trajets.",
    feat1: "Large choix de voitures de luxe",
    feat2: "Hôtels luxueux et bien entretenus",
    feat3: "Réservation simple et intuitive",
    feat4: "Service client d’exception",
  };
  d.Flights.sort = {
    best: "Meilleure correspondance",
    price_asc: "Moins cher",
    price_desc: "Plus cher",
    duration_asc: "Durée la plus courte",
    duration_desc: "Durée la plus longue",
    sortBy: "Trier par",
  };
  d.Flights.stops = {
    any: "Nombre d’escales quelconque",
    direct: "Direct uniquement",
    one: "Au plus 1 escale",
    two: "Au plus 2 escales",
    label: "Escales",
  };
  d.Flights.filters = {
    title: "Filtres",
    price: "Prix",
    airlines: "Compagnies",
    flightNumber: "Numéro de vol",
    flightNumberPlaceholder: "ex. AF 123",
    flightTime: "Horaires du vol",
    flightTimeHint:
      "Départ du premier segment / arrivée du dernier segment (heures locales)",
  };
  d.Flights.results = {
    ...d.Flights.results,
    searchFailed: "Échec de la recherche de vols",
    roundTripTotal: "Total aller-retour",
    oneWayTotal: "Total aller simple",
    roundTripSteps: "Étapes du voyage",
    outbound: "Aller",
    inbound: "Retour",
    returnStep: "Retour",
    changeOutbound: "Changer l’aller",
    loadingResults: "Chargement des résultats…",
    noMatching: "Aucun vol correspondant",
    listView: "Vue liste",
    gridView: "Vue grille",
    filtersSortButton: "Filtres et tri",
    mobileFilters: "Filtres",
    done: "Terminé",
    startSearchTitle: "Lancer une recherche de vols",
    startSearchBody:
      "Utilisez le formulaire ci-dessus pour choisir trajet, dates et voyageurs.",
    noFlightsTitle: "Aucun vol trouvé",
    noFlightsBody: "Essayez d’ajuster vos filtres",
    clearFilters: "Effacer les filtres",
    showingRange: "Affichage {start}–{end} sur {total} vols",
    paginationPage: "Page {page} sur {total}",
    prevPage: "Page précédente",
    nextPage: "Page suivante",
    importantTitle: "Informations importantes",
    importantSubtitle: "À savoir avant de confirmer votre vol.",
    baggageTitle: "Bagages",
    baggageBody:
      "Les franchises varient selon la compagnie et le tarif — vérifiez l’offre et les règles.",
    requirementsTitle: "Formalités de voyage",
    requirementsBody:
      "Vérifiez visas, entrée et exigences sanitaires pour votre destination.",
    flexibleTitle: "Réservation flexible",
    flexibleBody:
      "Échanges et remboursements selon les conditions tarifaires — lisez avant de payer.",
    paginationNav: "Pagination des résultats de vols",
  };
  d.Hotels.tab = {
    ...d.Hotels.tab,
    alertSelectDestination: "Veuillez sélectionner une destination.",
    alertSelectDates: "Veuillez sélectionner les dates d’arrivée et de départ.",
    alertDestinationUnavailable:
      "Cette destination n’est pas encore disponible pour la recherche hôtelière en direct.",
    searchFailed: "Échec de la recherche. Réessayez ou vérifiez la configuration.",
    destinationLabel: "Destination",
    destinationPlaceholder: "Tapez pour filtrer",
    popularSection: "Destinations populaires",
    popularHint:
      "Destinations populaires — tapez au moins 2 lettres pour rechercher avec Duffel",
    noMatching: "Aucun lieu correspondant",
    roomsTravelers: "Chambres et voyageurs",
    nationality: "Nationalité",
    searchHotels: "Rechercher des hôtels",
    selectDestination: "Choisir une destination",
    selectDate: "Choisir une date",
    checkIn: "Arrivée",
    checkOut: "Départ",
    checkInDateLabel: "Date d’arrivée",
    checkOutDateLabel: "Date de départ",
    destinationsAria: "Destinations hôtelières",
    roomsGuestsLabel: "Chambres et voyageurs",
    roomsCounterLabel: "Chambres",
    roomSingular: "Chambre",
    roomsPlural: "Chambres",
    travelerSingular: "Voyageur",
    travelersPlural: "Voyageurs",
    adults: "Adultes",
    children: "Enfants",
  };
  d.Hotels.results = {
    ...d.Hotels.results,
    sortLabel: "Trier par :",
    sortPlaceholder: "Trier par",
    loadingResults: "Chargement des résultats…",
    noMatching: "Aucun établissement correspondant",
    showingRange: "Affichage {start}–{end} sur {total}",
    propertySingular: "établissement",
    propertyPlural: "établissements",
    totalInParens: " ({total} au total)",
    filtersSortButton: "Filtres et tri",
    filtersTitle: "Filtres",
    done: "Terminé",
    showFiltersButton: "Afficher les filtres",
    applyFilters: "Appliquer les filtres",
    sortOpenMenuAria: "Trier par, ouvrir le menu",
    sortByFallback: "Trier par",
    clearAllFilters: "Tout effacer",
    sort: {
      best: "Meilleur",
      price_low: "Prix (croissant)",
      price_high: "Prix (décroissant)",
      rating: "Note clients",
      stars: "Étoiles",
      distance: "Distance",
    },
  };
  d.Cars.tab = {
    ...d.Cars.tab,
    fromAirportLabel: "Depuis l’aéroport",
    searchPlaceholder: "Rechercher un lieu…",
    selectLocation: "Choisir un lieu",
    dateLabel: "Date",
    selectDate: "Choisir une date",
    travelersLabel: "Voyageurs",
    adults: "Adultes",
    children: "Enfants",
    travelerSingular: "voyageur",
    travelerPlural: "voyageurs",
    searchCarsAria: "Rechercher des voitures",
  };
  d.Auth = {
    ...d.Auth,
    loginTitle: "Bon retour",
    loginSubtitle: "Connectez-vous avec votre e-mail",
    signupTitle: "Créer un compte",
    email: "E-mail",
    password: "Mot de passe",
    rememberMe: "Se souvenir de moi",
    forgotPassword: "Mot de passe oublié ?",
    signIn: "Se connecter",
    signUp: "S’inscrire",
    noAccount: "Pas encore de compte ?",
    hasAccount: "Vous avez déjà un compte ?",
    orContinueWith: "Ou continuer avec",
    terms: "Conditions d’utilisation",
    privacy: "Politique de confidentialité",
    oauthRedirecting: "Redirection…",
    signInFailed:
      "Échec de la connexion. Réessayez ou utilisez e-mail et mot de passe.",
    passwordUpdated:
      "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.",
  };

  // Home: hotels
  d.Home.hotels = [
    {
      name: "Resort & Spa plage de luxe",
      location: "Bali, Indonésie",
      price: 299,
      rating: 4.8,
      reviews: "1,2 k",
      facilities: ["WiFi", "Piscine", "Spa", "Salle de sport"],
    },
    {
      name: "Hôtel Grand Palace",
      location: "Paris, France",
      price: 320,
      rating: 4.9,
      reviews: "892",
      facilities: ["WiFi", "Restaurant", "Bar", "Spa"],
    },
    {
      name: "Resort paradisiaque vue océan",
      location: "Maldives",
      price: 450,
      rating: 4.7,
      reviews: "1,5 k",
      facilities: ["Plage", "Piscine", "Spa", "Plongée"],
    },
    {
      name: "Retraite Sommet des montagnes",
      location: "Alpes suisses",
      price: 280,
      rating: 4.6,
      reviews: "734",
      facilities: ["Ski", "Spa", "Cheminée", "WiFi"],
    },
    {
      name: "Suites urbaines luxe",
      location: "New York, États-Unis",
      price: 380,
      rating: 4.8,
      reviews: "2,1 k",
      facilities: ["WiFi", "Salle de sport", "Bar", "Conférences"],
    },
    {
      name: "Resort oasis du désert",
      location: "Dubaï, EAU",
      price: 420,
      rating: 4.9,
      reviews: "1,8 k",
      facilities: ["Piscine", "Spa", "Golf", "Plage"],
    },
  ];
  d.Home.categories = [
    { key: "beach", name: "Plage" },
    { key: "desert", name: "Désert" },
    { key: "mountain", name: "Montagne" },
    { key: "temple", name: "Temple" },
    { key: "tower", name: "Tour" },
    { key: "pyramid", name: "Pyramide" },
    { key: "city", name: "Ville" },
    { key: "forest", name: "Forêt" },
    { key: "waterfall", name: "Cascade" },
    { key: "lake", name: "Lac" },
    { key: "island", name: "Île" },
    { key: "canyon", name: "Canyon" },
  ];
  d.Home.featuredCar = {
    title: "Transferts premium en voiture",
    description: "Luxe et confort avec chauffeurs professionnels",
    buttonText: "Voir toutes les voitures",
  };
  d.Home.cars = [
    {
      name: "Toyota Camry",
      type: "Berline",
      passengers: 4,
      luggage: 2,
      price: 45,
      originalPrice: 60,
      features: ["Climatisation", "WiFi", "GPS"],
    },
    {
      name: "Honda Accord",
      type: "Berline",
      passengers: 4,
      luggage: 3,
      price: 48,
      originalPrice: 65,
      features: ["Climatisation", "USB", "Cuir"],
    },
    {
      name: "Toyota RAV4",
      type: "SUV",
      passengers: 5,
      luggage: 4,
      price: 65,
      originalPrice: 85,
      features: ["Climatisation", "4x4", "Barres de toit"],
    },
    {
      name: "Ford Explorer",
      type: "SUV",
      passengers: 7,
      luggage: 5,
      price: 75,
      originalPrice: 95,
      features: ["Climatisation", "7 places", "Son premium"],
    },
    {
      name: "Mercedes Classe E",
      type: "Luxe",
      passengers: 4,
      luggage: 3,
      price: 120,
      originalPrice: 150,
      features: ["Cuir", "Toit panoramique", "Sièges massants"],
    },
    {
      name: "BMW Série 5",
      type: "Luxe",
      passengers: 4,
      luggage: 2,
      price: 125,
      originalPrice: 160,
      features: ["Premium", "Sièges chauffants", "Divertissement"],
    },
    {
      name: "Toyota Sienna",
      type: "Monospace",
      passengers: 8,
      luggage: 6,
      price: 85,
      originalPrice: 110,
      features: ["Climatisation", "8 places", "Portes coulissantes"],
    },
    {
      name: "Mercedes Classe V",
      type: "Monospace",
      passengers: 8,
      luggage: 7,
      price: 110,
      originalPrice: 140,
      features: ["Luxe", "TV", "Réfrigérateur"],
    },
  ];

  patchLegalLocale(d, "fr");
  patchBreadcrumbLocale(d, "fr");
}
