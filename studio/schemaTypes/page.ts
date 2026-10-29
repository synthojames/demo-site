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
      validation: (r) =>
        r.required().custom((s) => {
          const v = s?.current
          if (!v) return 'スラッグは必須です'
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) return '半角英小文字・数字・ハイフンのみ'
          if (v === 'news') return 'このスラッグは予約済みです'
          return true
        }),
    }),
    defineField({name: 'headline', title: '見出し', type: 'string', validation: (r) => r.required().max(60)}),
    defineField({name: 'body', title: '本文', type: 'text', rows: 4, validation: (r) => r.required().max(400)}),
  ],
})