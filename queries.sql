CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(100) NOT NULL,
    main_choice VARCHAR(20) NOT NULL
);

CREATE TABLE food_donations (
    donation_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    food_details JSONB NOT NULL,
    contact VARCHAR(20) NOT NULL
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    pickup_address VARCHAR(255) NOT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    item_count INTEGER NOT NULL
);

SELECT * FROM users;
