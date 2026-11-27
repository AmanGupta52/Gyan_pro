import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

router.get('/', categoryController.listCategories);
router.get('/subjects', categoryController.listSubjects);

export default router;
