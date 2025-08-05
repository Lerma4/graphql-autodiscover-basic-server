-- Script per inizializzare il database
-- Eseguire questo script nel database MySQL per creare la tabella users

USE test;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserimento di alcuni dati di esempio
INSERT INTO users (name, email) VALUES 
('Mario Rossi', 'mario.rossi@email.com'),
('Giulia Bianchi', 'giulia.bianchi@email.com'),
('Luca Verdi', 'luca.verdi@email.com')
ON DUPLICATE KEY UPDATE name=VALUES(name);

SELECT 'Database inizializzato con successo!' as message;