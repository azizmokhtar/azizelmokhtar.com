import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const site = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/site" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    links: z.record(z.string()).default({}),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      year: z.number(),
      kind: z.enum(["ml", "fintech", "software", "research"]),
      url: z.string().optional(),
      repo: z.string().optional(),
      order: z.number().default(0),
      tech: z.array(z.string()).default([]),
      related: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
          }),
        )
        .default([]),
    }),
});

const experience = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

const tutorials = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tutorials" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

export const collections = { site, projects, experience, tutorials };
