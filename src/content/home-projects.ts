import { homeProjectIds, getProject, type ProjectId } from "./projects";

export const homeProjects = homeProjectIds.map(id => ({ ...getProject(id), id }));
export const projectStatement = "A product to find. A service to understand. A checkout to finish. Each website has a different job to do.";
export const projectArtwork = {
  "rifq-shop": { sticker: "/graphics/truus-projects/sticker-0.svg", scale: 140 },
  "dehaz-skincare": { sticker: "/graphics/truus-projects/sticker-1.svg", scale: 160 },
  "jood-plus": { sticker: "/graphics/truus-projects/sticker-2.svg", scale: 170 },
  "next-gen": { sticker: "/graphics/truus-projects/sticker-3.svg", scale: 130 },
} as const satisfies Partial<Record<ProjectId, { sticker: string; scale: number }>>;

// These are the actual enhanced card widths, including the reference's clamped em scale.
export const homeProjectSizes = "(max-width: 479px) 57.44vw, (max-width: 767px) 57.44vw, (max-width: 991px) 45.56vw, (max-width: 1920px) 26.39vw, 507px";
