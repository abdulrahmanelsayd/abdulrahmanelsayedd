export interface PreviewImage {
  readonly src: `/images/projects/${string}.webp`;
  readonly width: number;
  readonly height: number;
  readonly format: "webp";
  readonly alt: string;
}
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly href: `https://${string}`;
  readonly preview: PreviewImage;
}

export const projects = [
  { id: "rifq-shop", name: "Rifq Shop", href: "https://rifqshop.com/", preview: { src: "/images/projects/rifq-shop.webp", width: 760, height: 1140, format: "webp", alt: "Rifq Shop website preview" } },
  { id: "jood-plus", name: "Jood Plus Pharmacy", href: "https://joodpluspharmacy.com/", preview: { src: "/images/projects/jood-plus.webp", width: 760, height: 1140, format: "webp", alt: "Jood Plus Pharmacy website preview" } },
  { id: "u-richi", name: "U-Richi", href: "https://u-richi.com/", preview: { src: "/images/projects/u-richi.webp", width: 760, height: 1140, format: "webp", alt: "U-Richi website preview" } },
  { id: "dehaz-skincare", name: "Dehaz Skincare", href: "https://dehazskincare.com/", preview: { src: "/images/projects/dehaz-skincare.webp", width: 760, height: 1140, format: "webp", alt: "Dehaz Skincare website preview" } },
  { id: "next-gen", name: "Next Gen", href: "https://nextgen-fs.com/", preview: { src: "/images/projects/next-gen.webp", width: 760, height: 1140, format: "webp", alt: "Next Gen website preview" } },
  { id: "al-wesam", name: "Al Wesam Decor", href: "https://al-wesamfordecor.com/", preview: { src: "/images/projects/al-wesam.webp", width: 760, height: 1140, format: "webp", alt: "Al Wesam Decor website preview" } },
  { id: "goat", name: "GOAT Marketing Agency", href: "https://thegoatmarketingagency.com/", preview: { src: "/images/projects/goat.webp", width: 760, height: 1140, format: "webp", alt: "GOAT Marketing Agency website preview" } },
  { id: "lawrence-shop", name: "Lawrence Shop", href: "https://lawrenceshop.com/", preview: { src: "/images/projects/lawrence-shop.webp", width: 760, height: 1140, format: "webp", alt: "Lawrence Shop website preview" } },
  { id: "proline", name: "Proline", href: "https://proline-ad.com/", preview: { src: "/images/projects/proline.webp", width: 760, height: 1140, format: "webp", alt: "Proline website preview" } },
  { id: "sonoa", name: "Sonoa", href: "https://sonoa.online/", preview: { src: "/images/projects/sonoa.webp", width: 760, height: 1140, format: "webp", alt: "Sonoa website preview" } },
] as const satisfies readonly Project[];

export type ProjectId = (typeof projects)[number]["id"];
export const homeProjectIds = ["rifq-shop", "dehaz-skincare", "jood-plus", "next-gen"] as const satisfies readonly ProjectId[];
export const workProjectIds = ["rifq-shop", "jood-plus", "u-richi", "dehaz-skincare", "next-gen", "al-wesam", "goat", "lawrence-shop", "proline", "sonoa"] as const satisfies readonly ProjectId[];
export const menuProjectIds = ["rifq-shop", "jood-plus", "u-richi", "dehaz-skincare"] as const satisfies readonly ProjectId[];

export function getProject(id: ProjectId): (typeof projects)[number] {
  const project = projects.find(item => item.id === id);
  if (!project) throw new Error(`Unknown project ID: ${id}`);
  return project;
}
