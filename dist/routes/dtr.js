"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const dtrController_1 = require("../controllers/dtrController");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Specific routes first (avoid param capture by /:id)
router.get('/range', dtrController_1.getDTRRange);
router.get('/all', dtrController_1.getAllDTR);
router.get('/summary', dtrController_1.getDTRSummary);
router.get('/tasks', dtrController_1.getTasks);
router.post('/time-in', dtrController_1.timeIn);
router.post('/time-out', dtrController_1.timeOut);
router.post('/tasks', upload.single('file'), dtrController_1.uploadTask);
router.patch('/:id/verify', dtrController_1.verifyDTR);
// Single-day lookup last
router.get('/', dtrController_1.getDTR);
exports.default = router;
