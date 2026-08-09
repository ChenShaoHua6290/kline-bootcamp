ALTER TABLE "courses"
ADD COLUMN IF NOT EXISTS "related_links" JSONB;

UPDATE "courses"
SET "related_links" = '[
  { "label": "指标系统说明", "href": "/indicators", "sortOrder": 10 },
  { "label": "多周期共振提醒", "href": "/alerts", "sortOrder": 20 }
]'::jsonb
WHERE "related_links" IS NULL;
