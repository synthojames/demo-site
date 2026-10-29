import {defineField, defineType} from 'sanity'

export const newsItem = defineType({
  name: 'newsItem',
  title: 'お知らせ',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'タイトル', type: 'string', validation: (r) => r.required().max(80)}),
    defineField({name: 'publishedAt', title: '公開日', type: 'date', validation: (r) => r.required()}),
    defineField({name: 'body', title: '本文', type: 'text', rows: 4}),
  ],
})