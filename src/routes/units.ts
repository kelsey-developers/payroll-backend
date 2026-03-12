// PATH: back-end/src/routes/units.ts

import express from 'express';
import multer from 'multer';
import {
  getUnits,
  getUnitById,
  uploadUnitImage,
  deleteUnitImage,
} from '../controllers/unitController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getUnits);
router.get('/:unitId', getUnitById);
router.post('/:unitId/images', upload.single('image'), uploadUnitImage);
router.delete('/images/:imageId', deleteUnitImage);

export default router;