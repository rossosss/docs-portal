import 'dotenv/config';
import type {Config} from '@docusaurus/types';
import fs from 'node:fs';
import {parse} from 'yaml';
const owner=process.env.GITHUB_OWNER || 'YOUR_GITHUB_USERNAME';
const config:Config={
  title:'Docs Portal',tagline:'Единая документация распределённой системы',
  url:process.env.SITE_URL || 'https://'+owner+'.github.io',
  baseUrl:process.env.BASE_URL || '/docs-portal/',
  organizationName:owner,projectName:'docs-portal',trailingSlash:true,
  onBrokenLinks:'throw',i18n:{defaultLocale:'ru',locales:['ru']},
  markdown:{format:'detect',hooks:{onBrokenMarkdownLinks:'throw'}},
  customFields:{docsApiUrl:process.env.DOCS_API_URL || (process.env.NODE_ENV==='development'?'http://127.0.0.1:4000':''),projects:parse(fs.readFileSync('sources.yml','utf8')).projects.map(({id,name,repository,targetPath}:Record<string,string>)=>({id,name,repository,targetPath}))},
  presets:[['classic',{docs:{path:'generated-docs',routeBasePath:'docs',sidebarPath:'./sidebars.ts'},blog:false,theme:{customCss:'./src/css/custom.css'}}]],
  themeConfig:{
    navbar:{title:'Docs Portal',items:[{to:'/docs/common/',label:'Документация',position:'left'},{to:'/create-document',label:'Создать документ',position:'right'}]},
    footer:{style:'dark',copyright:'Документация рядом с кодом · Все изменения через Pull Request'},
    colorMode:{defaultMode:'light',respectPrefersColorScheme:true},
  },
};
export default config;
