import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const postsCollection = defineCollection({
  loader: glob({ pattern: ['**/*.md', '**/*.mdx'], base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    description: z.string().optional(),
    socialTitle: z.string().optional(),
    author: z.string().optional(),
    lang: z.string().optional().default('en'),
    tags: z.array(z.string()).optional().default([]),
  }),
})

export const collections = {
  posts: postsCollection,
}
