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

let redirect = false;

const isLoggedIn = async (req, res, next) => {
    if (!req.session || !req.session.user) {
        redirect = true;
        console.log(redirect);
        return res.redirect('/login');
    }
    next();
};


app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/login", async (req, res) => {
    if (redirect) {
        console.log(redirect);
        redirect = false;
        console.log(redirect);
        res.render("login.ejs", { msg: "You need to login before doing this." });
    } else {
        res.render("login.ejs")
    }
});

app.get("/donate", isLoggedIn, (req, res) => {
    res.render("donate.ejs");
});

app.get("/volunteer", isLoggedIn, async (req, res) => {
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

app.get("/poor", isLoggedIn, async (req, res) => {
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

app.get("/delivery", async (req, res) => {
    const user = req.session.user;
    if (user.main_choice == "volunteer") {
        try {

            const deliveryList = await db.query(`
                SELECT * FROM delivery
                WHERE volunteer_id = $1 AND status = false;
            `,
                [user.user_id]
            )
            const deliveryDetails = deliveryList.rows;
            res.render("delivery.ejs", { deliveryDetails });
        } catch (error) {
            console.error("Error fetching delivery details:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(401).json({ error: "You are Not authorized to view this." });
    }

});

app.post("/complete", async (req, res) => {
    const user = req.session.user;
    if (user.main_choice == "volunteer") {
        try {
            const deliveryId = req.body.deliveryId;
            await db.query(`
            UPDATE delivery
            SET status = true
            WHERE id = $1;
        `,
                [deliveryId]
            );
            res.status(200).redirect("/");
        } catch (error) {
            console.error("Error completing delivery:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.status(401).json({ error: "You are not authorized to do this." });
    }
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
        req.session.user = user;
        console.log('User registered successfully:', user.full_name);
        res.redirect('/', { user });
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
            req.session.user = user;
            console.log('User logged in successfully:', user.full_name);
            res.redirect("/");
        } else {
            res.status(500).render("login.ejs", { msg: "Wrong Email or Password!" });
        }
    } catch (error) {
        console.error('Error occurred while logging in:', error);
        res.status(500).json({ error: "An error occurred while logging in" });
    }
});

app.post("/donate", async (req, res) => {
    const user = req.session.user;
    if (user.main_choice == "donor") {
        const userName = user.full_name;
        const userAddress = user.address;
        const userContact = user.phone;

        const { foodName, quantity } = req.body;

        try {
            const foodItems = [];
            for (let i = 0; i < foodName.length; i++) {
                foodItems.push({ name: foodName[i], quantity: quantity[i] });
            }

            const query = `
            INSERT INTO food_donations (name, address, food_details, contact)
            VALUES ($1, $2, $3, $4)
        `;
            const values = [userName, userAddress, JSON.stringify(foodItems), userContact];
            await db.query(query, values);

            console.log('Donation inserted successfully');
            res.redirect("/");
        } catch (error) {
            console.error('Error inserting donation:', error);
            res.status(500).json({ error: "An error occurred while submitting the donation" });
        }
    } else {
        res.status(401).render("index.ejs", { msg: "You are not authorized to donate food." });
    }
});

app.post("/accept", async (req, res) => {
    const { donationId } = req.body;
    const user = req.session.user;
    if (user.main_choice == "receiver") {
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


            const pickupAddress = donationResult.rows[0].address;

            const insertQuery = `
            INSERT INTO jobs (pickup_address, delivery_address, item_count)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

            const values = [pickupAddress, deliveryAddress, food_details.length];
            const jobResult = await db.query(insertQuery, values);

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
    } else {
        res.status(401).render("index.ejs", { msg: "You are not authorized to ask for food." });
    }
});

app.get("/accept/:jobId", async (req, res) => {
    const user = req.session.user;
    const jobId = req.params.jobId;

    if (user.main_choice == "volunteer") {

        try {

            const getDeliveryDetails = await db.query(`
            SELECT * FROM jobs
            WHERE id = $1;
        `,
                [jobId]
            );

            const setDelivery = await db.query(`
            INSERT INTO delivery (volunteer_id, pickup_address, delivery_address)
            VALUES
                ($1, $2, $3)
        `,
                [user.user_id, getDeliveryDetails.rows[0].pickup_address, getDeliveryDetails.rows[0].delivery_address]
            );

            const deleteQuery = `
                DELETE FROM jobs
                WHERE id = $1
            `;
            await db.query(deleteQuery, [jobId]);
            res.redirect("/delivery");
        } catch (error) {
            console.error("Error accepting job:", error);
            res.status(500).json({ error: "Internal server error" });
        }

        console.log("accepted");

    } else {
        res.status(401).render("index.ejs", { msg: "You are not authorized to accept food orders." });
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
