CREATE DATABASE IF NOT EXISTS smart_parking;
USE smart_parking;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_number VARCHAR(10) NOT NULL UNIQUE,
    slot_type ENUM('regular', 'disabled', 'ev') DEFAULT 'regular',
    status ENUM('available', 'occupied') DEFAULT 'available',
    floor INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

-- Sample parking slots
INSERT INTO parking_slots (slot_number, slot_type, floor) VALUES
('A1', 'regular', 1), ('A2', 'regular', 1), ('A3', 'regular', 1),
('A4', 'disabled', 1), ('A5', 'ev', 1),
('B1', 'regular', 2), ('B2', 'regular', 2), ('B3', 'regular', 2),
('B4', 'disabled', 2), ('B5', 'ev', 2);