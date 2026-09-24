import { supabase, isSupabaseConfigured } from './supabase';
import { INITIAL_ARTICLES, INITIAL_AUTHORS, INITIAL_CATEGORIES, INITIAL_ISSUES } from './mockData';

const STORAGE_KEYS = {
  ARTICLES: 'koszeg_articles_v3',
  ISSUES: 'koszeg_issues_v3',
  AUTHORS: 'koszeg_authors_v3',
  CATEGORIES: 'koszeg_categories_v3',
  VERSION: 'koszeg_data_version'
};

// Ha a nyomtatott lapszámokból újragenerált adat megváltozik, a böngészőben tárolt másolatot frissítjük.
const DATA_VERSION = `${INITIAL_ARTICLES.length}:${INITIAL_ARTICLES[0]?.id || ''}:${INITIAL_ISSUES[0]?.id || ''}`;

const getLocal = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};
const setLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage írás sikertelen:', e);
  }
};

const initLocalStorage = () => {
  try {
    if (localStorage.getItem(STORAGE_KEYS.VERSION) === DATA_VERSION) return;
    setLocal(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
    setLocal(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
    setLocal(STORAGE_KEYS.AUTHORS, INITIAL_AUTHORS);
    setLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
  } catch (e) {
    console.warn('localStorage nem elérhető:', e);
  }
};

initLocalStorage();

// Slugify helper
export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const dataService = {
  // --- ARTICLES ---
  async getArticles(filter = {}) {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('articles').select('*');
        if (filter.status) {
          const statusDB = filter.status === 'publikált' ? 'published' : filter.status === 'vázlat' ? 'draft' : filter.status === 'ellenőrzés alatt' ? 'review' : filter.status;
          query = query.eq('status', statusDB);
        }
        if (filter.issue_id) query = query.eq('issue_id', filter.issue_id);
        if (filter.category_id) query = query.eq('category_id', filter.category_id);
        
        const { data, error } = await query.order('order_index', { ascending: true }).order('published_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getArticles error, fallback to local:', err);
      }
    }

    let articles = getLocal(STORAGE_KEYS.ARTICLES);
    if (!articles || articles.length === 0) articles = INITIAL_ARTICLES;

    if (filter.status) {
      articles = articles.filter(a => {
        if (filter.status === 'published' || filter.status === 'publikált') return a.status === 'published' || a.status === 'publikált';
        if (filter.status === 'draft' || filter.status === 'vázlat') return a.status === 'draft' || a.status === 'vázlat';
        if (filter.status === 'review' || filter.status === 'ellenőrzés alatt') return a.status === 'review' || a.status === 'ellenőrzés alatt';
        return a.status === filter.status;
      });
    }
    if (filter.issue_id) articles = articles.filter(a => a.issue_id === filter.issue_id);
    if (filter.category_id) articles = articles.filter(a => a.category_id === filter.category_id);

    return articles.sort((a, b) => {
      if (a.issue_id && a.issue_id === b.issue_id && a.order_index && b.order_index) {
        return a.order_index - b.order_index;
      }
      return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
    });
  },

  async getArticleById(idOrSlug) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getArticleById error:', err);
      }
    }
    let articles = getLocal(STORAGE_KEYS.ARTICLES);
    if (!articles || articles.length === 0) articles = INITIAL_ARTICLES;
    return articles.find(a => a.id === idOrSlug || a.slug === idOrSlug) || null;
  },

  async saveArticle(articleData) {
    const isEdit = Boolean(articleData.id);
    const now = new Date().toISOString();
    
    // Normalize status to SQL check constraint ('draft', 'review', 'published')
    let statusDB = articleData.status || 'draft';
    if (statusDB === 'vázlat') statusDB = 'draft';
    if (statusDB === 'ellenőrzés alatt') statusDB = 'review';
    if (statusDB === 'publikált') statusDB = 'published';

    const slug = articleData.slug || slugify(articleData.title) || 'cikk-' + Date.now();

    const payload = {
      ...articleData,
      id: articleData.id || 'art-' + Date.now(),
      slug: slug,
      status: statusDB,
      updated_at: now,
      created_at: articleData.created_at || now,
      published_at: statusDB === 'published' ? (articleData.published_at || now) : articleData.published_at
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .upsert(payload)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase saveArticle error, using local fallback:', err);
      }
    }

    let articles = getLocal(STORAGE_KEYS.ARTICLES);
    if (isEdit) {
      articles = articles.map(a => a.id === payload.id ? payload : a);
    } else {
      articles.unshift(payload);
    }
    setLocal(STORAGE_KEYS.ARTICLES, articles);
    return payload;
  },

  async deleteArticle(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('articles').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteArticle error:', err);
      }
    }
    let articles = getLocal(STORAGE_KEYS.ARTICLES);
    articles = articles.filter(a => a.id !== id);
    setLocal(STORAGE_KEYS.ARTICLES, articles);
    return true;
  },

  async updateArticleOrderInIssue(issueId, orderedArticleIds) {
    if (isSupabaseConfigured()) {
      try {
        for (let i = 0; i < orderedArticleIds.length; i++) {
          await supabase.from('articles').update({ order_index: i + 1 }).eq('id', orderedArticleIds[i]);
        }
      } catch (err) {
        console.warn('Supabase update order error:', err);
      }
    }

    let articles = getLocal(STORAGE_KEYS.ARTICLES);
    articles = articles.map(art => {
      const idx = orderedArticleIds.indexOf(art.id);
      if (idx !== -1) {
        return { ...art, order_index: idx + 1 };
      }
      return art;
    });
    setLocal(STORAGE_KEYS.ARTICLES, articles);
  },

  // --- ISSUES ---
  async getIssues() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('issues').select('*').order('year', { ascending: false }).order('month', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getIssues error:', err);
      }
    }
    let issues = getLocal(STORAGE_KEYS.ISSUES);
    if (!issues || issues.length === 0) issues = INITIAL_ISSUES;
    return issues.sort((a, b) => (b.year - a.year) || (b.month - a.month));
  },

  async saveIssue(issueData) {
    const payload = {
      ...issueData,
      id: issueData.id || 'issue-' + Date.now(),
      created_at: issueData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('issues').upsert(payload).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase saveIssue error:', err);
      }
    }

    let issues = getLocal(STORAGE_KEYS.ISSUES);
    const idx = issues.findIndex(i => i.id === payload.id);
    if (idx !== -1) issues[idx] = payload;
    else issues.unshift(payload);
    setLocal(STORAGE_KEYS.ISSUES, issues);
    return payload;
  },

  // --- AUTHORS ---
  async getAuthors() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('authors').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getAuthors error:', err);
      }
    }
    const local = getLocal(STORAGE_KEYS.AUTHORS);
    return local.length ? local : INITIAL_AUTHORS;
  },

  async saveAuthor(authorData) {
    const payload = {
      ...authorData,
      id: authorData.id || 'auth-' + Date.now(),
      created_at: authorData.created_at || new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('authors').upsert(payload).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase saveAuthor error:', err);
      }
    }

    let authors = getLocal(STORAGE_KEYS.AUTHORS);
    const idx = authors.findIndex(a => a.id === payload.id);
    if (idx !== -1) authors[idx] = payload;
    else authors.push(payload);
    setLocal(STORAGE_KEYS.AUTHORS, authors);
    return payload;
  },

  // --- CATEGORIES ---
  async getCategories() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getCategories error:', err);
      }
    }
    const local = getLocal(STORAGE_KEYS.CATEGORIES);
    return local.length ? local : INITIAL_CATEGORIES;
  },

  // --- IMAGE UPLOAD ---
  async uploadImage(file, bucket = 'article-images') {
    if (isSupabaseConfigured()) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (!uploadError) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
          return data.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase upload failed, using Data URL fallback:', err);
      }
    }

    // Data URL fallback for local demo
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },

  // --- SEARCH ---
  async searchArticles(queryStr) {
    if (!queryStr || queryStr.trim() === '') return [];
    const q = queryStr.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      try {
        // Try Supabase Full-Text Search or ILIKE
        const { data } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .or(`title.ilike.%${q}%,subtitle.ilike.%${q}%,lead.ilike.%${q}%,content.ilike.%${q}%`);
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase search error:', err);
      }
    }

    const articles = await this.getArticles({ status: 'published' });
    const categories = await this.getCategories();
    const authors = await this.getAuthors();

    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const authMap = Object.fromEntries(authors.map(a => [a.id, a.name]));

    return articles.filter(art => {
      const titleMatch = art.title?.toLowerCase().includes(q);
      const subtitleMatch = art.subtitle?.toLowerCase().includes(q);
      const leadMatch = art.lead?.toLowerCase().includes(q);
      const contentMatch = art.content?.toLowerCase().includes(q);
      const authorMatch = authMap[art.author_id]?.toLowerCase().includes(q);
      const categoryMatch = catMap[art.category_id]?.toLowerCase().includes(q);

      return titleMatch || subtitleMatch || leadMatch || contentMatch || authorMatch || categoryMatch;
    });
  },

  async searchIssues(queryStr) {
    if (!queryStr || queryStr.trim() === '') return [];
    const q = queryStr.toLowerCase().trim();
    const issues = await this.getIssues();
    return issues.filter(iss => {
      const titleMatch = iss.title?.toLowerCase().includes(q);
      const yearMatch = iss.year?.toString().includes(q);
      const summaryMatch = iss.summary?.toLowerCase().includes(q);
      const searchMatch = iss.searchContent?.toLowerCase().includes(q);
      return titleMatch || yearMatch || summaryMatch || searchMatch;
    });
  }
};
