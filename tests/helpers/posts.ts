import BlogPost from '#models/content/blog_post'

export const paragraph = (value: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: value }],
})

/** The editor sends its document as a JSON string; see app/validators/seller/post.ts. */
export const body = <T extends { content: unknown }>(payload: T) => ({
  ...payload,
  content: JSON.stringify(payload.content),
})

export const countPosts = async () => {
  const posts = await BlogPost.all()
  return posts.length
}

export const createPost = (attrs: Partial<BlogPost> & { handle: string }) =>
  BlogPost.create({
    title: attrs.handle,
    content: { type: 'doc', content: [] },
    contentHtml: '',
    status: 'draft',
    ...attrs,
  })
