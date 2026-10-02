import { defineField, defineType } from "sanity"

export const skill = defineType({
  name: "skill",
  title: "Skill",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Skill Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Frontend", value: "frontend" },
          { title: "Backend", value: "backend" },
          { title: "Fullstack", value: "fullstack" },
          { title: "Mobile", value: "mobile" },
          { title: "AI / ML", value: "ai_ml" },
          { title: "Cloud / DevOps", value: "cloud_devops" },
          { title: "Blockchain / Web3", value: "web3" },
          { title: "Programming Languages", value: "languages" },
          { title: "Soft Skills / Leadership", value: "leadership" },
        ],
      },
    }),
    defineField({
      name: "aliases",
      title: "Skill Aliases",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
  ],
})
