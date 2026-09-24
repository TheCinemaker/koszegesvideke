import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminArticleEditor } from './AdminArticleEditor';
import { AdminArticlesList } from './AdminArticlesList';
import { AdminIssuesManager } from './AdminIssuesManager';
import { AdminAuthorsManager } from './AdminAuthorsManager';
import { AdminLogin } from './AdminLogin';
import { AdminAdsManager } from './AdminAdsManager';
import { dataService } from '../../services/dataService';
import { navigate } from '../../lib/router';

// Szerkesztőségi felület (a korábbi App.jsx admin része, változatlan működéssel)
export const AdminApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [articles, setArticles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);

  const reload = async () => {
    const [a, i, au, c] = await Promise.all([
      dataService.getArticles(),
      dataService.getIssues(),
      dataService.getAuthors(),
      dataService.getCategories(),
    ]);
    setArticles(a);
    setIssues(i);
    setAuthors(au);
    setCategories(c);
  };

  useEffect(() => {
    reload();
  }, []);

  const toPublic = () => navigate('home');
  const viewArticle = (id) => navigate('cikk', id);

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={() => setIsLoggedIn(true)} onNavigatePublic={toPublic} />;
  }

  const edit = (art) => {
    setArticleToEdit(art);
    setTab('new-article');
  };

  return (
    <AdminLayout
      activeTab={tab}
      setActiveTab={(t) => {
        if (t === 'new-article' && tab !== 'new-article') setArticleToEdit(null);
        setTab(t);
      }}
      onNavigatePublic={toPublic}
      onLogout={() => setIsLoggedIn(false)}
    >
      {tab === 'dashboard' && (
        <AdminDashboard
          articles={articles}
          issues={issues}
          onNavigateTab={(t) => {
            if (t === 'new-article') setArticleToEdit(null);
            setTab(t);
          }}
          onEditArticle={edit}
          onViewArticle={viewArticle}
        />
      )}
      {tab === 'articles' && (
        <AdminArticlesList
          articles={articles}
          categories={categories}
          authors={authors}
          issues={issues}
          onEditArticle={edit}
          onCreateArticle={() => edit(null)}
          onDeleteArticle={async (id) => {
            await dataService.deleteArticle(id);
            await reload();
          }}
          onViewArticle={viewArticle}
        />
      )}
      {tab === 'new-article' && (
        <AdminArticleEditor
          articleToEdit={articleToEdit}
          categories={categories}
          authors={authors}
          issues={issues}
          onSaveSuccess={async () => {
            await reload();
            setArticleToEdit(null);
            setTab('articles');
          }}
          onCancel={() => setTab('articles')}
        />
      )}
      {tab === 'issues' && (
        <AdminIssuesManager
          issues={issues}
          articles={articles}
          onSaveIssue={async (d) => {
            const saved = await dataService.saveIssue(d);
            await reload();
            return saved;
          }}
          onUpdateArticlesOrder={async (issueId, ids) => {
            await dataService.updateArticleOrderInIssue(issueId, ids);
            await reload();
          }}
        />
      )}
      {tab === 'ads' && <AdminAdsManager />}
      {tab === 'authors' && (
        <AdminAuthorsManager
          authors={authors}
          onSaveAuthor={async (d) => {
            await dataService.saveAuthor(d);
            await reload();
          }}
        />
      )}
    </AdminLayout>
  );
};
