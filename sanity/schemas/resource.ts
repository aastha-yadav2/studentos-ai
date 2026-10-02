import { defineField, defineType } from "sanity"

export const resource = defineType({
  name: "resource",
  title: "Resource",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Resource Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Resource Type",
      type: "string",
      options: {
        list: [
          { title: "Documentation / Guide", value: "guide" },
          { title: "Sample Proposal / Template", value: "template" },
          { title: "Video Tutorial", value: "video" },
          { title: "GitHub Repository", value: "repo" },
          { title: "Official Handbook", value: "handbook" },
        ],
      },
    }),
    defineField({
      name: "url",
      title: "Resource URL",
      type: "url",
    }),
    defineField({
      name: "skills",
      title: "Skills Covered",
      type: "array",
      of: [{ type: "reference", to: [{ type: "skill" }] }],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
  ],
})
