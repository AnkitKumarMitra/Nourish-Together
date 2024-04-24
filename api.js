import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "NourishTogether",
    password: "ankit",
    port: 5433,
});

db.connect();

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
            SELECT * FROM users
            WHERE email = $1 AND password = $2;
        `;
        const result = await db.query(query, [email, password]);

        if (result.rows.length === 1) {
            res.status(200).json({ message: "Login successful" });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "An error occurred while logging in" });
    }
});

app.post("/register", async (req, res) => {
    const { fullName, age, address, email, phone, password, mainChoice } = req.body;
    console.log(req.params);
    try {
        const query = `
            INSERT INTO users (full_name, age, address, email, phone, password, main_choice)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const result = await db.query(query, [fullName, age, address, email, phone, password, mainChoice]);

        res.json({ message: "Registration Succeful" });
    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ error: "Email already exists" });
        } else {
            console.error("Error occurred:", error);
            res.status(500).json({ error: "An error occurred while registering" });
        }
    }
});

app.get("/users", async (req, res) => {
    try {
        const query = `
            SELECT * FROM users;
        `;
        const result = await db.query(query);

        res.json(result.rows);
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "An error occurred while fetching user details" });
    }
});

app.post("/submit-donation", async (req, res) => {
    const { name, address, foodName, quantity, contact } = req.body;

    try {
        const foodDetails = [];
        for (let i = 0; i < foodName.length; i++) {
            foodDetails.push({ name: foodName[i], quantity: quantity[i] });
        }

        const query = `
            INSERT INTO food_donations (name, address, food_details, contact)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await db.query(query, [name, address, JSON.stringify(foodDetails), contact]);

        res.json({ message: "Donation Made" });
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "An error occurred while submitting the donation" });
    }
});

app.get("/food-details", async (req, res) => {
    try {
        const query = `
            SELECT name, address, food_details, contact
            FROM food_donations;
        `;
        const result = await db.query(query);

        res.json(result.rows);
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).send("An error occurred while fetching food details");
    }
});

app.listen(port, () => {
    console.log(`API started at port ${port}`);
});