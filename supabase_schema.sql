-- ==============================================================================
-- KŐSZEG ÉS VIDÉKE
-- DIGITAL EDITION / ARCHIVE / EDITORIAL CMS
-- Established 1881 / Supabase Database Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. CATEGORIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. AUTHORS / EDITORS / REPORTERS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'szerzo',
    avatar TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT authors_role_check
    CHECK (role IN (
        'szerkeszto',
        'riporter',
        'szerzo',
        'fotos'
    ))
);

-- ==============================================================================
-- 3. ISSUES / LAPSZÁMOK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    year INT NOT NULL,
    month INT NOT NULL,
    issue_number INT NOT NULL,

    publication_date DATE NOT NULL,

    title VARCHAR(255) NOT NULL,

    cover_image TEXT,

    -- Original source PDF
    pdf_url TEXT,
    source_url TEXT,
    source_filename TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'published',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT issues_status_check
    CHECK (status IN (
        'draft',
        'published',
        'archived'
    )),

    CONSTRAINT issues_month_check
    CHECK (month BETWEEN 1 AND 12),

    CONSTRAINT issues_unique_number
    UNIQUE (year, issue_number)
);

-- ==============================================================================
-- 4. ARTICLES / CIKKEK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    issue_id UUID
        REFERENCES public.issues(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    subtitle TEXT,
    lead TEXT,
    content TEXT NOT NULL,

    cover_image TEXT,

    category_id UUID
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    author_id UUID
        REFERENCES public.authors(id)
        ON DELETE SET NULL,

    reporter_id UUID
        REFERENCES public.authors(id)
        ON DELETE SET NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'draft',

    -- Order inside the issue
    order_index INT NOT NULL DEFAULT 0,

    -- Original PDF page reference
    page_start INT,
    page_end INT,

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT articles_status_check
    CHECK (status IN (
        'draft',
        'review',
        'published'
    ))
);

-- ==============================================================================
-- 5. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_articles_status
ON public.articles(status);

CREATE INDEX IF NOT EXISTS idx_articles_published_at
ON public.articles(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_category
ON public.articles(category_id);

CREATE INDEX IF NOT EXISTS idx_articles_issue
ON public.articles(issue_id);

CREATE INDEX IF NOT EXISTS idx_articles_author
ON public.articles(author_id);

CREATE INDEX IF NOT EXISTS idx_articles_reporter
ON public.articles(reporter_id);

CREATE INDEX IF NOT EXISTS idx_issues_year_month
ON public.issues(year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_issues_publication_date
ON public.issues(publication_date DESC);

-- ==============================================================================
-- 6. FULL TEXT SEARCH
-- ==============================================================================

ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    to_tsvector(
        'hungarian',
        COALESCE(title, '') || ' ' ||
        COALESCE(subtitle, '') || ' ' ||
        COALESCE(lead, '') || ' ' ||
        COALESCE(content, '')
    )
) STORED;

CREATE INDEX IF NOT EXISTS idx_articles_search
ON public.articles
USING GIN(search_vector);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ

CREATE POLICY "Public can read published articles"
ON public.articles
FOR SELECT
USING (
    status = 'published'
);

CREATE POLICY "Public can read published issues"
ON public.issues
FOR SELECT
USING (
    status = 'published'
);

CREATE POLICY "Public can read categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Public can read authors"
ON public.authors
FOR SELECT
USING (true);

-- ==============================================================================
-- 8. ADMIN POLICIES
-- ==============================================================================

CREATE POLICY "Authenticated users manage articles"
ON public.articles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users manage issues"
ON public.issues
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users manage authors"
ON public.authors
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 9. INITIAL CATEGORIES
-- ==============================================================================

INSERT INTO public.categories (name, slug)
VALUES
    ('Aktuális', 'aktualis'),
    ('Közélet', 'kozelet'),
    ('Kultúra', 'kultura'),
    ('Sport', 'sport'),
    ('Helytörténet', 'helytortenet'),
    ('Oktatás', 'oktatas'),
    ('Gazdaság', 'gazdasag'),
    ('Civil élet', 'civil-elet'),
    ('Programok', 'programok')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- 10. HIRDETÉSEK (online hirdetési felület)
-- A nyilvános oldal csak az aktív, érvényességi időn belüli hirdetéseket olvashatja;
-- létrehozni / módosítani csak bejelentkezett szerkesztő tud.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser VARCHAR(200) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    image_url TEXT,
    link_url TEXT,
    phone VARCHAR(60),
    address VARCHAR(200),
    category VARCHAR(80),
    starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
    ends_on DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read running ads"
ON public.ads
FOR SELECT
USING (active AND starts_on <= CURRENT_DATE AND (ends_on IS NULL OR ends_on >= CURRENT_DATE));

CREATE POLICY "Authenticated users manage ads"
ON public.ads
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
