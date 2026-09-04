import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export default function Home(){
 const {siteConfig}=useDocusaurusContext();
 const sources={projects:siteConfig.customFields?.projects as Array<{id:string;name:string;repository:string;targetPath:string}>};
 return <Layout title="Единая документация" description="Документация Terminal, Gateway и общих процессов"><main className="portal">
 <p className="eyebrow">Engineering / Knowledge base</p><h1>Вся система. Один портал.</h1>
 <p className="lede">Архитектура, интеграции и рабочие процессы. Документация живёт рядом с кодом и собирается здесь из независимых репозиториев.</p>
 <div className="cards">{sources.projects.map(p=><Link className="project-card" key={p.id} to={'/docs/'+p.targetPath+'/'}><small>{p.repository}</small><h2>{p.name}</h2><p>Открыть документацию →</p></Link>)}</div>
 <section className="panel"><h2>Есть что добавить?</h2><p>Выберите проект и создайте Markdown-документ. Изменения отправятся владельцам проекта на проверку через Pull Request.</p><Link className="button button--primary" to="/create-document">Создать документ</Link></section>
 <p style={{marginTop:24}}><Link to="/build-manifest.json">Версии источников этой сборки ↗</Link></p>
 </main></Layout>;
}
