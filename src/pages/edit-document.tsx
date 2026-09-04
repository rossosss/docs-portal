import React from 'react';
import Layout from '@theme/Layout';
import DocumentForm from '../components/DocumentForm';
export default function Edit(){return <Layout title="Редактировать документ"><main className="portal"><p className="eyebrow">Documentation / Edit</p><h1>Редактировать документ</h1><p className="lede">Редактор читает актуальный файл из GitHub. После подтверждения запроса GitHub Action создаст отдельный Pull Request.</p><DocumentForm edit/></main></Layout>;}
