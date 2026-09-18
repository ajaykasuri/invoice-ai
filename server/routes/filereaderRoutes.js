const express = require('express');
const router = express.Router();
const fileController = require('../controller/filereaderController');
const fileUploadmiddleware = require('../middileware/fileuploadMiddleware');

router.post('/fileUpload', fileUploadmiddleware, fileController.fileReader);
router.post('/saveInvoice', fileController.saveInvoice);

module.exports = router;