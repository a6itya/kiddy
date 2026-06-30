require('dotenv').config();
const express = require('express');
const cors = require('cors');

const childrenRouter = require('./routes/children');
const classroomsRouter = require('./routes/classrooms');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/children', childrenRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`Kiddy server running on http://localhost:${PORT}`);
});
