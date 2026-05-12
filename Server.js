const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Database setup
const db = new sqlite3.Database("./hospital.db");

// Create tables
db.serialize(() => {
  // Patients table
  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      doctor TEXT NOT NULL,
      surgery TEXT,
      status TEXT DEFAULT 'In OT',
      condition_update TEXT,
      priority INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_published BOOLEAN DEFAULT 0
    )
  `);

  // Audit log table
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      patient_id INTEGER,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Socket.io connections
io.on("connection", (socket) => {
  console.log("New client connected");

  // Send initial data to TV
  socket.on("request-live-data", () => {
    getPublishedPatients((patients) => {
      socket.emit("live-data-update", patients);
    });
  });

  // Admin sends publish update
  socket.on("publish-update", (data) => {
    publishPatientsToLive(data.patients, () => {
      // Broadcast to all connected TV screens using fresh DB state
      getPublishedPatients((patients) => {
        io.emit("live-data-update", patients);
        socket.emit("publish-success", { message: "Published successfully!" });
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Database helper functions
function getPublishedPatients(callback) {
  db.all(
    "SELECT * FROM patients WHERE is_published = 1 ORDER BY priority DESC, created_at ASC",
    (err, rows) => {
      if (err) {
        console.error(err);
        callback([]);
      } else {
        callback(rows || []);
      }
    },
  );
}

function publishPatientsToLive(patients, callback) {
  // First, unpublish all patients
  db.run("UPDATE patients SET is_published = 0", (err) => {
    if (err) {
      console.error(err);
      callback();
      return;
    }

    // Then publish the selected patients
    let completed = 0;
    if (patients.length === 0) {
      callback();
      return;
    }

    patients.forEach((patient) => {
      db.run(
        `UPDATE patients SET 
          is_published = 1, 
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [patient.id],
        (err) => {
          if (err) console.error(err);
          completed++;
          if (completed === patients.length) {
            // Log the publish action
            db.run("INSERT INTO audit_log (action, details) VALUES (?, ?)", [
              "PUBLISH_ALL",
              `Published ${patients.length} patients`,
            ]);
            callback();
          }
        },
      );
    });
  });
}

// API Routes for Admin
app.get("/api/patients", (req, res) => {
  db.all("SELECT * FROM patients ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows || []);
    }
  });
});

app.post("/api/patients", (req, res) => {
  const {
    name,
    location,
    doctor,
    surgery,
    status,
    condition_update,
    priority,
  } = req.body;

  db.run(
    `INSERT INTO patients (name, location, doctor, surgery, status, condition_update, priority, is_published) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [name, location, doctor, surgery, status, condition_update, priority],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        db.run(
          "INSERT INTO audit_log (action, patient_id, details) VALUES (?, ?, ?)",
          ["CREATE", this.lastID, `Added patient: ${name}`],
        );
        res.json({ id: this.lastID, message: "Patient added successfully" });
      }
    },
  );
});

app.put("/api/patients/:id", (req, res) => {
  const {
    name,
    location,
    doctor,
    surgery,
    status,
    condition_update,
    priority,
  } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE patients SET 
      name = ?, location = ?, doctor = ?, surgery = ?, 
      status = ?, condition_update = ?, priority = ?, 
      updated_at = CURRENT_TIMESTAMP, is_published = 0
     WHERE id = ?`,
    [name, location, doctor, surgery, status, condition_update, priority, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        db.run(
          "INSERT INTO audit_log (action, patient_id, details) VALUES (?, ?, ?)",
          ["UPDATE", id, `Updated patient: ${name}`],
        );
        res.json({ message: "Patient updated successfully" });
      }
    },
  );
});

app.delete("/api/patients/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM patients WHERE id = ?", id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      db.run(
        "INSERT INTO audit_log (action, patient_id, details) VALUES (?, ?, ?)",
        ["DELETE", id, "Deleted patient"],
      );
      res.json({ message: "Patient deleted successfully" });
    }
  });
});

app.get("/api/audit-log", (req, res) => {
  db.all(
    "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows || []);
      }
    },
  );
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin Panel: http://localhost:${PORT}`);
  console.log(`TV Display: http://localhost:${PORT}/tv.html`);
});
