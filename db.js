const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const authenticateToken = require("./middlewares/authMiddleware");

JWT_SECRET = "majing";

const app = express();
const port = 3244;

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "model-t",
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
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Check if username and password are provided
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  // Query the database for the user
  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database query failed" });
    }

    // If user is not found
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    // Compare the provided password with the stored password
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username }, // Payload
      JWT_SECRET, // Secret key
      { expiresIn: "1h" } // Token expiration time
    );

    // Send the token to the client
    res.status(200).json({ message: "Login successful", token, user: user });
    //  user_id:user.user_id
  });
});

// ------------------------------------Delete client ----------------------------------------------------
app.delete("/api/clients/:id", (req, res) => {
  const { id } = req.params; // Extract id from URL parameters

  // Step 1: Check if the client exists
  const checkClientSql = "SELECT * FROM clients WHERE client_id = ?";

  db.query(checkClientSql, [id], (checkError, checkResults) => {
    if (checkError) {
      console.error('Error checking client existence:', checkError);
      return res.status(500).json({ message: "Failed to check client existence", error: checkError });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Step 2: Delete the client record
    const deleteClientSql = "DELETE FROM clients WHERE client_id = ?";

    db.query(deleteClientSql, [id], (deleteError, deleteResults) => {
      if (deleteError) {
        console.error('Error deleting client:', deleteError);
        return res.status(500).json({ message: "Failed to delete client", error: deleteError });
      }

      if (deleteResults.affectedRows === 0) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.status(200).json({ message: "Client deleted successfully" });
    });
  });
});

// --------------------------------edit client -------------------------------------
app.put("/api/clients/:id", (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone, address } = req.body; // Extract the fields from the request body

  // SQL query to update the client's information
  const updateClientSql = `
    UPDATE clients 
    SET first_name = ?, last_name = ?, phone = ?, address = ? 
    WHERE client_id = ?;
  `;

  // Execute the SQL query
  db.query(updateClientSql, [first_name, last_name, phone, address, id], (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Database query failed", error });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({ message: "Client updated successfully" });
  });
});

//-----------------------------------ข้อมูลลูกเทรน----------------------
app.get("/api/clients", authenticateToken, (req, res) => {
  const { userid } = req.query; // Extract userid from req.query

  if (!userid) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Query to get the trainer_id using the userid
  const getTrainerIdQuery = "SELECT trainer_id FROM trainers WHERE user_id = ?";
  db.query(getTrainerIdQuery, [userid], (err, trainerResults) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Database query failed", error: err });
    }

    if (trainerResults.length === 0) {
      return res
        .status(404)
        .json({ message: "Trainer not found for the given userid" });
    }

    const trainerId = trainerResults[0].trainer_id;

    // Query to get clients for the retrieved trainer_id
    const getClientQuery = "SELECT * FROM clients WHERE trainer_id = ?"; // Corrected query
    db.query(getClientQuery, [trainerId], (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query failed", error: err });
      }

      res.status(200).json(results);
    });
  });
});

//------------------------ ดึง ข้อมูล clients-------------------------
app.get("/api/clients-by-client_id", authenticateToken, (req, res) => {
  // Extract client_id from query parameters
  const clientId = req.query.client_id;

  if (!clientId) {
    return res.status(400).json({ error: "Client ID is required" });
  }

  const query = `
    SELECT 
        client_id,
        trainer_id,
        first_name,
        last_name,
        gender,
        phone,
        address,
        age  -- Include the age field
    FROM clients
    WHERE client_id = ?`;

  // Fetch client details from the database
  db.query(query, [clientId], (error, results) => {
    if (error) {
      console.error("Error fetching client:", error);
      return res.status(500).json({ error: "Failed to fetch client" });
    }

    // If no results, return a 404 error
    if (results.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(results[0]); // Return the first result as there should be only one client
  });
});






 //----------------------------add client-------------------------------
 app.post("/api/clients", authenticateToken, (req, res) => {
  const { first_name, last_name, gender, phone, address, userid } = req.body;

  // Validate the input data
  if (!first_name || !last_name || !gender || !phone || !address || !userid) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Query to get the trainer_id using the userid
  const getTrainerIdQuery = "SELECT trainer_id FROM trainers WHERE user_id = ?";
  db.query(getTrainerIdQuery, [userid], (err, trainerResults) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Database query failed", error: err });
    }

    if (trainerResults.length === 0) {
      return res
        .status(404)
        .json({ message: "Trainer not found for the given user_id" });
    }

    const trainerId = trainerResults[0].trainer_id;

    // Insert the client data along with the trainer_id
    const insertClientQuery =
      "INSERT INTO clients (first_name, last_name, gender, phone, address, trainer_id) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(
      insertClientQuery,
      [first_name, last_name, gender, phone, address, trainerId],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query failed", error: err });
        }

        res.status(201).json({
          message: "Client added successfully",
          clientId: results.insertId,
        });
      }
    );
  });
});
 
