-- tables
SELECT name as label, name as value FROM sqlite_schema WHERE type IN ('table','view') ORDER BY 1;