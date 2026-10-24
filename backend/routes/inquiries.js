import express from 'express';
import { createInquiry, getInquiryByRef } from '../controllers/inquiriesController.js';

const router = express.Router();

// POST /api/inquiries - Submit an inquiry
router.post('/', createInquiry);

// GET /api/inquiries/:ref - Check inquiry status
router.get('/:ref', getInquiryByRef);

export default router;
