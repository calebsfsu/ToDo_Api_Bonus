const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const port = 3000;

app.use(express.json());

const db = new sqlite3.Database("todos.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the todos SQLite database.");
});

db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    priority TEXT DEFAULT 'medium'
  )
`);

app.get("/todos", (req, res) => {
  const { completed } = req.query;
  let query = "SELECT * FROM todos";
  const params = [];

  if (completed !== undefined) {
    query += " WHERE completed = ?";
    params.push(completed === "true" ? 1 : 0);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

app.post("/todos", (req, res) => {
  const { task, priority = "medium" } = req.body;

  db.run(
    `INSERT INTO todos (task, completed, priority) VALUES (?, 0, ?)`,
    [task, priority],
    function (err) {
      if (err) {
        res.status(500).send(err.message);
        return;
      }
      db.get(`SELECT * FROM todos WHERE id = ?`, [this.lastID], (err, row) => {
        if (err) {
          res.status(500).send(err.message);
          return;
        }
        res.status(201).json(row);
      });
    }
  );
});

app.put("/todos/:id", (req, res) => {
  const { id } = req.params;
  const { task, completed, priority } = req.body;

  db.run(
    `UPDATE todos SET task = COALESCE(?, task), completed = COALESCE(?, completed), priority = COALESCE(?, priority) WHERE id = ?`,
    [task, completed, priority, id],
    function (err) {
      if (err) {
        res.status(500).send(err.message);
        return;
      }
      if (this.changes === 0) {
        res.status(404).send("To-Do item not found");
      } else {
        db.get(`SELECT * FROM todos WHERE id = ?`, [id], (err, row) => {
          if (err) {
            res.status(500).send(err.message);
            return;
          }
          res.json(row);
        });
      }
    }
  );
});

app.put("/todos/complete-all", (req, res) => {
  db.run(`UPDATE todos SET completed = 1`, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ message: "All to-do items marked as completed" });
  });
});

app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM todos WHERE id = ?`, [id], function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    if (this.changes === 0) {
      res.status(404).send("To-Do item not found");
    } else {
      res.status(204).send();
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
