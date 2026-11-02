import {defineField, defineType} from 'sanity'

export const newsItem = defineType({
  name: 'newsItem',
  title: 'お知らせ',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'タイトル', type: 'string', validation: (r) => r.required().max(80)}),
    defineField({name: 'publishedAt', title: '公開日', type: 'date', validation: (r) => r.required()}),
    defineField({
      name: 'image',
      title: '写真',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の内容を短く説明してください(スクリーンリーダー用)',
          validation: (r) =>
            r.custom((alt, ctx) => {
              // alt is required only when an image has been uploaded
              const hasImage = (ctx.parent as {asset?: unknown} | undefined)?.asset
              return hasImage && !alt ? '画像には代替テキストが必要です' : true
            }),
        }),
      ],
    }),
    defineField({name: 'body', title: '本文', type: 'text', rows: 4}),
  ],
})