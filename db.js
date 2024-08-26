const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const authenticateToken = require('./middlewares/authMiddleware');

JWT_SECRET='majing'

const app = express();
const port = 3244;

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'model-t'
});

db.connect((err) => {
  if (err) {
    console.log("database Error connecting");
    console.log(err);
  } else {
    console.log("เชื่อม database สำเร็จ");
  }
});

app.use(bodyParser.json()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ------------- Login endpoint--------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Check if username and password are provided
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Query the database for the user
  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database query failed' });
    }

    // If user is not found
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    // Compare the provided password with the stored password
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: '1h' } // Token expiration time
    );

    // Send the token to the client
    res.status(200).json({ message: 'Login successful', token, user_id:user.user_id});
  });
});
//================================================================================================
// app.post('/api/login', (req, res) => {
//   const { username, password } = req.body;

//   // Check if username and password are provided
//   if (!username || !password) {
//     return res.status(400).json({ message: 'Username and password are required' });
//   }

//   // Query the database for the user
//   const query = 'SELECT * FROM users WHERE username = ?';
//   db.query(query, [username], (err, results) => {
//     if (err) {
//       return res.status(500).json({ message: 'Database query failed' });
//     }

//     // If user is not found
//     if (results.length === 0) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const user = results[0];

//     // Compare the provided password with the stored password
//     if (password !== user.password) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Create JWT token including the role
//     const token = jwt.sign(
//       { id: user.id, username: user.username, role: user.role }, // Include role in payload
//       JWT_SECRET, // Secret key
//       { expiresIn: '1h' } // Token expiration time
//     );

//     // Send the token to the client
//     res.status(200).json({ message: 'Login successful', token, user_id: user.user_id, role: user.role });
//   });
// });
//  //==================================================================


//============================ดึงข้อมูลเทรนเนอร์
// // Endpoint to get trainer information by user_id
// app.get('/api/trainer', authenticateToken, (req, res) => {
//   const { userid } = req.query; // Extract user_id from query parameters

//   if (!userid) {
//     return res.status(400).json({ message: 'User ID is required' });
//   }

//   // Query to get the trainer information using the user_id
//   const getTrainerQuery = `
//     SELECT trainers.trainer_id, trainers.name, trainers.email, trainers.phone 
//     FROM trainers 
//     WHERE trainers.user_id = ?`;
  
//   db.query(getTrainerQuery, [userid], (err, trainerResults) => {
//     if (err) {
//       return res.status(500).json({ message: 'Database query failed', error: err });
//     }

//     if (trainerResults.length === 0) {
//       return res.status(404).json({ message: 'Trainer not found for the given user ID' });
//     }

//     // Return the trainer information
//     res.status(200).json(trainerResults[0]);
//   });
// });

app.get('/api/clients', authenticateToken, (req, res) => {
  const { userid } = req.query; // Extract userid from req.query

  if (!userid) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Query to get the trainer_id using the userid
  const getTrainerIdQuery = 'SELECT trainer_id FROM trainers WHERE user_id = ?';
  db.query(getTrainerIdQuery, [userid], (err, trainerResults) => {
    if (err) {
      return res.status(500).json({ message: 'Database query failed', error: err });
    }

    if (trainerResults.length === 0) {
      return res.status(404).json({ message: 'Trainer not found for the given userid' });
    }

    const trainerId = trainerResults[0].trainer_id;

    // Query to get clients for the retrieved trainer_id
    const getClientQuery = 'SELECT * FROM clients WHERE trainer_id = ?'; // Corrected query
    db.query(getClientQuery, [trainerId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database query failed', error: err });
      }

      res.status(200).json(results);
    });
  });
});


app.post('/api/clients', authenticateToken, (req, res) => {
  const { first_name, last_name, phone, address, userid } = req.body;

  // Validate the input data
  if (!first_name || !last_name ||  !phone ||  !address ||  !userid) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Query to get the Trainner_id using the userid
  const getTrainerIdQuery = 'SELECT trainer_id FROM trainers WHERE user_id = ?';
  db.query(getTrainerIdQuery, [userid], (err, trainerResults) => {
    if (err) {
      return res.status(500).json({ message: 'Database query failed', error: err });
    }
 
    if (trainerResults.length === 0) {
      return res.status(404).json({ message: 'Trainer not found for the given user_id' });
    }

    const trainnerId = trainerResults[0].trainer_id;

    // Insert the client data along with the Trainner_id
    const insertClientQuery = 'INSERT INTO clients (first_name, last_name, phone, address, trainer_id) VALUES (?, ?, ?, ?, ?)';
    db.query(insertClientQuery, [first_name, last_name, phone, address, trainnerId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database query failed', error: err });
      }

      res.status(201).json({ message: 'Client added successfully', clientId: results.insertId });
    });
  });
});



app.listen(port, () => {
  console.log('api เปิดใน port : ' + port);
});