//----------------------------------- gold ------------------------------
app.post("/api/goals", authenticateToken, (req, res) => {
  const {
    client_id, // รับ client_id จากคำร้อง
    goal_type,
    bmr,
    tdee,
    bmi,
    weight,
    height,
    waist,
    chest,
    arm,
    leg
  } = req.body;

  const userid = req.user.id; // Assuming user ID is available in req.user from the token

  // Validate the input data
  if (!client_id) {
    return res.status(400).json({ message: "client_id is required" });
  }
  if (!goal_type) {
    return res.status(400).json({ message: "goal_type is required" });
  }

  // Check if the client exists
  const checkClientQuery = "SELECT client_id FROM clients WHERE client_id = ?";
  db.query(checkClientQuery, [client_id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database query failed", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Client not found for the given client_id" });
    }

    // Insert the goal data into the goals table
    const insertGoalQuery = `
      INSERT INTO goals 
      (client_id, goal_type, bmr, tdee, bmi, weight, height, waist, chest, arm, leg) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertGoalQuery,
      [client_id, goal_type, bmr, tdee, bmi, weight, height, waist, chest, arm, leg],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Database query failed", error: err });
        }

        res.status(201).json({
          message: "Goal added successfully",
          goalId: results.insertId,
        });
      }
    );
  });
});







// ==============================admin===================================================
// find all trainer table
app.get("/api/trainers", (req, res) => {
  const sql = `SELECT * FROM trainers`;
  db.query(sql, (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Database query failed", error });
    }
    res.status(200).json(results); // Sending all results
  });
});

app.delete("/api/delete/trainer/:id", (req, res) => {
  const { id } = req.params; // Extract id from URL parameters

  // Step 1: Fetch the associated user_id
  const fetchUserSql = "SELECT user_id FROM trainers WHERE trainer_id = ?";

  db.query(fetchUserSql, [id], (fetchError, fetchResults) => {
    if (fetchError) {
      return res
        .status(500)
        .json({ message: "Failed to fetch user ID", error: fetchError });
    }

    if (fetchResults.length === 0) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    const userId = fetchResults[0].user_id;

    // Step 2: Delete the trainer record
    const deleteTrainerSql = "DELETE FROM trainers WHERE trainer_id = ?";

    db.query(
      deleteTrainerSql,
      [id],
      (deleteTrainerError, deleteTrainerResults) => {
        if (deleteTrainerError) {
          return res
            .status(500)
            .json({
              message: "Failed to delete trainer",
              error: deleteTrainerError,
            });
        }

        if (deleteTrainerResults.affectedRows === 0) {
          return res.status(404).json({ message: "Trainer not found" });
        }

        // Step 3: Delete the associated user record
        const deleteUserSql = "DELETE FROM users WHERE user_id = ?";

        db.query(
          deleteUserSql,
          [userId],
          (deleteUserError, deleteUserResults) => {
            if (deleteUserError) {
              return res
                .status(500)
                .json({
                  message: "Failed to delete associated user",
                  error: deleteUserError,
                });
            }

            res
              .status(200)
              .json({
                message: "Trainer and associated user deleted successfully",
              });
          }
        );
      }
    );
  });
});

//  ==================================================================================

app.listen(port, () => {
  console.log("api เปิดใน port : " + port);
});
