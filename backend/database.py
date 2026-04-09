import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sample.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def seed_db():
    """Create and populate sample database with e-commerce schema."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.executescript("""
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS categories;

        CREATE TABLE categories (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            slug    TEXT NOT NULL UNIQUE
        );

        CREATE TABLE products (
            id          INTEGER PRIMARY KEY,
            name        TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id),
            price       REAL NOT NULL,
            stock       INTEGER DEFAULT 0,
            rating      REAL DEFAULT 0,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE customers (
            id         INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            email      TEXT NOT NULL UNIQUE,
            city       TEXT,
            country    TEXT DEFAULT 'India',
            joined_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            status      TEXT CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
            total       REAL NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE order_items (
            id         INTEGER PRIMARY KEY,
            order_id   INTEGER REFERENCES orders(id),
            product_id INTEGER REFERENCES products(id),
            quantity   INTEGER NOT NULL,
            unit_price REAL NOT NULL
        );
    """)

    c.executemany("INSERT INTO categories(name,slug) VALUES(?,?)", [
        ("Electronics",    "electronics"),
        ("Clothing",       "clothing"),
        ("Books",          "books"),
        ("Home & Kitchen", "home-kitchen"),
        ("Sports",         "sports"),
    ])

    c.executemany("INSERT INTO products(name,category_id,price,stock,rating) VALUES(?,?,?,?,?)", [
        ("iPhone 15 Pro",        1, 134900, 45,  4.8),
        ("Samsung Galaxy S24",   1,  79999, 62,  4.6),
        ("Sony WH-1000XM5",      1,  26990, 120, 4.9),
        ("MacBook Air M3",       1, 114900, 28,  4.9),
        ("OnePlus Nord 4",       1,  29999, 87,  4.3),
        ("Levi's 501 Jeans",     2,   3999, 200, 4.2),
        ("Nike Air Max 270",     2,   9995, 150, 4.5),
        ("Zara Formal Shirt",    2,   2490, 300, 4.1),
        ("Allen Solly Chinos",   2,   2999, 180, 4.0),
        ("Atomic Habits",        3,    399, 500, 4.9),
        ("The Alchemist",        3,    299, 420, 4.7),
        ("Deep Work",            3,    449, 380, 4.8),
        ("Instant Pot Duo",      4,   8499, 95,  4.6),
        ("Philips Air Fryer",    4,   6999, 110, 4.5),
        ("Yoga Mat Premium",     5,   1299, 250, 4.3),
        ("Dumbbells 10kg Pair",  5,   2199, 85,  4.4),
    ])

    c.executemany("INSERT INTO customers(name,email,city,country) VALUES(?,?,?,?)", [
        ("Harsh Upadhyay", "harsh@example.com",  "Agra",      "India"),
        ("Priya Sharma",   "priya@example.com",  "Mumbai",    "India"),
        ("Rahul Verma",    "rahul@example.com",  "Delhi",     "India"),
        ("Sneha Patel",    "sneha@example.com",  "Ahmedabad", "India"),
        ("Arjun Mehta",    "arjun@example.com",  "Bangalore", "India"),
        ("Kavya Nair",     "kavya@example.com",  "Kochi",     "India"),
        ("Vikram Singh",   "vikram@example.com", "Jaipur",    "India"),
        ("Ananya Roy",     "ananya@example.com", "Kolkata",   "India"),
        ("Rohan Das",      "rohan@example.com",  "Pune",      "India"),
        ("Divya Iyer",     "divya@example.com",  "Chennai",   "India"),
    ])

    orders_data = [
        (1,  "delivered",  148898.0, "2024-01-15"),
        (2,  "delivered",   26990.0, "2024-01-20"),
        (3,  "shipped",      9994.0, "2024-02-01"),
        (4,  "delivered",   79999.0, "2024-02-10"),
        (5,  "processing",  38498.0, "2024-02-18"),
        (6,  "delivered",    1497.0, "2024-03-05"),
        (7,  "cancelled",   29999.0, "2024-03-12"),
        (8,  "delivered",   15492.0, "2024-03-20"),
        (9,  "pending",     14996.0, "2024-04-01"),
        (10, "delivered",    6999.0, "2024-04-08"),
        (1,  "shipped",    114900.0, "2024-04-15"),
        (3,  "delivered",    3497.0, "2024-04-22"),
        (5,  "delivered",    2199.0, "2024-05-03"),
        (2,  "delivered",   29999.0, "2024-05-10"),
        (4,  "processing",   8796.0, "2024-05-18"),
    ]
    for o in orders_data:
        c.execute("INSERT INTO orders(customer_id,status,total,created_at) VALUES(?,?,?,?)", o)

    order_items_data = [
        (1,  1,  1, 134900.0),
        (1,  4,  1, 114900.0),
        (2,  3,  1,  26990.0),
        (3,  7,  1,   9995.0),
        (4,  2,  1,  79999.0),
        (5,  1,  1, 134900.0),
        (6,  10, 3,    399.0),
        (6,  11, 1,    299.0),
        (6,  12, 2,    449.0),
        (7,  5,  1,  29999.0),
        (8,  6,  1,   3999.0),
        (8,  9,  1,   2999.0),
        (8,  15, 2,   1299.0),
        (9,  13, 1,   8499.0),
        (9,  14, 1,   6999.0),
        (10, 14, 1,   6999.0),
        (11, 4,  1, 114900.0),
        (12, 10, 3,    399.0),
        (12, 11, 2,    299.0),
        (13, 16, 1,   2199.0),
        (14, 5,  1,  29999.0),
        (15, 15, 2,   1299.0),
        (15, 16, 1,   2199.0),
    ]
    c.executemany(
        "INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(?,?,?,?)",
        order_items_data
    )

    conn.commit()
    conn.close()
    print(f"✅ Sample DB seeded at {DB_PATH}")


def get_schema():
    return """
DATABASE SCHEMA (SQLite):

TABLE: categories
  id        INTEGER PRIMARY KEY
  name      TEXT           -- e.g. 'Electronics', 'Clothing', 'Books'
  slug      TEXT UNIQUE

TABLE: products
  id          INTEGER PRIMARY KEY
  name        TEXT
  category_id INTEGER  → categories.id
  price       REAL     -- in INR
  stock       INTEGER
  rating      REAL     -- 0.0 to 5.0
  created_at  TEXT

TABLE: customers
  id        INTEGER PRIMARY KEY
  name      TEXT
  email     TEXT UNIQUE
  city      TEXT
  country   TEXT
  joined_at TEXT

TABLE: orders
  id          INTEGER PRIMARY KEY
  customer_id INTEGER  → customers.id
  status      TEXT     -- 'pending','processing','shipped','delivered','cancelled'
  total       REAL     -- in INR
  created_at  TEXT

TABLE: order_items
  id         INTEGER PRIMARY KEY
  order_id   INTEGER  → orders.id
  product_id INTEGER  → products.id
  quantity   INTEGER
  unit_price REAL
""".strip()


def extract_schema_from_db(db_path: str) -> str:
    """Dynamically extract schema from any SQLite database file."""
    conn = sqlite3.connect(db_path)
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]

    schema_parts = ["DATABASE SCHEMA (SQLite):\n"]
    for table in tables:
        cur = conn.execute(f"PRAGMA table_info([{table}])")
        columns = cur.fetchall()
        schema_parts.append(f"TABLE: {table}")
        for col in columns:
            col_id, name, col_type, not_null, default, pk = col
            pk_str  = " PRIMARY KEY" if pk else ""
            null_str = " NOT NULL" if not_null else ""
            schema_parts.append(f"  {name}  {col_type}{pk_str}{null_str}")
        schema_parts.append("")

    # Also extract foreign key relationships
    for table in tables:
        cur = conn.execute(f"PRAGMA foreign_key_list([{table}])")
        fks = cur.fetchall()
        for fk in fks:
            schema_parts.append(f"  -- FK: {table}.{fk[3]} → {fk[2]}.{fk[4]}")

    conn.close()
    return "\n".join(schema_parts)


if __name__ == "__main__":
    seed_db()