-- Audience Acuity Data Storage Schema for D1
-- Primary key: phone number, isolated by workspace_id

-- Main identities table
CREATE TABLE identities (
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    identity_id INTEGER,
    first_name TEXT,
    last_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    zip4 TEXT,
    county_name TEXT,
    latitude REAL,
    longitude REAL,
    gender TEXT,
    birth_date TEXT,
    address_id INTEGER,
    household_id INTEGER,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    validated BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_response TEXT, -- Store full JSON response
    PRIMARY KEY (phone, workspace_id)
);

-- Phone numbers associated with identity
CREATE TABLE identity_phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    associated_phone TEXT,
    carrier TEXT,
    phone_type INTEGER,
    added_date TEXT,
    update_date TEXT,
    last_seen_date TEXT,
    rank_order INTEGER,
    quality_level INTEGER,
    activity_status TEXT,
    contactability_score TEXT,
    FOREIGN KEY (phone, workspace_id) REFERENCES identities(phone, workspace_id)
);

-- Demographic and financial data
CREATE TABLE identity_data (
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    address_type TEXT,
    income_level TEXT,
    credit_range TEXT,
    household_income TEXT,
    home_ownership TEXT,
    home_price INTEGER,
    home_value INTEGER,
    occupation_category TEXT,
    marital_status TEXT,
    home_furnishing BOOLEAN,
    home_improvement BOOLEAN,
    discretionary_income TEXT,
    PRIMARY KEY (phone, workspace_id),
    FOREIGN KEY (phone, workspace_id) REFERENCES identities(phone, workspace_id)
);

-- Devices associated with identity
CREATE TABLE identity_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    device_id TEXT,
    os TEXT,
    FOREIGN KEY (phone, workspace_id) REFERENCES identities(phone, workspace_id)
);

-- Behavioral data (IAB categories)
CREATE TABLE identity_behaviors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    iab_category INTEGER,
    recency INTEGER,
    FOREIGN KEY (phone, workspace_id) REFERENCES identities(phone, workspace_id)
);

-- Property records
CREATE TABLE identity_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    property_id INTEGER,
    property_address_id INTEGER,
    property_address TEXT,
    property_city TEXT,
    property_state TEXT,
    property_zip TEXT,
    consumer_owned BOOLEAN,
    owner_occupied BOOLEAN,
    property_type TEXT,
    property_value INTEGER,
    improvement_value INTEGER,
    assessed_value INTEGER,
    year_built INTEGER,
    year_built_range TEXT,
    building_sqft INTEGER,
    rooms TEXT,
    bedrooms TEXT,
    tax_year INTEGER,
    recorded_date TEXT,
    sale_date TEXT,
    sale_amount INTEGER,
    estimated_value INTEGER,
    loan_amount INTEGER,
    loan_date TEXT,
    mortgage_type TEXT,
    FOREIGN KEY (phone, workspace_id) REFERENCES identities(phone, workspace_id)
);

-- Workspace management
CREATE TABLE workspaces (
    workspace_id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    api_key_id TEXT,
    owner TEXT
);

-- Indexes for performance
CREATE INDEX idx_identities_workspace ON identities(workspace_id);
CREATE INDEX idx_identities_name ON identities(first_name, last_name);
CREATE INDEX idx_identities_location ON identities(city, state);
CREATE INDEX idx_phones_workspace ON identity_phones(workspace_id);
CREATE INDEX idx_data_workspace ON identity_data(workspace_id);
CREATE INDEX idx_devices_workspace ON identity_devices(workspace_id);
CREATE INDEX idx_behaviors_workspace ON identity_behaviors(workspace_id);
CREATE INDEX idx_properties_workspace ON identity_properties(workspace_id);