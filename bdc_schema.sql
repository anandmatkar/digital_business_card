CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

CREATE TABLE public.super_admin (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(80),
    password VARCHAR(100),
    avatar TEXT,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);

ALTER TABLE public.super_admin OWNER TO postgres;

CREATE TABLE public.company (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    company_name VARCHAR(50) NOT NULL,
    company_email VARCHAR(80) NOT NULL,
    description TEXT,
    company_address VARCHAR(255),
    company_logo TEXT,
    company_contact_number VARCHAR(20),
    company_website VARCHAR(100),
    status VARCHAR(20) DEFAULT 'activated', --activated, deactivated
    max_cards INT,
    used_cards INT
    contact_person_name VARCHAR(100),
    contact_person_designation VARCHAR(100),
    contact_person_email VARCHAR(80),
    contact_person_mobile VARCHAR(20),
    location TEXT,
    latitude VARCHAR(25),
    longitude VARCHAR(25),
    admin_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);


ALTER TABLE public.company OWNER TO postgres;

CREATE TABLE public.company_admin (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(80),
    password VARCHAR(100),
    phone_number VARCHAR(30),
    mobile_number varchar(30),
    company_id uuid REFERENCES company(id),
    company_name VARCHAR(50) NOT NULL,
    created_by uuid NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active boolean DEFAULT true,
    avatar TEXT,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);

ALTER TABLE public.company_admin OWNER TO postgres;

CREATE TABLE public.digital_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    company_id uuid REFERENCES company(id),
    created_by uuid NOT NULL,
    card_reference VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    user_email VARCHAR(80),
    designation VARCHAR(50),
    bio TEXT,
    qr_url TEXT,
    user_type VARCHAR(50), --user
    cover_pic TEXT,
    profile_picture TEXT,
    is_active_for_qr BOOLEAN DEFAULT false,
    is_deactivated BOOLEAN DEFAULT false,
    card_url TEXT,--www.card.com/companyName/cardNumber
    vcf_card_url TEXT,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);

ALTER TABLE public.digital_cards OWNER TO postgres;

CREATE TABLE public.user_media_link (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    instagram TEXT,
    facebook TEXT,
    linkedin TEXT,
    twitter TEXT,
    telegram  TEXT,
    whatsapp TEXT,
    youtube TEXT,
    tiktok TEXT,
    snap_chat TEXT,
    threads TEXT,
    line TEXT,
    we_chat TEXT,
    extra_link_title TEXT,
    extra_link_url TEXT,
    company_id  UUID REFERENCES company(id),
    digital_card_id UUID REFERENCES digital_cards(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);

ALTER TABLE public.super_admin OWNER TO postgres;

CREATE TABLE public.company_address (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    company_address VARCHAR(250),
    company_id uuid REFERENCES company(id),
    address_url TEXT,
    company_admin uuid REFERENCES company_admin(id),
    default_address BOOLEAN DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);

CREATE TABLE public.company_address_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    company_id uuid REFERENCES company(id),
    company_admin uuid REFERENCES company_admin(id),
    company_name VARCHAR(250),
    company_address VARCHAR(250),
    description TEXT,
    company_contact_number VARCHAR(20),
    company_website VARCHAR(100),
    default_address BOOLEAN DEFAULT false,
    location TEXT,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, NULL::timestamp with time zone)
);
