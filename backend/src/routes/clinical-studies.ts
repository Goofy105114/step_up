import { Router, Request, Response } from 'express';
import { query } from '../db/pool';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT id,title,authors,publication,publication_date,doi,source_url,document_url,summary,created_at
     FROM clinical_studies
     WHERE is_published=true AND source_verified=true
     ORDER BY publication_date DESC NULLS LAST, created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

export default router;
