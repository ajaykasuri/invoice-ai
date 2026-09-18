require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const fileRoutes = require('./routes/filereaderRoutes');
app.use('/file', fileRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));