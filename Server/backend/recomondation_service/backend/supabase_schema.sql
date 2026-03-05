-- Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- ============================================================================
-- SHOPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shops (
    shop_id TEXT PRIMARY KEY,
    shop_name TEXT,
    shop_type TEXT,
    district TEXT,
    city_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone_number TEXT,
    whatsapp_number BIGINT,
    email TEXT,
    website TEXT,
    google_maps_url TEXT,
    opening_hours TEXT,
    average_rating DOUBLE PRECISION,
    reviews_count DOUBLE PRECISION,
    verified TEXT,
    average_turnaround_time TEXT,
    price_range TEXT,
    brands TEXT,
    categories TEXT,
    types TEXT,
    specialization_services TEXT,
    warranty TEXT,
    warranty_provided TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shops_shop_type ON shops(shop_type);
CREATE INDEX IF NOT EXISTS idx_shops_district ON shops(district);
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(average_rating DESC);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,
    shop_id TEXT,
    shop_name TEXT,
    district TEXT,
    category TEXT,
    brand TEXT,
    model TEXT,
    specifications TEXT,
    price_lkr DOUBLE PRECISION,
    stock_status TEXT,
    warranty TEXT,
    last_updated TEXT,
    verified TEXT,
    shop_name_shop TEXT,
    district_shop TEXT,
    city_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    average_rating DOUBLE PRECISION,
    reviews_count DOUBLE PRECISION,
    verified_shop TEXT,
    shop_type TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    event_id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    user_id TEXT,
    error_type TEXT,
    context TEXT,
    candidates_shown TEXT,
    clicked_id TEXT,
    contacted_id TEXT,
    chosen_id TEXT,
    solved TEXT,
    user_rating DOUBLE PRECISION,
    time_to_resolution_days DOUBLE PRECISION,
    comment TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_error_type ON feedback(error_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable if needed
-- ============================================================================
-- Uncomment these if you want to enable Row Level Security
-- ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Example policy (allow all reads, restrict writes to authenticated users)
-- CREATE POLICY "Allow public read access" ON shops FOR SELECT USING (true);
-- CREATE POLICY "Allow authenticated insert" ON shops FOR INSERT WITH CHECK (auth.role() = 'authenticated');

