export interface SocialLink {
  readonly label: "Instagram" | "Tumblr";
  readonly short: string;
  readonly href: `https://${string}`;
}

export const identity = {
  name: "Abdulrahman Elsayed",
  role: "Web Designer & Developer",
  location: "Based in Egypt",
  email: "abdulrahmaanelsayd@gmail.com",
  phone: "01114672369",
  phoneUri: "tel:+201114672369",
  whatsappUri: "https://wa.me/201114672369",
  description: "Abdulrahman Elsayed is a web designer and developer based in Egypt. Explore business websites, online stores and web design and development services.",
  socials: [
    { label: "Instagram", short: "IG", href: "https://www.instagram.com/abdulrahmanelsaydd/" },
    { label: "Tumblr", short: "TM", href: "https://www.tumblr.com/blog/abduulrahman" },
  ] satisfies readonly SocialLink[],
} as const;
