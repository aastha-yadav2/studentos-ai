import { defineField, defineType } from "sanity"

export const source = defineType({
  name: "source",
  title: "Official Source",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Source Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "url",
      title: "Source URL",
      type: "url",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sourceType",
      title: "Source Type",
      type: "string",
      options: {
        list: [
          { title: "Official Website", value: "official_website" },
          { title: "Official Blog", value: "official_blog" },
          { title: "Program FAQ", value: "faq" },
          { title: "Community Forum", value: "forum" },
        ],
      },
    }),
    defineField({
      name: "verifiedAt",
      title: "Last Verified Timestamp",
      type: "datetime",
    }),
    defineField({
      name: "notes",
      title: "Verification Notes",
      type: "text",
    }),
  ],
})
