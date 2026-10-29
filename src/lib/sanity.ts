import {createClient} from '@sanity/client'

export const client = createClient({
  projectId: 'cgb27hm1',
  dataset: 'production',
  apiVersion: '2026-03-01',
  useCdn: false,
  perspective: 'published',
})