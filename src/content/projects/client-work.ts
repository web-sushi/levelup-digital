export type ClientImage = {
  src: string;
  alt: string;
  caption: string;
};

export type ClientSection = {
  id: string;
  index: string;
  title: string;
  paragraphs: string[];
  images: ClientImage[];
};

export type ClientTechnology = {
  name: string;
  detail: string;
};

export type ClientProject = {
  slug: "enjoy-travel-and-tours" | "mark-maeda-travel-and-tour";
  number: string;
  title: string;
  category: string;
  status: "In development" | "Launched";
  summary: string;
  highlights: string[];
  introduction: string;
  hero: ClientImage;
  overview: string[];
  sections: ClientSection[];
  technology: ClientTechnology[];
  statusNote?: string[];
  liveUrl?: string;
  seoDescription: string;
};

export const CLIENT_IMAGE_WIDTH = 1600;
export const CLIENT_IMAGE_HEIGHT = 742;

function shot(file: string, alt: string, caption: string): ClientImage {
  return {
    src: `/images/portfolio/optimized/${file}`,
    alt,
    caption,
  };
}

export const clientProjects: ClientProject[] = [
  {
    slug: "enjoy-travel-and-tours",
    number: "01",
    title: "Enjoy Travel & Tours",
    category: "Travel Platform / Booking & Operations System",
    status: "Launched",
    summary:
      "A custom travel platform combining tour discovery, transfers, experiences, custom trip planning, booking workflows, enquiries, quotations, eSIM services, and administrative operations.",
    highlights: [
      "Tour discovery",
      "Regional tour filters",
      "Custom tour builder",
      "Booking workflows",
      "Enquiries and quotations",
      "Operations dashboard",
    ],
    introduction:
      "Enjoy Travel & Tours is a launched Japan travel website. The public site covers tours, experiences, transfers, vehicles, eSIM plans, and a custom tour builder. An operations console supports bookings, enquiries, quotations, and fulfillment, while some backend areas are still in development.",
    hero: shot(
      "enjoy-travel/enjoy-travel-homepage.webp",
      "Enjoy Travel and Tours homepage with the headline Japan, your way, and entry points for tours, experiences, transfers, vehicles, eSIM, and a custom tour builder.",
      "Homepage",
    ),
    overview: [
      "The goal is one travel platform for customer-facing services and the internal work of running them. Visitors can explore Japan tours, start a custom trip, and move into a booking flow. Staff use a separate operations console to review activity, prepare quotations, and fulfill eSIM orders.",
      "The public website is live. Some regions and analytics views are still marked as upcoming inside the interface. The screens below show captured areas of the product. They are not a claim that every planned feature is complete.",
    ],
    sections: [
      {
        id: "customer-facing",
        index: "01",
        title: "Customer-facing features",
        paragraphs: [
          "The public interface opens with a homepage and an autumn campaign for Tokyo City Tour. Tour packages are presented as full-day trips with a vehicle and driver, and the catalog can be filtered by region. Hokkaido, Kanto, Chubu, Kansai, Chugoku, and Kyushu and Okinawa have counts. Tohoku and Shikoku are marked soon.",
          "A custom Japan tour builder asks travelers to choose regions on a map, then continues through trip length, destinations, itinerary, travelers, contact, and review. A vehicle guide matches group size to Alphard, Hi-Ace, Coaster, and bus classes. The tour booking flow starts with travel date and guest count before vehicle selection.",
          "Experiences, transfers, and eSIM are present as services in the public navigation and on the homepage. This screenshot set does not include a separate experiences catalog or a public eSIM storefront.",
        ],
        images: [
          shot(
            "enjoy-travel/enjoy-travel-seasonal-campaign.webp",
            "Autumn in Japan campaign panel featuring Tokyo City Tour, priced from 50,000 yen.",
            "Seasonal campaign",
          ),
          shot(
            "enjoy-travel/enjoy-travel-featured-tours.webp",
            "Tour packages across Japan, with Tokyo, Sapporo, and Kyoto day tours.",
            "Featured tour packages",
          ),
          shot(
            "enjoy-travel/enjoy-travel-tour-catalog.webp",
            "Tour catalog filtered by region, showing 31 tours including Tokyo, Hakone, and Nikko.",
            "Tour catalog and regional filters",
          ),
          shot(
            "enjoy-travel/enjoy-travel-custom-tour-builder.webp",
            "Custom Japan tour builder on the regions step, with a map of Japan and later steps for trip length, destinations, itinerary, travelers, contact, and review.",
            "Custom Japan tour builder",
          ),
          shot(
            "enjoy-travel/enjoy-travel-vehicle-selection.webp",
            "Vehicle guide matching Alphard, Hi-Ace, Coaster, and bus classes to passenger counts.",
            "Vehicle information",
          ),
          shot(
            "enjoy-travel/enjoy-travel-tour-booking.webp",
            "Book this tour flow for Tokyo City Tour, vehicle and driver only, asking for travel date and number of guests.",
            "Tour booking flow",
          ),
        ],
      },
      {
        id: "operations",
        index: "02",
        title: "Operations platform",
        paragraphs: [
          "The operations console has a dashboard for confirmed booking activity across guided tours, transfers, and experiences. Charts for revenue, booking volume, top products, service mix, affiliates, and partners are labeled coming soon.",
          "The quotation workflow can create a draft and keep a sent offer read-only, so a later revision does not change the customer's original request. eSIM fulfillment records a QR code or an activation link. The screen notes that customer email delivery is not sent automatically yet.",
          "Booking management and enquiry management are in the operations navigation. Those screens are not published here. The captures include customer names, email addresses, and booking references.",
        ],
        images: [
          shot(
            "enjoy-travel/enjoy-travel-admin-dashboard.webp",
            "Enjoy Travel operations dashboard with booking counts and analytics cards marked coming soon.",
            "Dashboard",
          ),
          shot(
            "enjoy-travel/enjoy-travel-quotation-system.webp",
            "Quotation editor with a create-draft action and a read-only sent quotation for 1,200 yen.",
            "Quotation workflow",
          ),
          shot(
            "enjoy-travel/enjoy-travel-esim-fulfillment.webp",
            "eSIM fulfillment form awaiting fulfillment, with QR code or activation link and an instruction to install after arriving in Japan.",
            "eSIM fulfillment",
          ),
        ],
      },
    ],
    technology: [
      { name: "Next.js", detail: "Application framework" },
      { name: "React", detail: "Interface" },
      { name: "TypeScript", detail: "Typed application code" },
      { name: "Tailwind CSS", detail: "Interface styling" },
      { name: "Supabase", detail: "Backend services" },
      { name: "PostgreSQL", detail: "Database" },
      { name: "Stripe", detail: "Payment integration" },
    ],
    statusNote: [
      "The public website is launched. Additional backend work is still in progress, and several areas inside the operations console are explicitly marked as not ready.",
      "Tohoku and Shikoku are marked soon in the tour filters. The dashboard analytics views are marked coming soon. eSIM fulfillment can store activation details, and automatic customer email delivery is not in place yet.",
    ],
    liveUrl: "https://www.enjoytravelandtoursjapan.com/",
    seoDescription:
      "Case study of Enjoy Travel and Tours, a launched travel website for tour discovery, custom trip planning, bookings, quotations, and operations. Some backend features are still in development.",
  },
  {
    slug: "mark-maeda-travel-and-tour",
    number: "02",
    title: "Mark Maeda Travel & Tour",
    category: "Travel Booking Platform / Custom Web Application",
    status: "Launched",
    summary:
      "A custom booking platform for private tours and airport transfers, featuring vehicle selection, flexible payment options, online checkout, and administrative management tools.",
    highlights: [
      "Private tour discovery",
      "Transfer services",
      "Vehicle selection",
      "Shopping cart",
      "Flexible deposit payments",
      "Stripe checkout",
      "Admin management",
    ],
    introduction:
      "Mark Maeda Travel & Tour is a launched booking platform for private tours and airport transfers. Travelers browse tours, choose places and a vehicle, and check out online. Staff manage the catalog from an admin area.",
    hero: shot(
      "mark-maeda/mark-maeda-homepage.webp",
      "Mark Maeda Travel and Tour homepage with the headline Discover Japan with Confidence and a search field for tours and transfers.",
      "Homepage",
    ),
    overview: [
      "The website combines private tour discovery, transfer services, customizable bookings, and online payments. A tour page lists places to visit. Vehicle choices are priced per vehicle, from an 8-seater through a big bus. Checkout keeps a shopping cart and offers a 25% deposit, a 50% deposit, or full payment.",
      "The public site is live. The admin views below show catalog management and an overview of tours, transfers, and packages. A bookings screen with customer records is not included.",
    ],
    sections: [
      {
        id: "tour-discovery",
        index: "01",
        title: "Tour discovery",
        paragraphs: [
          "The homepage introduces private tours and transfers and includes search. Featured tours highlight Tokyo, Mount Fuji, Osaka, and Kyoto, with region, duration, and a starting price. The catalog lists 12 tours and can be filtered.",
          "A tour page covers the itinerary, highlights, and a price, and lets the traveler select places to visit before booking.",
        ],
        images: [
          shot(
            "mark-maeda/mark-maeda-featured-tours.webp",
            "Hot Tours row with Tokyo, Mount Fuji, Osaka, and Kyoto day tours and starting prices.",
            "Featured tours",
          ),
          shot(
            "mark-maeda/mark-maeda-tours.webp",
            "Tour catalog showing 12 tours, with region and title filters and cards for Tokyo, Mount Fuji, and Osaka.",
            "Tour catalog",
          ),
          shot(
            "mark-maeda/mark-maeda-tour-details.webp",
            "Tokyo Day Tour page for the Kanto region, 10 hours, from 65,000 yen, with places to visit including Meiji Shrine, Harajuku, and the Imperial Palace.",
            "Tour details",
          ),
        ],
      },
      {
        id: "booking",
        index: "02",
        title: "Booking experience",
        paragraphs: [
          "On a tour, the traveler selects places to visit, then a vehicle. Vehicles are priced individually: 8-seater, 10-seater, 14-seater, Coaster, and Big Bus. The quantity controls update a subtotal.",
          "Checkout shows the shopping cart, including the vehicle line, and three payment choices: 25% deposit, 50% deposit, or 100% full payment. The customer fields in this capture are empty.",
        ],
        images: [
          shot(
            "mark-maeda/mark-maeda-tour-details.webp",
            "Select places to visit on the Tokyo Day Tour, including Meiji Shrine, Harajuku, and the Imperial Palace.",
            "Place selection",
          ),
          shot(
            "mark-maeda/mark-maeda-vehicle-selection.webp",
            "Vehicle selection with per-vehicle prices for an 8-seater, 10-seater, 14-seater, Coaster, and Big Bus.",
            "Vehicle selection",
          ),
          shot(
            "mark-maeda/mark-maeda-checkout.webp",
            "Checkout cart for Tokyo Day Tour with one Big Bus, and payment options for a 25 percent deposit, a 50 percent deposit, or full payment.",
            "Checkout",
          ),
        ],
      },
      {
        id: "travel-services",
        index: "03",
        title: "Travel services",
        paragraphs: [
          "Airport transfers are listed as their own service, with routes such as Fukuoka Airport, Chubu Centrair, and Kansai International Airport, each with a starting price.",
          "The site also has a reviews page. That screenshot is not published here because it shows identifiable travelers. No review text is quoted on this page.",
        ],
        images: [
          shot(
            "mark-maeda/mark-maeda-transfers.webp",
            "Airport transfers for Fukuoka, Chubu Centrair, and Kansai International Airport, with starting prices.",
            "Airport transfers",
          ),
        ],
      },
      {
        id: "admin",
        index: "04",
        title: "Admin platform",
        paragraphs: [
          "The admin overview counts active tours, transfers, and packages, and lists recent catalog items. Tour management shows the catalog with region, duration, starting price, featured state, and status, plus actions to edit or archive a tour.",
          "A bookings management screen exists in the admin navigation. It is not published here because it lists customer names, email addresses, and booking references.",
        ],
        images: [
          shot(
            "mark-maeda/mark-maeda-admin-overview.webp",
            "Admin dashboard with counts for active tours, transfers, and packages, plus recent catalog items.",
            "Admin dashboard",
          ),
          shot(
            "mark-maeda/mark-maeda-admin-tours.webp",
            "Admin tour catalog with Tokyo, Mount Fuji, Osaka, Kyoto, Shirakawago, Niseko, and Sapporo day tours, regions, durations, and starting prices.",
            "Tour management",
          ),
        ],
      },
    ],
    technology: [
      { name: "Next.js", detail: "Application framework" },
      { name: "React", detail: "Interface" },
      { name: "TypeScript", detail: "Typed application code" },
      { name: "Supabase", detail: "Backend services" },
      { name: "PostgreSQL", detail: "Database" },
      { name: "Stripe Checkout", detail: "Online checkout" },
      { name: "Stripe webhooks", detail: "Payment event handling" },
    ],
    liveUrl: "https://www.markmaedatravelandtour.com/",
    seoDescription:
      "Case study of Mark Maeda Travel and Tour, a launched booking platform for private tours, airport transfers, vehicle selection, and online checkout.",
  },
];

export function getClientProject(slug: ClientProject["slug"]): ClientProject {
  const project = clientProjects.find((item) => item.slug === slug);
  if (!project) {
    throw new Error(`Unknown client project: ${slug}`);
  }
  return project;
}

export function getAdjacentClientProjects(slug: ClientProject["slug"]) {
  const index = clientProjects.findIndex((item) => item.slug === slug);
  return {
    previous: index > 0 ? clientProjects[index - 1] : null,
    next: index >= 0 && index < clientProjects.length - 1 ? clientProjects[index + 1] : null,
  };
}
