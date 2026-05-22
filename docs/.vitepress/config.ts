import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ModDar",
  description: "Just a tool to ease daily tasks of reddit moderators :)",

  base: '/mod-dar/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    socialLinks: [
      { icon: 'codeberg', link: 'https://codeberg.org/gbrennon/ModDar' }
    ]
  }
})
