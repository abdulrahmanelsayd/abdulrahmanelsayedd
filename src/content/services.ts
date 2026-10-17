export const designItems = ["Page structure & navigation", "Responsive UI & interaction", "Design system & handoff"] as const;
export const developmentItems = ["Stores, CMS & custom features", "Forms, accounts & integrations", "Performance & technical SEO"] as const;
export const serviceModes = [
  { id: "design", label: "Design", title: "Pages with a clear purpose.", body: "Navigation, page layouts and interactions for a new site or a redesign. You get responsive designs ready for development, with a consistent system for the interface." },
  { id: "develop", label: "Develop", title: "More than the pages.", body: "Bring an existing design to life, add a feature or improve the site you already have. Stores, CMS, accounts and integrations are shaped around the agreed scope." },
  { id: "together", label: "Both", title: "Design and code, handled together.", body: "Page planning, visual design and a working website in one project. The content tools and features you need are built into the same plan." },
] as const;

export const servicesDescription = "Web design and development for business websites and online stores. Responsive interfaces, CMS, custom features, integrations and technical SEO, from brief to launch.";

export interface ServicesCopyItem { readonly title: string; readonly body: string }

export const audiences: readonly ServicesCopyItem[] = [
  {
    title: "Online stores",
    body: "Product pages, collections, cart and checkout, with the payment, shipping and content setup your store needs.",
  },
  {
    title: "Businesses",
    body: "Business websites, landing pages and service pages, with enquiries, bookings and content you can keep up to date.",
  },
  {
    title: "Teams & agencies",
    body: "Design-to-code builds, custom features and improvements to existing websites, with clear communication and a usable handover.",
  },
];

export const processPhases: readonly ServicesCopyItem[] = [
  {
    title: "Understand the project",
    body: "Your goals, audience and existing website come first. We agree on the pages, features, priorities and timeline before the build starts.",
  },
  {
    title: "Design the experience",
    body: "I map the pages and key journeys, then design the interface for mobile and desktop. You review how it looks and works before it becomes code.",
  },
  {
    title: "Build the website",
    body: "I build the interface, content setup and agreed functionality, including the integrations your website needs. You can review progress as it takes shape.",
  },
  {
    title: "Check the details",
    body: "I test the key journeys, forms and error states across screen sizes, then check accessibility, loading behaviour and technical SEO.",
  },
  {
    title: "Launch and hand over",
    body: "I prepare hosting, domain setup and the live website, then walk you through managing the content. Ongoing improvements and support can be arranged.",
  },
];

export const advantages: readonly ServicesCopyItem[] = [
  {
    title: "Every screen, considered",
    body: "Layouts, navigation and forms checked on mobile and desktop, with readable content, keyboard access and clear feedback.",
  },
  {
    title: "Performance",
    body: "Appropriately sized images, sensible loading and purposeful motion. I check how the important pages load and respond before launch.",
  },
  {
    title: "Technical SEO",
    body: "Descriptive titles, semantic page structure, crawlable content and indexing checks. Structured data is added where it helps describe the content.",
  },
  {
    title: "Connected features",
    body: "Forms, bookings, customer accounts, checkout and API integrations can be part of the build. Their validation, success and error states get the same attention as the interface.",
  },
  {
    title: "Content you can manage",
    body: "A content setup that suits what you need to update, from pages and articles to products. I explain how to use it at handover.",
  },
  {
    title: "A considered launch",
    body: "Hosting, domain setup, HTTPS and final checks are part of getting the website online. You receive the access and guidance needed to run it, with a clear plan for any next steps.",
  },
];

export const phaseLabels = ["Discover", "Design", "Build", "Test", "Launch"] as const;
