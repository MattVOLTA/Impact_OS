-- Helper functions for database schema testing
-- These functions allow Jest tests to introspect database structure

-- Get columns for a table
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = get_table_columns.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get foreign keys for a table
CREATE OR REPLACE FUNCTION get_foreign_keys(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  foreign_table_name TEXT,
  foreign_column_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kcu.column_name::TEXT,
    ccu.table_name::TEXT AS foreign_table_name,
    ccu.column_name::TEXT AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = get_foreign_keys.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get indexes for a table
CREATE OR REPLACE FUNCTION get_indexes(table_name TEXT)
RETURNS TABLE (
  index_name TEXT,
  column_names TEXT[],
  is_unique BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.indexname::TEXT AS index_name,
    ARRAY_AGG(a.attname::TEXT ORDER BY a.attnum) AS column_names,
    idx.indisunique AS is_unique
  FROM pg_indexes i
  JOIN pg_class c ON c.relname = i.indexname
  JOIN pg_index idx ON idx.indexrelid = c.oid
  JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
  WHERE i.schemaname = 'public'
    AND i.tablename = get_indexes.table_name
  GROUP BY i.indexname, idx.indisunique;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get check constraints for a table
CREATE OR REPLACE FUNCTION get_check_constraints(table_name TEXT)
RETURNS TABLE (
  constraint_name TEXT,
  constraint_definition TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    con.conname::TEXT AS constraint_name,
    pg_get_constraintdef(con.oid)::TEXT AS constraint_definition
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = get_check_constraints.table_name
    AND con.contype = 'c';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get RLS policies for a table
CREATE OR REPLACE FUNCTION get_policies(table_name TEXT)
RETURNS TABLE (
  policy_name TEXT,
  policy_definition TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.polname::TEXT AS policy_name,
    pg_get_expr(pol.polqual, pol.polrelid)::TEXT AS policy_definition
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = get_policies.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
