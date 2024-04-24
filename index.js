import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "NourishTogether",
    password: "ankit",
    port: 5433,
});

db.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Error connecting to the database', err));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});


app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/donate", (req, res) => {
    res.render("donate.ejs");
});

app.get("/volunteer", async (req, res) => {
    try {
        const query = `
            SELECT * FROM jobs;
        `;
        const result = await db.query(query);

        res.render("volunteer.ejs", { jobs: result.rows });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: "An error occurred while fetching jobs" });
    }
});

app.get("/poor", async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM food_donations");
        rows.forEach(row => {
            console.log(row.food_details);
        });

        res.render("poor.ejs", { foodDonations: rows });
    } catch (error) {
        console.error('Error fetching food donations:', error);
        res.status(500).json({ error: "An error occurred while fetching food donations" });
    }
});

app.get("/faq", (req, res) => {
    res.render("faq.ejs");
});

app.get("/contact", (req, res) => {
    res.render("contact.ejs");
});

app.post('/register', async (req, res) => {
    const { fullName, age, address, email, phone, password, mainChoice } = req.body;
    try {
        const query = `
            INSERT INTO users (full_name, age, address, email, phone, password, main_choice)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING full_name
        `;
        const values = [fullName, age, address, email, phone, password, mainChoice];
        const result = await db.query(query, values);
        const user = result.rows[0];
        req.session.userId = user.user_id;
        req.session.user = user;
        console.log('User registered successfully:', user.full_name);
        res.redirect('/');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
            SELECT * FROM users
            WHERE email = $1 AND password = $2;
        `;
        const result = await db.query(query, [email, password]);

        if (result.rows.length === 1) {
            const user = result.rows[0];
            req.session.userId = user.user_id;
            req.session.user = user;
            console.log('User logged in successfully:', user.full_name);
            res.redirect("/");
        } else {
            res.status(500).json({ error: "Wrong Email or Password!" });
        }
    } catch (error) {
        console.error('Error occurred while logging in:', error);
        res.status(500).json({ error: "An error occurred while logging in" });
    }
});

app.post("/donate", async (req, res) => {
    const { name, address, foodName, quantity, contact } = req.body;

    try {
        const foodItems = [];
        for (let i = 0; i < foodName.length; i++) {
            foodItems.push({ name: foodName[i], quantity: quantity[i] });
        }

        const query = `
            INSERT INTO food_donations (name, address, food_details, contact)
            VALUES ($1, $2, $3, $4)
        `;
        const values = [name, address, JSON.stringify(foodItems), contact];
        await db.query(query, values);

        console.log('Donation inserted successfully');
        res.redirect("/");
    } catch (error) {
        console.error('Error inserting donation:', error);
        res.status(500).json({ error: "An error occurred while submitting the donation" });
    }
});

app.post("/accept", async (req, res) => {
    const { donationId } = req.body;
    const userId = req.session.userId;
    const deliveryAddress = req.session.user.address;
    

    try {
        const donationQuery = `
            SELECT * FROM food_donations
            WHERE donation_id = $1
        `;
        const donationResult = await db.query(donationQuery, [donationId]);

        if (donationResult.rows.length === 0) {
            return res.status(404).json({ error: "Food donation not found" });
        }

        const donation = donationResult.rows[0];
        const { name, food_details, contact } = donation;

        const userQuery = `
            SELECT address FROM users
            WHERE user_id = $1
        `;

        const pickupAddress = donationResult.rows[0].address;

        const insertQuery = `
            INSERT INTO jobs (pickup_address, delivery_address, item_count)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        const values = [pickupAddress, deliveryAddress, food_details.length];
        const jobResult = await db.query(insertQuery, values);
        const jobId = jobResult.rows[0].id;

        const deleteQuery = `
            DELETE FROM food_donations
            WHERE donation_id = $1
        `;
        await db.query(deleteQuery, [donationId]);

        res.status(200).redirect("/");
    } catch (error) {
        console.error("Error accepting food donation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/accept/:jobId", async (req, res) => {
    const jobId = req.params.jobId;

    try {
        const deleteQuery = `
            DELETE FROM jobs
            WHERE id = $1
        `;
        await db.query(deleteQuery, [jobId]);
        res.redirect("/");
    } catch (error) {
        console.error("Error accepting job:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/reject/:jobId", async (req, res) => {
    const jobId = req.params.jobId;
    const userId = req.session.userId;

    try {
        const deleteQuery = `
            DELETE FROM jobs
            WHERE id = $1 AND user_id = $2
        `;
        await db.query(deleteQuery, [jobId, userId]);
        res.redirect("/volunteer.ejs");
    } catch (error) {
        console.error("Error rejecting job:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ error: "An error occurred while logging out" });
        } else {
            console.log('User logged out successfully');
            res.redirect('/');
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
