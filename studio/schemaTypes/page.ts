import {defineField, defineType} from 'sanity'

export const page = defineType({
  name: 'page',
  title: 'ページ',
  type: 'document',
  fields: [
    defineField({name: 'title', title: '管理用タイトル', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {source: 'title'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'headline', title: '見出し', type: 'string', validation: (r) => r.required().max(60)}),
    defineField({name: 'body', title: '本文', type: 'text', rows: 4, validation: (r) => r.required().max(400)}),
  ],
})