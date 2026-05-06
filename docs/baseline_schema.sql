--
-- PostgreSQL database dump
--

\restrict EXaf7vyYZCrMQu1dlz2gQts6Uqh2rQn4tVWPc5XHVvxeimkxIHJeaAwwZ5DKcAo

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: approvalstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approvalstatus AS ENUM (
    'pending',
    'approved',
    'rejected',
    'ungated'
);


--
-- Name: expensetypeenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expensetypeenum AS ENUM (
    'fixed',
    'variable',
    'one_time'
);


--
-- Name: huntstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.huntstatus AS ENUM (
    'lead',
    'sourced',
    'approved',
    'ordered',
    'received',
    'listed'
);


--
-- Name: invoicestatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoicestatusenum AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled'
);


--
-- Name: periodtypeenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.periodtypeenum AS ENUM (
    'monthly',
    'quarterly',
    'annual'
);


--
-- Name: postatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.postatus AS ENUM (
    'draft',
    'submitted',
    'confirmed',
    'shipped',
    'received',
    'invoiced'
);


--
-- Name: statusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statusenum AS ENUM (
    'draft',
    'reviewed',
    'approved',
    'finalized'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_health_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_health_snapshots (
    id integer NOT NULL,
    org_id integer NOT NULL,
    account_id integer,
    health_score double precision,
    odr_rate double precision,
    late_shipment_rate double precision,
    valid_tracking_rate double precision,
    policy_violations_count integer,
    ip_complaints_count integer,
    listing_violations_count integer,
    stranded_inventory_count integer,
    risk_level character varying(20),
    snapshot_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: account_health_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_health_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_health_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_health_snapshots_id_seq OWNED BY public.account_health_snapshots.id;


--
-- Name: account_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_violations (
    id integer NOT NULL,
    org_id integer NOT NULL,
    violation_type character varying(100) NOT NULL,
    severity character varying(20),
    status character varying(20),
    description text,
    asin character varying(20),
    action_required text,
    deadline timestamp without time zone,
    appeal_notes text,
    resolved_date timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: account_violations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_violations_id_seq OWNED BY public.account_violations.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(100) NOT NULL,
    detail text,
    created_at timestamp without time zone
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    insight_type character varying NOT NULL,
    title character varying NOT NULL,
    description character varying NOT NULL,
    impact_level character varying,
    recommended_action character varying NOT NULL,
    is_read boolean,
    is_acted boolean,
    data json,
    created_at timestamp without time zone
);


--
-- Name: ai_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_insights_id_seq OWNED BY public.ai_insights.id;


--
-- Name: amazon_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amazon_credentials (
    id integer NOT NULL,
    org_id integer NOT NULL,
    credential_type character varying(50) NOT NULL,
    seller_id character varying(100),
    marketplace_id character varying(50),
    client_id character varying(200),
    client_secret text,
    refresh_token text,
    access_token text,
    token_expires_at timestamp without time zone,
    profile_id character varying(100),
    is_active boolean,
    last_sync_at timestamp without time zone,
    sync_status character varying(50),
    sync_error text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: amazon_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amazon_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amazon_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amazon_credentials_id_seq OWNED BY public.amazon_credentials.id;


--
-- Name: amazon_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amazon_sync_logs (
    id integer NOT NULL,
    org_id integer NOT NULL,
    sync_type character varying(50) NOT NULL,
    status character varying(30),
    records_synced integer,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: amazon_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amazon_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amazon_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amazon_sync_logs_id_seq OWNED BY public.amazon_sync_logs.id;


--
-- Name: anomaly_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anomaly_detection (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    metric_name character varying NOT NULL,
    detected_at timestamp without time zone,
    expected_value double precision NOT NULL,
    actual_value double precision NOT NULL,
    deviation_pct double precision NOT NULL,
    severity character varying,
    is_acknowledged boolean,
    notes character varying
);


--
-- Name: anomaly_detection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.anomaly_detection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: anomaly_detection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.anomaly_detection_id_seq OWNED BY public.anomaly_detection.id;


--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_logs (
    id integer NOT NULL,
    rule_id integer NOT NULL,
    org_id integer NOT NULL,
    status character varying(20) NOT NULL,
    message text,
    recipients_count integer,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: automation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automation_logs_id_seq OWNED BY public.automation_logs.id;


--
-- Name: automation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_rules (
    id integer NOT NULL,
    org_id integer NOT NULL,
    created_by integer NOT NULL,
    rule_type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean,
    schedule_cron character varying(100) NOT NULL,
    recipients text NOT NULL,
    config text NOT NULL,
    last_run_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: automation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automation_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automation_rules_id_seq OWNED BY public.automation_rules.id;


--
-- Name: benchmark_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benchmark_data (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    metric_name character varying NOT NULL,
    period character varying NOT NULL,
    value double precision NOT NULL,
    category_avg double precision,
    percentile_rank double precision,
    created_at timestamp without time zone
);


--
-- Name: benchmark_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.benchmark_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: benchmark_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.benchmark_data_id_seq OWNED BY public.benchmark_data.id;


--
-- Name: brand_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_approvals (
    id integer NOT NULL,
    org_id integer NOT NULL,
    brand_name character varying(255) NOT NULL,
    category character varying(255),
    account_id integer,
    status character varying(20),
    priority character varying(10),
    notes text,
    documents_required integer,
    documents_submitted integer,
    submitted_date timestamp without time zone,
    resolved_date timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: brand_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brand_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brand_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brand_approvals_id_seq OWNED BY public.brand_approvals.id;


--
-- Name: brand_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_documents (
    id integer NOT NULL,
    approval_id integer NOT NULL,
    document_name character varying(255) NOT NULL,
    document_type character varying(50) NOT NULL,
    is_submitted boolean,
    is_verified boolean,
    notes text,
    created_at timestamp without time zone
);


--
-- Name: brand_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brand_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brand_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brand_documents_id_seq OWNED BY public.brand_documents.id;


--
-- Name: brand_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_timeline (
    id integer NOT NULL,
    approval_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    description text NOT NULL,
    created_by character varying(200),
    created_at timestamp without time zone
);


--
-- Name: brand_timeline_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brand_timeline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brand_timeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brand_timeline_id_seq OWNED BY public.brand_timeline.id;


--
-- Name: buybox_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buybox_alerts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    tracker_id integer,
    asin character varying(20) NOT NULL,
    product_title character varying(500),
    alert_type character varying(50) NOT NULL,
    severity character varying(20),
    message text,
    is_read boolean,
    created_at timestamp without time zone
);


--
-- Name: buybox_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buybox_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buybox_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buybox_alerts_id_seq OWNED BY public.buybox_alerts.id;


--
-- Name: buybox_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buybox_history (
    id integer NOT NULL,
    tracker_id integer NOT NULL,
    buy_box_price double precision NOT NULL,
    buy_box_winner character varying(255) NOT NULL,
    our_price double precision NOT NULL,
    competitor_count integer,
    is_winning boolean,
    recorded_at timestamp without time zone
);


--
-- Name: buybox_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buybox_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buybox_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buybox_history_id_seq OWNED BY public.buybox_history.id;


--
-- Name: buybox_trackers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buybox_trackers (
    id integer NOT NULL,
    org_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    product_title character varying(500),
    our_price double precision,
    buy_box_price double precision,
    buy_box_winner character varying(255),
    win_rate_pct double precision,
    is_suppressed boolean,
    competitor_count integer,
    last_checked timestamp without time zone,
    is_active boolean,
    created_at timestamp without time zone
);


--
-- Name: buybox_trackers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buybox_trackers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buybox_trackers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buybox_trackers_id_seq OWNED BY public.buybox_trackers.id;


--
-- Name: campaign_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_structures (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    parent_asin character varying NOT NULL,
    structure_name character varying NOT NULL,
    auto_campaign json,
    exact_campaign json,
    phrase_campaign json,
    broad_campaign json,
    negative_exact_list json,
    status character varying,
    created_at timestamp without time zone
);


--
-- Name: campaign_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_structures_id_seq OWNED BY public.campaign_structures.id;


--
-- Name: cash_flow_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_flow_projections (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    projected_revenue numeric(12,2),
    projected_expenses numeric(12,2),
    projected_profit numeric(12,2),
    actual_revenue numeric(12,2),
    actual_expenses numeric(12,2),
    actual_profit numeric(12,2),
    variance_pct double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: cash_flow_projections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_flow_projections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_flow_projections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_flow_projections_id_seq OWNED BY public.cash_flow_projections.id;


--
-- Name: client_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_messages (
    id integer NOT NULL,
    client_portal_user_id integer NOT NULL,
    org_id integer NOT NULL,
    subject character varying(500),
    message text,
    sender_type character varying(10),
    is_read boolean,
    created_at timestamp without time zone
);


--
-- Name: client_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_messages_id_seq OWNED BY public.client_messages.id;


--
-- Name: client_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_notes (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    author_id integer NOT NULL,
    note_type character varying(50) NOT NULL,
    content text NOT NULL,
    is_pinned boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: client_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_notes_id_seq OWNED BY public.client_notes.id;


--
-- Name: client_pnl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_pnl (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    logged_by integer NOT NULL,
    month character varying(7) NOT NULL,
    year integer NOT NULL,
    revenue double precision,
    cogs double precision,
    fba_fees double precision,
    referral_fees double precision,
    ad_spend double precision,
    other_expenses double precision,
    units_sold integer,
    orders_count integer,
    active_asins integer,
    notes text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: client_pnl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_pnl_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_pnl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_pnl_id_seq OWNED BY public.client_pnl.id;


--
-- Name: client_portal_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_portal_users (
    id integer NOT NULL,
    client_id integer NOT NULL,
    org_id integer NOT NULL,
    email character varying(200) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean,
    can_view_pnl boolean,
    can_view_inventory boolean,
    can_view_reports boolean,
    can_message boolean,
    last_login timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: client_portal_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_portal_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_portal_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_portal_users_id_seq OWNED BY public.client_portal_users.id;


--
-- Name: client_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_profiles (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    brand_name character varying(255) NOT NULL,
    amazon_store_url character varying(500),
    marketplace character varying(50) NOT NULL,
    main_category character varying(255),
    monthly_revenue integer NOT NULL,
    product_count integer NOT NULL,
    onboarding_status character varying(50) NOT NULL,
    onboarding_step integer NOT NULL,
    target_acos integer,
    target_tacos integer,
    target_margin integer,
    notification_email character varying(255),
    notification_preferences json NOT NULL,
    logo_url character varying(500),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: client_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_profiles_id_seq OWNED BY public.client_profiles.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(200),
    phone character varying(50),
    marketplace character varying(10),
    plan character varying(50),
    assigned_am character varying(200),
    monthly_budget double precision,
    start_date character varying(20),
    status character varying(50),
    notes text,
    created_at timestamp without time zone
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: competitor_watches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitor_watches (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    our_asin character varying NOT NULL,
    competitor_asin character varying NOT NULL,
    competitor_brand character varying NOT NULL,
    competitor_price double precision NOT NULL,
    our_price double precision NOT NULL,
    price_diff_pct double precision,
    competitor_rating double precision,
    competitor_reviews integer,
    competitor_bsr integer,
    alert_type character varying,
    is_active boolean,
    last_checked timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: competitor_watches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competitor_watches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: competitor_watches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competitor_watches_id_seq OWNED BY public.competitor_watches.id;


--
-- Name: dwm_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dwm_approvals (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    approval_type character varying(50),
    name character varying(255) NOT NULL,
    category character varying(255),
    order_value double precision,
    reorder_value double precision,
    approval_date date NOT NULL,
    week_number integer,
    month character varying(20),
    notes text,
    created_at timestamp without time zone
);


--
-- Name: dwm_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dwm_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dwm_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dwm_approvals_id_seq OWNED BY public.dwm_approvals.id;


--
-- Name: dwm_daily_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dwm_daily_brands (
    id integer NOT NULL,
    daily_log_id integer NOT NULL,
    brand_name character varying(255),
    distributor_name character varying(255),
    category character varying(255),
    contact_method character varying(100),
    contact_status character varying(100)
);


--
-- Name: dwm_daily_brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dwm_daily_brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dwm_daily_brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dwm_daily_brands_id_seq OWNED BY public.dwm_daily_brands.id;


--
-- Name: dwm_daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dwm_daily_logs (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    log_date date NOT NULL,
    role_type character varying(50),
    products_hunted integer,
    brands_contacted integer,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: dwm_daily_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dwm_daily_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dwm_daily_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dwm_daily_logs_id_seq OWNED BY public.dwm_daily_logs.id;


--
-- Name: dwm_daily_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dwm_daily_products (
    id integer NOT NULL,
    daily_log_id integer NOT NULL,
    asin character varying(20),
    product_name character varying(500),
    brand character varying(255),
    category character varying(255),
    brand_url character varying(500)
);


--
-- Name: dwm_daily_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dwm_daily_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dwm_daily_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dwm_daily_products_id_seq OWNED BY public.dwm_daily_products.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name character varying NOT NULL,
    type public.expensetypeenum,
    description character varying,
    created_at timestamp without time zone
);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expense_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_entries (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    pl_statement_id integer,
    category_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    description character varying,
    date timestamp without time zone NOT NULL,
    receipt_url character varying,
    created_at timestamp without time zone
);


--
-- Name: expense_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_entries_id_seq OWNED BY public.expense_entries.id;


--
-- Name: fba_shipment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fba_shipment_items (
    id integer NOT NULL,
    shipment_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    sku character varying(50),
    quantity integer,
    units_per_case integer,
    number_of_cases integer,
    prep_type character varying(20),
    condition character varying(20),
    fnsku character varying(20),
    is_prepped boolean,
    created_at timestamp without time zone
);


--
-- Name: fba_shipment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fba_shipment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fba_shipment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fba_shipment_items_id_seq OWNED BY public.fba_shipment_items.id;


--
-- Name: fba_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fba_shipments (
    id integer NOT NULL,
    org_id integer NOT NULL,
    shipment_name character varying(255) NOT NULL,
    shipment_id character varying(50),
    destination_fc character varying(10),
    shipping_method character varying(10),
    carrier character varying(100),
    tracking_number character varying(100),
    status character varying(20),
    ship_date timestamp without time zone,
    estimated_arrival timestamp without time zone,
    actual_arrival timestamp without time zone,
    total_units integer,
    total_boxes integer,
    total_weight_lbs double precision,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: fba_shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fba_shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fba_shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fba_shipments_id_seq OWNED BY public.fba_shipments.id;


--
-- Name: fbm_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fbm_orders (
    id integer NOT NULL,
    org_id integer NOT NULL,
    amazon_order_id character varying(50),
    buyer_name character varying(255),
    buyer_city character varying(100),
    buyer_state character varying(50),
    buyer_zip character varying(20),
    buyer_country character varying(10),
    order_date timestamp without time zone,
    ship_by_date timestamp without time zone,
    delivery_by_date timestamp without time zone,
    status character varying(20),
    priority character varying(20),
    carrier character varying(100),
    tracking_number character varying(100),
    ship_date timestamp without time zone,
    delivery_date timestamp without time zone,
    total_amount double precision,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: fbm_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fbm_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fbm_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fbm_orders_id_seq OWNED BY public.fbm_orders.id;


--
-- Name: fbm_orders_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fbm_orders_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    sku character varying(50),
    quantity integer,
    unit_price double precision,
    total_price double precision,
    created_at timestamp without time zone
);


--
-- Name: fbm_orders_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fbm_orders_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fbm_orders_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fbm_orders_items_id_seq OWNED BY public.fbm_orders_items.id;


--
-- Name: generated_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_reports (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    template_id integer,
    report_name character varying NOT NULL,
    report_type character varying NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    status character varying,
    data json,
    file_url character varying,
    sent_to json,
    sent_at timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: generated_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generated_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generated_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generated_reports_id_seq OWNED BY public.generated_reports.id;


--
-- Name: inbound_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_shipments (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    shipment_id character varying(50) NOT NULL,
    shipment_name character varying(200) NOT NULL,
    destination_fc character varying(20) NOT NULL,
    status character varying(20),
    quantity_shipped integer,
    quantity_received integer,
    ship_date timestamp without time zone,
    expected_date timestamp without time zone,
    carrier character varying(50),
    tracking character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: inbound_shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_shipments_id_seq OWNED BY public.inbound_shipments.id;


--
-- Name: intelligence_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intelligence_alerts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    related_asin character varying(20),
    related_client_id integer,
    is_read boolean,
    is_dismissed boolean,
    data text NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: intelligence_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.intelligence_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intelligence_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.intelligence_alerts_id_seq OWNED BY public.intelligence_alerts.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    asin character varying(10) NOT NULL,
    sku character varying(100) NOT NULL,
    product_title character varying(500) NOT NULL,
    fnsku character varying(50),
    condition character varying(20),
    fulfillable_qty integer,
    inbound_qty integer,
    reserved_qty integer,
    unfulfillable_qty integer,
    total_qty integer,
    reorder_point integer,
    safety_stock integer,
    lead_time_days integer,
    daily_velocity double precision,
    days_of_stock double precision,
    restock_status character varying(20),
    last_synced timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    pl_statement_id integer,
    invoice_number character varying NOT NULL,
    issue_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2),
    total numeric(12,2) NOT NULL,
    status public.invoicestatusenum,
    payment_date timestamp without time zone,
    payment_method character varying,
    notes character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: kpi_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_targets (
    id integer NOT NULL,
    org_id integer NOT NULL,
    username character varying(100) NOT NULL,
    name character varying(200),
    role_type character varying(50),
    period character varying(20),
    metrics_json text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: kpi_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kpi_targets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kpi_targets_id_seq OWNED BY public.kpi_targets.id;


--
-- Name: listing_optimizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_optimizations (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    asin character varying NOT NULL,
    original_title character varying NOT NULL,
    optimized_title character varying,
    original_bullets json NOT NULL,
    optimized_bullets json,
    original_backend_keywords character varying NOT NULL,
    optimized_backend_keywords character varying,
    keyword_score_before double precision,
    keyword_score_after double precision,
    optimization_status character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: listing_optimizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.listing_optimizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: listing_optimizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.listing_optimizations_id_seq OWNED BY public.listing_optimizations.id;


--
-- Name: onboarding_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_checklist (
    id integer NOT NULL,
    client_id integer NOT NULL,
    step_name character varying(255) NOT NULL,
    step_order integer NOT NULL,
    description text,
    is_completed boolean NOT NULL,
    completed_at timestamp without time zone,
    completed_by integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: onboarding_checklist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.onboarding_checklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: onboarding_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.onboarding_checklist_id_seq OWNED BY public.onboarding_checklist.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    plan character varying(50),
    keepa_api_key character varying(255),
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    created_at timestamp without time zone
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: pipeline_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_products (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer,
    assigned_to integer NOT NULL,
    asin character varying(20) NOT NULL,
    title character varying(500) NOT NULL,
    brand character varying(255),
    category character varying(255),
    supplier_name character varying(255),
    supplier_contact character varying(255),
    cost_price double precision NOT NULL,
    sell_price double precision NOT NULL,
    fba_fee double precision NOT NULL,
    referral_fee double precision NOT NULL,
    net_profit double precision NOT NULL,
    roi_pct double precision NOT NULL,
    monthly_sales_est integer,
    bsr integer,
    status character varying(20) NOT NULL,
    status_history text,
    notes text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: pipeline_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pipeline_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pipeline_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pipeline_products_id_seq OWNED BY public.pipeline_products.id;


--
-- Name: pl_brand_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_brand_assets (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    product_id integer,
    asset_type character varying NOT NULL,
    name character varying NOT NULL,
    status character varying,
    file_url character varying,
    notes character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: pl_brand_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_brand_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_brand_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_brand_assets_id_seq OWNED BY public.pl_brand_assets.id;


--
-- Name: pl_launch_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_launch_plans (
    id integer NOT NULL,
    product_id integer NOT NULL,
    launch_date character varying,
    launch_budget double precision,
    status character varying,
    milestones json,
    keyword_targets json,
    ppc_budget double precision,
    review_target integer,
    giveaway_units integer,
    initial_inventory integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: pl_launch_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_launch_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_launch_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_launch_plans_id_seq OWNED BY public.pl_launch_plans.id;


--
-- Name: pl_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_products (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    product_name character varying NOT NULL,
    brand_name character varying NOT NULL,
    asin character varying,
    category character varying NOT NULL,
    subcategory character varying,
    status character varying,
    market_size_est double precision,
    competition_level character varying,
    monthly_revenue_est double precision,
    target_price double precision,
    target_margin double precision,
    target_bsr integer,
    main_keywords json,
    validation_score double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: pl_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_products_id_seq OWNED BY public.pl_products.id;


--
-- Name: pl_review_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_review_tracker (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    asin character varying NOT NULL,
    total_reviews integer,
    average_rating double precision,
    five_star integer,
    four_star integer,
    three_star integer,
    two_star integer,
    one_star integer,
    review_velocity_30d integer,
    last_checked timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: pl_review_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_review_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_review_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_review_tracker_id_seq OWNED BY public.pl_review_tracker.id;


--
-- Name: pl_sourcing_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_sourcing_leads (
    id integer NOT NULL,
    product_id integer NOT NULL,
    supplier_name character varying NOT NULL,
    supplier_country character varying NOT NULL,
    contact_info character varying,
    alibaba_url character varying,
    unit_price double precision,
    moq integer,
    sample_price double precision,
    sample_status character varying,
    production_status character varying,
    lead_time_days integer,
    quality_rating double precision,
    notes character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: pl_sourcing_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_sourcing_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_sourcing_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_sourcing_leads_id_seq OWNED BY public.pl_sourcing_leads.id;


--
-- Name: pl_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_statements (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    period_type public.periodtypeenum,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    gross_revenue numeric(12,2),
    refunds numeric(12,2),
    net_revenue numeric(12,2),
    cogs numeric(12,2),
    fba_fees numeric(12,2),
    referral_fees numeric(12,2),
    ppc_spend numeric(12,2),
    other_ad_spend numeric(12,2),
    storage_fees numeric(12,2),
    prep_fees numeric(12,2),
    shipping_inbound numeric(12,2),
    other_expenses numeric(12,2),
    agency_fee numeric(12,2),
    gross_profit numeric(12,2),
    net_profit numeric(12,2),
    margin_pct double precision,
    acos_pct double precision,
    tacos_pct double precision,
    status public.statusenum,
    notes character varying,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: pl_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pl_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pl_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pl_statements_id_seq OWNED BY public.pl_statements.id;


--
-- Name: pnl_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_line_items (
    id integer NOT NULL,
    pnl_id integer NOT NULL,
    asin character varying(10) NOT NULL,
    title character varying(500),
    revenue double precision,
    cogs double precision,
    fees double precision,
    ad_spend double precision,
    units_sold integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: pnl_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pnl_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pnl_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pnl_line_items_id_seq OWNED BY public.pnl_line_items.id;


--
-- Name: po_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_line_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    asin character varying NOT NULL,
    title character varying NOT NULL,
    brand character varying,
    quantity integer NOT NULL,
    unit_cost double precision NOT NULL,
    total_cost double precision NOT NULL,
    quantity_received integer NOT NULL,
    expected_sell_price double precision,
    expected_profit double precision,
    expected_roi double precision,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: po_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_line_items_id_seq OWNED BY public.po_line_items.id;


--
-- Name: po_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_status_logs (
    id integer NOT NULL,
    po_id integer NOT NULL,
    changed_by integer NOT NULL,
    old_status character varying NOT NULL,
    new_status character varying NOT NULL,
    notes text,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: po_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_status_logs_id_seq OWNED BY public.po_status_logs.id;


--
-- Name: ppc_action_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_action_plans (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer,
    client_name character varying(200),
    rules_config_id integer,
    plan_date timestamp without time zone,
    report_period character varying(100),
    status character varying(50),
    total_keywords integer,
    overall_acos double precision,
    total_spend double precision,
    total_sales double precision,
    bid_changes_count integer,
    harvest_count integer,
    negatives_count integer,
    approved_by character varying(200),
    approved_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: ppc_action_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_action_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_action_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_action_plans_id_seq OWNED BY public.ppc_action_plans.id;


--
-- Name: ppc_ad_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_ad_groups (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    ad_group_name character varying(255) NOT NULL,
    default_bid double precision,
    status character varying(20),
    created_at timestamp without time zone
);


--
-- Name: ppc_ad_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_ad_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_ad_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_ad_groups_id_seq OWNED BY public.ppc_ad_groups.id;


--
-- Name: ppc_bid_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_bid_changes (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    campaign character varying(300),
    ad_group character varying(300),
    keyword_target character varying(500),
    match_type character varying(50),
    impressions integer,
    clicks integer,
    spend double precision,
    sales double precision,
    orders integer,
    acos double precision,
    current_bid double precision,
    action character varying(100),
    new_bid double precision,
    approved boolean,
    am_notes text
);


--
-- Name: ppc_bid_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_bid_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_bid_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_bid_changes_id_seq OWNED BY public.ppc_bid_changes.id;


--
-- Name: ppc_budget_pacing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_budget_pacing (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    campaign_id integer NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    allocated_budget double precision NOT NULL,
    spent_to_date double precision,
    daily_target double precision,
    daily_actual double precision,
    pacing_pct double precision,
    status character varying,
    alert_threshold double precision
);


--
-- Name: ppc_budget_pacing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_budget_pacing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_budget_pacing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_budget_pacing_id_seq OWNED BY public.ppc_budget_pacing.id;


--
-- Name: ppc_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_campaigns (
    id integer NOT NULL,
    org_id integer NOT NULL,
    account_id integer,
    campaign_name character varying(255) NOT NULL,
    campaign_type character varying(10),
    status character varying(20),
    daily_budget double precision,
    total_spend double precision,
    total_sales double precision,
    acos double precision,
    impressions integer,
    clicks integer,
    orders integer,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: ppc_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_campaigns_id_seq OWNED BY public.ppc_campaigns.id;


--
-- Name: ppc_daypart_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_daypart_schedules (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    day_of_week integer NOT NULL,
    hour_start integer NOT NULL,
    hour_end integer NOT NULL,
    bid_multiplier double precision,
    is_active boolean
);


--
-- Name: ppc_daypart_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_daypart_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_daypart_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_daypart_schedules_id_seq OWNED BY public.ppc_daypart_schedules.id;


--
-- Name: ppc_keyword_harvests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_keyword_harvests (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    search_term character varying(500),
    source_campaign character varying(300),
    source_ad_group character varying(300),
    auto_target character varying(300),
    clicks integer,
    orders integer,
    spend double precision,
    sales double precision,
    recommended_action character varying(200),
    match_type character varying(50),
    approved boolean,
    am_notes text
);


--
-- Name: ppc_keyword_harvests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_keyword_harvests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_keyword_harvests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_keyword_harvests_id_seq OWNED BY public.ppc_keyword_harvests.id;


--
-- Name: ppc_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_keywords (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    keyword_text character varying(500) NOT NULL,
    match_type character varying(20),
    bid double precision,
    impressions integer,
    clicks integer,
    spend double precision,
    sales double precision,
    acos double precision,
    status character varying(20),
    created_at timestamp without time zone
);


--
-- Name: ppc_keywords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_keywords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_keywords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_keywords_id_seq OWNED BY public.ppc_keywords.id;


--
-- Name: ppc_negative_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_negative_keywords (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    search_term character varying(500),
    source_campaign character varying(300),
    source_ad_group character varying(300),
    wasted_clicks integer,
    wasted_spend double precision,
    recommended_action character varying(200),
    add_to character varying(200),
    priority character varying(50),
    approved boolean,
    am_notes text
);


--
-- Name: ppc_negative_keywords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_negative_keywords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_negative_keywords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_negative_keywords_id_seq OWNED BY public.ppc_negative_keywords.id;


--
-- Name: ppc_rules_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_rules_config (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer,
    name character varying(200),
    target_acos double precision,
    max_acos_hard double precision,
    raise_bid_threshold double precision,
    lower_bid_mild_threshold double precision,
    lower_bid_hard_threshold double precision,
    lower_bid_mild_pct double precision,
    lower_bid_hard_pct double precision,
    raise_bid_pct double precision,
    negative_min_clicks integer,
    negative_min_orders integer,
    harvest_min_orders integer,
    harvest_max_acos double precision,
    min_impressions integer,
    lookback_days integer,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: ppc_rules_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_rules_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_rules_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_rules_config_id_seq OWNED BY public.ppc_rules_config.id;


--
-- Name: ppc_search_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppc_search_terms (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    client_id character varying NOT NULL,
    campaign_id integer NOT NULL,
    search_term character varying NOT NULL,
    query_type character varying NOT NULL,
    impressions integer,
    clicks integer,
    spend double precision,
    sales double precision,
    orders integer,
    acos double precision,
    conversion_rate double precision,
    isolation_status character varying,
    created_at timestamp without time zone
);


--
-- Name: ppc_search_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ppc_search_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ppc_search_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ppc_search_terms_id_seq OWNED BY public.ppc_search_terms.id;


--
-- Name: product_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_scores (
    id integer NOT NULL,
    org_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    opportunity_score double precision NOT NULL,
    risk_score double precision NOT NULL,
    demand_score double precision NOT NULL,
    competition_score double precision NOT NULL,
    overall_score double precision NOT NULL,
    scoring_factors text NOT NULL,
    scored_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: product_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_scores_id_seq OWNED BY public.product_scores.id;


--
-- Name: product_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_status_logs (
    id integer NOT NULL,
    product_id integer NOT NULL,
    changed_by integer NOT NULL,
    old_status character varying(20) NOT NULL,
    new_status character varying(20) NOT NULL,
    notes text,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: product_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_status_logs_id_seq OWNED BY public.product_status_logs.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    org_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    cost double precision,
    price double precision,
    fba_fee double precision,
    net_profit double precision,
    roi_pct double precision,
    ai_score double precision,
    decision character varying(20),
    risk_level character varying(20),
    created_at timestamp without time zone
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: profit_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profit_analyses (
    id integer NOT NULL,
    org_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    cost_price double precision,
    selling_price double precision,
    fba_profit double precision,
    fbm_profit double precision,
    fba_roi double precision,
    fbm_roi double precision,
    fba_margin double precision,
    fbm_margin double precision,
    recommended_fulfillment character varying(10),
    marketplace character varying(10),
    created_at timestamp without time zone
);


--
-- Name: profit_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profit_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profit_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profit_analyses_id_seq OWNED BY public.profit_analyses.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer,
    created_by integer NOT NULL,
    po_number character varying NOT NULL,
    supplier_name character varying NOT NULL,
    supplier_contact character varying,
    status character varying NOT NULL,
    order_date date,
    expected_delivery date,
    actual_delivery date,
    shipping_method character varying,
    tracking_number character varying,
    subtotal double precision NOT NULL,
    shipping_cost double precision NOT NULL,
    total_cost double precision NOT NULL,
    notes text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_schedules (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    template_id integer NOT NULL,
    client_ids json NOT NULL,
    frequency character varying NOT NULL,
    day_of_week integer,
    day_of_month integer,
    send_to json NOT NULL,
    is_active boolean,
    last_run timestamp without time zone,
    next_run timestamp without time zone NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: report_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_schedules_id_seq OWNED BY public.report_schedules.id;


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    org_id character varying NOT NULL,
    name character varying NOT NULL,
    description character varying,
    report_type character varying NOT NULL,
    sections json NOT NULL,
    metrics json NOT NULL,
    filters json,
    is_default boolean,
    created_at timestamp without time zone
);


--
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- Name: restock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restock_alerts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20),
    message character varying(500) NOT NULL,
    is_read boolean,
    is_resolved boolean,
    created_at timestamp without time zone
);


--
-- Name: restock_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restock_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restock_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restock_alerts_id_seq OWNED BY public.restock_alerts.id;


--
-- Name: scout_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scout_results (
    id integer NOT NULL,
    org_id integer NOT NULL,
    asin character varying(20) NOT NULL,
    title character varying(500),
    brand character varying(255),
    category character varying(255),
    bsr integer,
    monthly_sales integer,
    current_price double precision,
    price_volatility_pct double precision,
    fba_sellers integer,
    fba_score double precision,
    verdict character varying(50),
    created_at timestamp without time zone
);


--
-- Name: scout_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scout_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scout_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scout_results_id_seq OWNED BY public.scout_results.id;


--
-- Name: sop_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sop_executions (
    id integer NOT NULL,
    org_id integer NOT NULL,
    sop_template_id integer NOT NULL,
    task_id integer,
    executed_by integer NOT NULL,
    client_id integer NOT NULL,
    status character varying(50),
    current_step integer,
    step_completions json,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: sop_executions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sop_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sop_executions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sop_executions_id_seq OWNED BY public.sop_executions.id;


--
-- Name: sop_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sop_templates (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    steps json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: sop_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sop_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sop_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sop_templates_id_seq OWNED BY public.sop_templates.id;


--
-- Name: storage_fee_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_fee_projections (
    id integer NOT NULL,
    org_id integer NOT NULL,
    client_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    asin character varying(10) NOT NULL,
    current_age_days integer,
    monthly_storage_fee double precision,
    long_term_storage_fee double precision,
    projected_3mo_fee double precision,
    recommended_action character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: storage_fee_projections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storage_fee_projections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storage_fee_projections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storage_fee_projections_id_seq OWNED BY public.storage_fee_projections.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name character varying(255) NOT NULL,
    brand character varying(255),
    contact character varying(255),
    response_rate double precision,
    approval_rate double precision,
    priority_score double precision,
    notes text,
    created_at timestamp without time zone
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    org_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    assigned_to integer,
    assigned_by integer,
    client_id integer,
    priority character varying(20),
    status character varying(50),
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    category character varying(50),
    estimated_hours double precision,
    actual_hours double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: team_capacity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_capacity (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    total_clients integer,
    max_clients integer,
    total_tasks_open integer,
    total_hours_week double precision,
    capacity_status character varying(20),
    week_start timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: team_capacity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_capacity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_capacity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_capacity_id_seq OWNED BY public.team_capacity.id;


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    client_id integer NOT NULL,
    task_id integer,
    hours double precision NOT NULL,
    description text,
    entry_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_entries_id_seq OWNED BY public.time_entries.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    org_id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    role character varying(50),
    avatar character varying(10),
    is_active boolean,
    created_at timestamp without time zone,
    last_login timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: weekly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_reports (
    id integer NOT NULL,
    org_id integer NOT NULL,
    week character varying(20) NOT NULL,
    manager character varying(200) NOT NULL,
    hunted integer,
    analyzed integer,
    contacted integer,
    approved integer,
    purchased integer,
    revenue double precision,
    profit double precision,
    roi_pct double precision,
    created_at timestamp without time zone
);


--
-- Name: weekly_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekly_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekly_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekly_reports_id_seq OWNED BY public.weekly_reports.id;


--
-- Name: wholesale_deal_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wholesale_deal_scores (
    id integer NOT NULL,
    product_id integer,
    score_breakdown json
);


--
-- Name: wholesale_deal_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wholesale_deal_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wholesale_deal_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wholesale_deal_scores_id_seq OWNED BY public.wholesale_deal_scores.id;


--
-- Name: wholesale_po_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wholesale_po_line_items (
    id integer NOT NULL,
    po_id integer,
    product_id integer,
    asin character varying(20),
    quantity integer,
    unit_price double precision,
    total_price double precision
);


--
-- Name: wholesale_po_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wholesale_po_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wholesale_po_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wholesale_po_line_items_id_seq OWNED BY public.wholesale_po_line_items.id;


--
-- Name: wholesale_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wholesale_products (
    id integer NOT NULL,
    org_id integer,
    client_id integer,
    asin character varying(20),
    product_title character varying(500),
    brand character varying(200),
    category character varying(200),
    supplier_id integer,
    buy_price double precision,
    amazon_price double precision,
    fba_fee double precision,
    referral_fee double precision,
    prep_cost double precision,
    shipping_cost double precision,
    net_profit double precision,
    roi_pct double precision,
    margin_pct double precision,
    bsr integer,
    bsr_category character varying(200),
    monthly_sales_est integer,
    buy_box_pct double precision,
    num_fba_sellers integer,
    is_hazmat boolean,
    is_gated boolean,
    approval_status public.approvalstatus,
    hunt_status public.huntstatus,
    score double precision,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: wholesale_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wholesale_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wholesale_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wholesale_products_id_seq OWNED BY public.wholesale_products.id;


--
-- Name: wholesale_purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wholesale_purchase_orders (
    id integer NOT NULL,
    org_id integer,
    client_id integer,
    supplier_id integer,
    po_number character varying(50),
    order_date timestamp without time zone,
    expected_delivery timestamp without time zone,
    status public.postatus,
    subtotal double precision,
    shipping_cost double precision,
    total double precision,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: wholesale_purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wholesale_purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wholesale_purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wholesale_purchase_orders_id_seq OWNED BY public.wholesale_purchase_orders.id;


--
-- Name: wholesale_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wholesale_suppliers (
    id integer NOT NULL,
    org_id integer,
    name character varying(300),
    contact_person character varying(200),
    email character varying(200),
    phone character varying(20),
    website character varying(500),
    address text,
    payment_terms character varying(200),
    min_order_qty integer,
    min_order_value double precision,
    lead_time_days integer,
    reliability_rating double precision,
    notes text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: wholesale_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wholesale_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wholesale_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wholesale_suppliers_id_seq OWNED BY public.wholesale_suppliers.id;


--
-- Name: account_health_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_health_snapshots ALTER COLUMN id SET DEFAULT nextval('public.account_health_snapshots_id_seq'::regclass);


--
-- Name: account_violations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_violations ALTER COLUMN id SET DEFAULT nextval('public.account_violations_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: ai_insights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights ALTER COLUMN id SET DEFAULT nextval('public.ai_insights_id_seq'::regclass);


--
-- Name: amazon_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amazon_credentials ALTER COLUMN id SET DEFAULT nextval('public.amazon_credentials_id_seq'::regclass);


--
-- Name: amazon_sync_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amazon_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.amazon_sync_logs_id_seq'::regclass);


--
-- Name: anomaly_detection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_detection ALTER COLUMN id SET DEFAULT nextval('public.anomaly_detection_id_seq'::regclass);


--
-- Name: automation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs ALTER COLUMN id SET DEFAULT nextval('public.automation_logs_id_seq'::regclass);


--
-- Name: automation_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_rules ALTER COLUMN id SET DEFAULT nextval('public.automation_rules_id_seq'::regclass);


--
-- Name: benchmark_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_data ALTER COLUMN id SET DEFAULT nextval('public.benchmark_data_id_seq'::regclass);


--
-- Name: brand_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_approvals ALTER COLUMN id SET DEFAULT nextval('public.brand_approvals_id_seq'::regclass);


--
-- Name: brand_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_documents ALTER COLUMN id SET DEFAULT nextval('public.brand_documents_id_seq'::regclass);


--
-- Name: brand_timeline id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_timeline ALTER COLUMN id SET DEFAULT nextval('public.brand_timeline_id_seq'::regclass);


--
-- Name: buybox_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_alerts ALTER COLUMN id SET DEFAULT nextval('public.buybox_alerts_id_seq'::regclass);


--
-- Name: buybox_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_history ALTER COLUMN id SET DEFAULT nextval('public.buybox_history_id_seq'::regclass);


--
-- Name: buybox_trackers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_trackers ALTER COLUMN id SET DEFAULT nextval('public.buybox_trackers_id_seq'::regclass);


--
-- Name: campaign_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_structures ALTER COLUMN id SET DEFAULT nextval('public.campaign_structures_id_seq'::regclass);


--
-- Name: cash_flow_projections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_projections ALTER COLUMN id SET DEFAULT nextval('public.cash_flow_projections_id_seq'::regclass);


--
-- Name: client_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_messages ALTER COLUMN id SET DEFAULT nextval('public.client_messages_id_seq'::regclass);


--
-- Name: client_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes ALTER COLUMN id SET DEFAULT nextval('public.client_notes_id_seq'::regclass);


--
-- Name: client_pnl id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl ALTER COLUMN id SET DEFAULT nextval('public.client_pnl_id_seq'::regclass);


--
-- Name: client_portal_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_portal_users ALTER COLUMN id SET DEFAULT nextval('public.client_portal_users_id_seq'::regclass);


--
-- Name: client_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_profiles ALTER COLUMN id SET DEFAULT nextval('public.client_profiles_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: competitor_watches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_watches ALTER COLUMN id SET DEFAULT nextval('public.competitor_watches_id_seq'::regclass);


--
-- Name: dwm_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_approvals ALTER COLUMN id SET DEFAULT nextval('public.dwm_approvals_id_seq'::regclass);


--
-- Name: dwm_daily_brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_brands ALTER COLUMN id SET DEFAULT nextval('public.dwm_daily_brands_id_seq'::regclass);


--
-- Name: dwm_daily_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_logs ALTER COLUMN id SET DEFAULT nextval('public.dwm_daily_logs_id_seq'::regclass);


--
-- Name: dwm_daily_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_products ALTER COLUMN id SET DEFAULT nextval('public.dwm_daily_products_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expense_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries ALTER COLUMN id SET DEFAULT nextval('public.expense_entries_id_seq'::regclass);


--
-- Name: fba_shipment_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipment_items ALTER COLUMN id SET DEFAULT nextval('public.fba_shipment_items_id_seq'::regclass);


--
-- Name: fba_shipments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipments ALTER COLUMN id SET DEFAULT nextval('public.fba_shipments_id_seq'::regclass);


--
-- Name: fbm_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders ALTER COLUMN id SET DEFAULT nextval('public.fbm_orders_id_seq'::regclass);


--
-- Name: fbm_orders_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders_items ALTER COLUMN id SET DEFAULT nextval('public.fbm_orders_items_id_seq'::regclass);


--
-- Name: generated_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports ALTER COLUMN id SET DEFAULT nextval('public.generated_reports_id_seq'::regclass);


--
-- Name: inbound_shipments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_shipments ALTER COLUMN id SET DEFAULT nextval('public.inbound_shipments_id_seq'::regclass);


--
-- Name: intelligence_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_alerts ALTER COLUMN id SET DEFAULT nextval('public.intelligence_alerts_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: kpi_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_targets ALTER COLUMN id SET DEFAULT nextval('public.kpi_targets_id_seq'::regclass);


--
-- Name: listing_optimizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_optimizations ALTER COLUMN id SET DEFAULT nextval('public.listing_optimizations_id_seq'::regclass);


--
-- Name: onboarding_checklist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist ALTER COLUMN id SET DEFAULT nextval('public.onboarding_checklist_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: pipeline_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_products ALTER COLUMN id SET DEFAULT nextval('public.pipeline_products_id_seq'::regclass);


--
-- Name: pl_brand_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_brand_assets ALTER COLUMN id SET DEFAULT nextval('public.pl_brand_assets_id_seq'::regclass);


--
-- Name: pl_launch_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_launch_plans ALTER COLUMN id SET DEFAULT nextval('public.pl_launch_plans_id_seq'::regclass);


--
-- Name: pl_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_products ALTER COLUMN id SET DEFAULT nextval('public.pl_products_id_seq'::regclass);


--
-- Name: pl_review_tracker id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_review_tracker ALTER COLUMN id SET DEFAULT nextval('public.pl_review_tracker_id_seq'::regclass);


--
-- Name: pl_sourcing_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_sourcing_leads ALTER COLUMN id SET DEFAULT nextval('public.pl_sourcing_leads_id_seq'::regclass);


--
-- Name: pl_statements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_statements ALTER COLUMN id SET DEFAULT nextval('public.pl_statements_id_seq'::regclass);


--
-- Name: pnl_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_line_items ALTER COLUMN id SET DEFAULT nextval('public.pnl_line_items_id_seq'::regclass);


--
-- Name: po_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_line_items ALTER COLUMN id SET DEFAULT nextval('public.po_line_items_id_seq'::regclass);


--
-- Name: po_status_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_status_logs ALTER COLUMN id SET DEFAULT nextval('public.po_status_logs_id_seq'::regclass);


--
-- Name: ppc_action_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_action_plans ALTER COLUMN id SET DEFAULT nextval('public.ppc_action_plans_id_seq'::regclass);


--
-- Name: ppc_ad_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_ad_groups ALTER COLUMN id SET DEFAULT nextval('public.ppc_ad_groups_id_seq'::regclass);


--
-- Name: ppc_bid_changes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_bid_changes ALTER COLUMN id SET DEFAULT nextval('public.ppc_bid_changes_id_seq'::regclass);


--
-- Name: ppc_budget_pacing id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_budget_pacing ALTER COLUMN id SET DEFAULT nextval('public.ppc_budget_pacing_id_seq'::regclass);


--
-- Name: ppc_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_campaigns ALTER COLUMN id SET DEFAULT nextval('public.ppc_campaigns_id_seq'::regclass);


--
-- Name: ppc_daypart_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_daypart_schedules ALTER COLUMN id SET DEFAULT nextval('public.ppc_daypart_schedules_id_seq'::regclass);


--
-- Name: ppc_keyword_harvests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keyword_harvests ALTER COLUMN id SET DEFAULT nextval('public.ppc_keyword_harvests_id_seq'::regclass);


--
-- Name: ppc_keywords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keywords ALTER COLUMN id SET DEFAULT nextval('public.ppc_keywords_id_seq'::regclass);


--
-- Name: ppc_negative_keywords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_negative_keywords ALTER COLUMN id SET DEFAULT nextval('public.ppc_negative_keywords_id_seq'::regclass);


--
-- Name: ppc_rules_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_rules_config ALTER COLUMN id SET DEFAULT nextval('public.ppc_rules_config_id_seq'::regclass);


--
-- Name: ppc_search_terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_search_terms ALTER COLUMN id SET DEFAULT nextval('public.ppc_search_terms_id_seq'::regclass);


--
-- Name: product_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_scores ALTER COLUMN id SET DEFAULT nextval('public.product_scores_id_seq'::regclass);


--
-- Name: product_status_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_logs ALTER COLUMN id SET DEFAULT nextval('public.product_status_logs_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: profit_analyses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_analyses ALTER COLUMN id SET DEFAULT nextval('public.profit_analyses_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: report_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules ALTER COLUMN id SET DEFAULT nextval('public.report_schedules_id_seq'::regclass);


--
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- Name: restock_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_alerts ALTER COLUMN id SET DEFAULT nextval('public.restock_alerts_id_seq'::regclass);


--
-- Name: scout_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_results ALTER COLUMN id SET DEFAULT nextval('public.scout_results_id_seq'::regclass);


--
-- Name: sop_executions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_executions ALTER COLUMN id SET DEFAULT nextval('public.sop_executions_id_seq'::regclass);


--
-- Name: sop_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_templates ALTER COLUMN id SET DEFAULT nextval('public.sop_templates_id_seq'::regclass);


--
-- Name: storage_fee_projections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_fee_projections ALTER COLUMN id SET DEFAULT nextval('public.storage_fee_projections_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: team_capacity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_capacity ALTER COLUMN id SET DEFAULT nextval('public.team_capacity_id_seq'::regclass);


--
-- Name: time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries ALTER COLUMN id SET DEFAULT nextval('public.time_entries_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: weekly_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports ALTER COLUMN id SET DEFAULT nextval('public.weekly_reports_id_seq'::regclass);


--
-- Name: wholesale_deal_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_deal_scores ALTER COLUMN id SET DEFAULT nextval('public.wholesale_deal_scores_id_seq'::regclass);


--
-- Name: wholesale_po_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_po_line_items ALTER COLUMN id SET DEFAULT nextval('public.wholesale_po_line_items_id_seq'::regclass);


--
-- Name: wholesale_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_products ALTER COLUMN id SET DEFAULT nextval('public.wholesale_products_id_seq'::regclass);


--
-- Name: wholesale_purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.wholesale_purchase_orders_id_seq'::regclass);


--
-- Name: wholesale_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_suppliers ALTER COLUMN id SET DEFAULT nextval('public.wholesale_suppliers_id_seq'::regclass);


--
-- Name: account_health_snapshots account_health_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_health_snapshots
    ADD CONSTRAINT account_health_snapshots_pkey PRIMARY KEY (id);


--
-- Name: account_violations account_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_violations
    ADD CONSTRAINT account_violations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: amazon_credentials amazon_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amazon_credentials
    ADD CONSTRAINT amazon_credentials_pkey PRIMARY KEY (id);


--
-- Name: amazon_sync_logs amazon_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amazon_sync_logs
    ADD CONSTRAINT amazon_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: anomaly_detection anomaly_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anomaly_detection
    ADD CONSTRAINT anomaly_detection_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_rules automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_pkey PRIMARY KEY (id);


--
-- Name: benchmark_data benchmark_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_data
    ADD CONSTRAINT benchmark_data_pkey PRIMARY KEY (id);


--
-- Name: brand_approvals brand_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_approvals
    ADD CONSTRAINT brand_approvals_pkey PRIMARY KEY (id);


--
-- Name: brand_documents brand_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_documents
    ADD CONSTRAINT brand_documents_pkey PRIMARY KEY (id);


--
-- Name: brand_timeline brand_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_timeline
    ADD CONSTRAINT brand_timeline_pkey PRIMARY KEY (id);


--
-- Name: buybox_alerts buybox_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_alerts
    ADD CONSTRAINT buybox_alerts_pkey PRIMARY KEY (id);


--
-- Name: buybox_history buybox_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_history
    ADD CONSTRAINT buybox_history_pkey PRIMARY KEY (id);


--
-- Name: buybox_trackers buybox_trackers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_trackers
    ADD CONSTRAINT buybox_trackers_pkey PRIMARY KEY (id);


--
-- Name: campaign_structures campaign_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_structures
    ADD CONSTRAINT campaign_structures_pkey PRIMARY KEY (id);


--
-- Name: cash_flow_projections cash_flow_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_projections
    ADD CONSTRAINT cash_flow_projections_pkey PRIMARY KEY (id);


--
-- Name: client_messages client_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_messages
    ADD CONSTRAINT client_messages_pkey PRIMARY KEY (id);


--
-- Name: client_notes client_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_pkey PRIMARY KEY (id);


--
-- Name: client_pnl client_pnl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl
    ADD CONSTRAINT client_pnl_pkey PRIMARY KEY (id);


--
-- Name: client_portal_users client_portal_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_portal_users
    ADD CONSTRAINT client_portal_users_pkey PRIMARY KEY (id);


--
-- Name: client_profiles client_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_profiles
    ADD CONSTRAINT client_profiles_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: competitor_watches competitor_watches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_watches
    ADD CONSTRAINT competitor_watches_pkey PRIMARY KEY (id);


--
-- Name: dwm_approvals dwm_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_approvals
    ADD CONSTRAINT dwm_approvals_pkey PRIMARY KEY (id);


--
-- Name: dwm_daily_brands dwm_daily_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_brands
    ADD CONSTRAINT dwm_daily_brands_pkey PRIMARY KEY (id);


--
-- Name: dwm_daily_logs dwm_daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_logs
    ADD CONSTRAINT dwm_daily_logs_pkey PRIMARY KEY (id);


--
-- Name: dwm_daily_products dwm_daily_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_products
    ADD CONSTRAINT dwm_daily_products_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_entries expense_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_pkey PRIMARY KEY (id);


--
-- Name: fba_shipment_items fba_shipment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipment_items
    ADD CONSTRAINT fba_shipment_items_pkey PRIMARY KEY (id);


--
-- Name: fba_shipments fba_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipments
    ADD CONSTRAINT fba_shipments_pkey PRIMARY KEY (id);


--
-- Name: fbm_orders_items fbm_orders_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders_items
    ADD CONSTRAINT fbm_orders_items_pkey PRIMARY KEY (id);


--
-- Name: fbm_orders fbm_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders
    ADD CONSTRAINT fbm_orders_pkey PRIMARY KEY (id);


--
-- Name: generated_reports generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (id);


--
-- Name: inbound_shipments inbound_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_shipments
    ADD CONSTRAINT inbound_shipments_pkey PRIMARY KEY (id);


--
-- Name: inbound_shipments inbound_shipments_shipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_shipments
    ADD CONSTRAINT inbound_shipments_shipment_id_key UNIQUE (shipment_id);


--
-- Name: intelligence_alerts intelligence_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_alerts
    ADD CONSTRAINT intelligence_alerts_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: kpi_targets kpi_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_targets
    ADD CONSTRAINT kpi_targets_pkey PRIMARY KEY (id);


--
-- Name: listing_optimizations listing_optimizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_optimizations
    ADD CONSTRAINT listing_optimizations_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklist onboarding_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: pipeline_products pipeline_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_products
    ADD CONSTRAINT pipeline_products_pkey PRIMARY KEY (id);


--
-- Name: pl_brand_assets pl_brand_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_brand_assets
    ADD CONSTRAINT pl_brand_assets_pkey PRIMARY KEY (id);


--
-- Name: pl_launch_plans pl_launch_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_launch_plans
    ADD CONSTRAINT pl_launch_plans_pkey PRIMARY KEY (id);


--
-- Name: pl_launch_plans pl_launch_plans_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_launch_plans
    ADD CONSTRAINT pl_launch_plans_product_id_key UNIQUE (product_id);


--
-- Name: pl_products pl_products_asin_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_products
    ADD CONSTRAINT pl_products_asin_key UNIQUE (asin);


--
-- Name: pl_products pl_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_products
    ADD CONSTRAINT pl_products_pkey PRIMARY KEY (id);


--
-- Name: pl_review_tracker pl_review_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_review_tracker
    ADD CONSTRAINT pl_review_tracker_pkey PRIMARY KEY (id);


--
-- Name: pl_sourcing_leads pl_sourcing_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_sourcing_leads
    ADD CONSTRAINT pl_sourcing_leads_pkey PRIMARY KEY (id);


--
-- Name: pl_statements pl_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_statements
    ADD CONSTRAINT pl_statements_pkey PRIMARY KEY (id);


--
-- Name: pnl_line_items pnl_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_line_items
    ADD CONSTRAINT pnl_line_items_pkey PRIMARY KEY (id);


--
-- Name: po_line_items po_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_line_items
    ADD CONSTRAINT po_line_items_pkey PRIMARY KEY (id);


--
-- Name: po_status_logs po_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_status_logs
    ADD CONSTRAINT po_status_logs_pkey PRIMARY KEY (id);


--
-- Name: ppc_action_plans ppc_action_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_action_plans
    ADD CONSTRAINT ppc_action_plans_pkey PRIMARY KEY (id);


--
-- Name: ppc_ad_groups ppc_ad_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_ad_groups
    ADD CONSTRAINT ppc_ad_groups_pkey PRIMARY KEY (id);


--
-- Name: ppc_bid_changes ppc_bid_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_bid_changes
    ADD CONSTRAINT ppc_bid_changes_pkey PRIMARY KEY (id);


--
-- Name: ppc_budget_pacing ppc_budget_pacing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_budget_pacing
    ADD CONSTRAINT ppc_budget_pacing_pkey PRIMARY KEY (id);


--
-- Name: ppc_campaigns ppc_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_campaigns
    ADD CONSTRAINT ppc_campaigns_pkey PRIMARY KEY (id);


--
-- Name: ppc_daypart_schedules ppc_daypart_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_daypart_schedules
    ADD CONSTRAINT ppc_daypart_schedules_pkey PRIMARY KEY (id);


--
-- Name: ppc_keyword_harvests ppc_keyword_harvests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keyword_harvests
    ADD CONSTRAINT ppc_keyword_harvests_pkey PRIMARY KEY (id);


--
-- Name: ppc_keywords ppc_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keywords
    ADD CONSTRAINT ppc_keywords_pkey PRIMARY KEY (id);


--
-- Name: ppc_negative_keywords ppc_negative_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_negative_keywords
    ADD CONSTRAINT ppc_negative_keywords_pkey PRIMARY KEY (id);


--
-- Name: ppc_rules_config ppc_rules_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_rules_config
    ADD CONSTRAINT ppc_rules_config_pkey PRIMARY KEY (id);


--
-- Name: ppc_search_terms ppc_search_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_search_terms
    ADD CONSTRAINT ppc_search_terms_pkey PRIMARY KEY (id);


--
-- Name: product_scores product_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_scores
    ADD CONSTRAINT product_scores_pkey PRIMARY KEY (id);


--
-- Name: product_status_logs product_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_logs
    ADD CONSTRAINT product_status_logs_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profit_analyses profit_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_analyses
    ADD CONSTRAINT profit_analyses_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: restock_alerts restock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_alerts
    ADD CONSTRAINT restock_alerts_pkey PRIMARY KEY (id);


--
-- Name: scout_results scout_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_results
    ADD CONSTRAINT scout_results_pkey PRIMARY KEY (id);


--
-- Name: sop_executions sop_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_executions
    ADD CONSTRAINT sop_executions_pkey PRIMARY KEY (id);


--
-- Name: sop_templates sop_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_templates
    ADD CONSTRAINT sop_templates_pkey PRIMARY KEY (id);


--
-- Name: storage_fee_projections storage_fee_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_fee_projections
    ADD CONSTRAINT storage_fee_projections_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_capacity team_capacity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_capacity
    ADD CONSTRAINT team_capacity_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: client_pnl uq_pnl_client_month; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl
    ADD CONSTRAINT uq_pnl_client_month UNIQUE (org_id, client_id, month);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: weekly_reports weekly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_pkey PRIMARY KEY (id);


--
-- Name: wholesale_deal_scores wholesale_deal_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_deal_scores
    ADD CONSTRAINT wholesale_deal_scores_pkey PRIMARY KEY (id);


--
-- Name: wholesale_deal_scores wholesale_deal_scores_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_deal_scores
    ADD CONSTRAINT wholesale_deal_scores_product_id_key UNIQUE (product_id);


--
-- Name: wholesale_po_line_items wholesale_po_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_po_line_items
    ADD CONSTRAINT wholesale_po_line_items_pkey PRIMARY KEY (id);


--
-- Name: wholesale_products wholesale_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_products
    ADD CONSTRAINT wholesale_products_pkey PRIMARY KEY (id);


--
-- Name: wholesale_purchase_orders wholesale_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_purchase_orders
    ADD CONSTRAINT wholesale_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: wholesale_suppliers wholesale_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_suppliers
    ADD CONSTRAINT wholesale_suppliers_pkey PRIMARY KEY (id);


--
-- Name: ix_account_health_snapshots_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_account_health_snapshots_id ON public.account_health_snapshots USING btree (id);


--
-- Name: ix_account_health_snapshots_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_account_health_snapshots_org_id ON public.account_health_snapshots USING btree (org_id);


--
-- Name: ix_account_violations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_account_violations_id ON public.account_violations USING btree (id);


--
-- Name: ix_account_violations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_account_violations_org_id ON public.account_violations USING btree (org_id);


--
-- Name: ix_activity_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_activity_logs_id ON public.activity_logs USING btree (id);


--
-- Name: ix_activity_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_activity_logs_org_id ON public.activity_logs USING btree (org_id);


--
-- Name: ix_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: ix_ai_insights_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_insights_client_id ON public.ai_insights USING btree (client_id);


--
-- Name: ix_ai_insights_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_insights_id ON public.ai_insights USING btree (id);


--
-- Name: ix_ai_insights_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_insights_org_id ON public.ai_insights USING btree (org_id);


--
-- Name: ix_amazon_credentials_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_amazon_credentials_org_id ON public.amazon_credentials USING btree (org_id);


--
-- Name: ix_amazon_sync_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_amazon_sync_logs_org_id ON public.amazon_sync_logs USING btree (org_id);


--
-- Name: ix_anomaly_detection_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_anomaly_detection_client_id ON public.anomaly_detection USING btree (client_id);


--
-- Name: ix_anomaly_detection_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_anomaly_detection_org_id ON public.anomaly_detection USING btree (org_id);


--
-- Name: ix_automation_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_logs_created_at ON public.automation_logs USING btree (created_at);


--
-- Name: ix_automation_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_logs_id ON public.automation_logs USING btree (id);


--
-- Name: ix_automation_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_logs_org_id ON public.automation_logs USING btree (org_id);


--
-- Name: ix_automation_logs_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_logs_rule_id ON public.automation_logs USING btree (rule_id);


--
-- Name: ix_automation_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_logs_status ON public.automation_logs USING btree (status);


--
-- Name: ix_automation_rules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_rules_id ON public.automation_rules USING btree (id);


--
-- Name: ix_automation_rules_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_rules_is_active ON public.automation_rules USING btree (is_active);


--
-- Name: ix_automation_rules_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_rules_org_id ON public.automation_rules USING btree (org_id);


--
-- Name: ix_automation_rules_rule_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_rules_rule_type ON public.automation_rules USING btree (rule_type);


--
-- Name: ix_benchmark_data_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_benchmark_data_client_id ON public.benchmark_data USING btree (client_id);


--
-- Name: ix_benchmark_data_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_benchmark_data_org_id ON public.benchmark_data USING btree (org_id);


--
-- Name: ix_brand_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_approvals_id ON public.brand_approvals USING btree (id);


--
-- Name: ix_brand_approvals_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_approvals_org_id ON public.brand_approvals USING btree (org_id);


--
-- Name: ix_brand_documents_approval_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_documents_approval_id ON public.brand_documents USING btree (approval_id);


--
-- Name: ix_brand_documents_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_documents_id ON public.brand_documents USING btree (id);


--
-- Name: ix_brand_timeline_approval_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_timeline_approval_id ON public.brand_timeline USING btree (approval_id);


--
-- Name: ix_brand_timeline_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_timeline_id ON public.brand_timeline USING btree (id);


--
-- Name: ix_buybox_alerts_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_alerts_asin ON public.buybox_alerts USING btree (asin);


--
-- Name: ix_buybox_alerts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_alerts_id ON public.buybox_alerts USING btree (id);


--
-- Name: ix_buybox_alerts_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_alerts_org_id ON public.buybox_alerts USING btree (org_id);


--
-- Name: ix_buybox_alerts_tracker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_alerts_tracker_id ON public.buybox_alerts USING btree (tracker_id);


--
-- Name: ix_buybox_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_history_id ON public.buybox_history USING btree (id);


--
-- Name: ix_buybox_history_tracker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_history_tracker_id ON public.buybox_history USING btree (tracker_id);


--
-- Name: ix_buybox_trackers_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_trackers_asin ON public.buybox_trackers USING btree (asin);


--
-- Name: ix_buybox_trackers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_trackers_id ON public.buybox_trackers USING btree (id);


--
-- Name: ix_buybox_trackers_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_buybox_trackers_org_id ON public.buybox_trackers USING btree (org_id);


--
-- Name: ix_campaign_structures_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_campaign_structures_client_id ON public.campaign_structures USING btree (client_id);


--
-- Name: ix_campaign_structures_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_campaign_structures_id ON public.campaign_structures USING btree (id);


--
-- Name: ix_campaign_structures_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_campaign_structures_org_id ON public.campaign_structures USING btree (org_id);


--
-- Name: ix_cash_flow_projections_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cash_flow_projections_id ON public.cash_flow_projections USING btree (id);


--
-- Name: ix_client_messages_client_portal_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_messages_client_portal_user_id ON public.client_messages USING btree (client_portal_user_id);


--
-- Name: ix_client_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_messages_id ON public.client_messages USING btree (id);


--
-- Name: ix_client_messages_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_messages_org_id ON public.client_messages USING btree (org_id);


--
-- Name: ix_client_notes_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_notes_client_id ON public.client_notes USING btree (client_id);


--
-- Name: ix_client_notes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_notes_id ON public.client_notes USING btree (id);


--
-- Name: ix_client_notes_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_notes_org_id ON public.client_notes USING btree (org_id);


--
-- Name: ix_client_pnl_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_pnl_client_id ON public.client_pnl USING btree (client_id);


--
-- Name: ix_client_pnl_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_pnl_id ON public.client_pnl USING btree (id);


--
-- Name: ix_client_pnl_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_pnl_org_id ON public.client_pnl USING btree (org_id);


--
-- Name: ix_client_portal_users_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_portal_users_client_id ON public.client_portal_users USING btree (client_id);


--
-- Name: ix_client_portal_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_client_portal_users_email ON public.client_portal_users USING btree (email);


--
-- Name: ix_client_portal_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_portal_users_id ON public.client_portal_users USING btree (id);


--
-- Name: ix_client_portal_users_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_portal_users_org_id ON public.client_portal_users USING btree (org_id);


--
-- Name: ix_client_profiles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_profiles_id ON public.client_profiles USING btree (id);


--
-- Name: ix_client_profiles_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_profiles_org_id ON public.client_profiles USING btree (org_id);


--
-- Name: ix_client_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_client_profiles_user_id ON public.client_profiles USING btree (user_id);


--
-- Name: ix_clients_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clients_id ON public.clients USING btree (id);


--
-- Name: ix_clients_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clients_org_id ON public.clients USING btree (org_id);


--
-- Name: ix_competitor_watches_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_competitor_watches_client_id ON public.competitor_watches USING btree (client_id);


--
-- Name: ix_competitor_watches_competitor_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_competitor_watches_competitor_asin ON public.competitor_watches USING btree (competitor_asin);


--
-- Name: ix_competitor_watches_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_competitor_watches_id ON public.competitor_watches USING btree (id);


--
-- Name: ix_competitor_watches_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_competitor_watches_org_id ON public.competitor_watches USING btree (org_id);


--
-- Name: ix_competitor_watches_our_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_competitor_watches_our_asin ON public.competitor_watches USING btree (our_asin);


--
-- Name: ix_dwm_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_approvals_id ON public.dwm_approvals USING btree (id);


--
-- Name: ix_dwm_approvals_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_approvals_org_id ON public.dwm_approvals USING btree (org_id);


--
-- Name: ix_dwm_approvals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_approvals_user_id ON public.dwm_approvals USING btree (user_id);


--
-- Name: ix_dwm_daily_brands_daily_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_brands_daily_log_id ON public.dwm_daily_brands USING btree (daily_log_id);


--
-- Name: ix_dwm_daily_brands_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_brands_id ON public.dwm_daily_brands USING btree (id);


--
-- Name: ix_dwm_daily_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_logs_id ON public.dwm_daily_logs USING btree (id);


--
-- Name: ix_dwm_daily_logs_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_logs_log_date ON public.dwm_daily_logs USING btree (log_date);


--
-- Name: ix_dwm_daily_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_logs_org_id ON public.dwm_daily_logs USING btree (org_id);


--
-- Name: ix_dwm_daily_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_logs_user_id ON public.dwm_daily_logs USING btree (user_id);


--
-- Name: ix_dwm_daily_products_daily_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_products_daily_log_id ON public.dwm_daily_products USING btree (daily_log_id);


--
-- Name: ix_dwm_daily_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dwm_daily_products_id ON public.dwm_daily_products USING btree (id);


--
-- Name: ix_expense_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_expense_categories_id ON public.expense_categories USING btree (id);


--
-- Name: ix_expense_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_expense_entries_id ON public.expense_entries USING btree (id);


--
-- Name: ix_fba_shipment_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fba_shipment_items_id ON public.fba_shipment_items USING btree (id);


--
-- Name: ix_fba_shipment_items_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fba_shipment_items_shipment_id ON public.fba_shipment_items USING btree (shipment_id);


--
-- Name: ix_fba_shipments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fba_shipments_id ON public.fba_shipments USING btree (id);


--
-- Name: ix_fba_shipments_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fba_shipments_org_id ON public.fba_shipments USING btree (org_id);


--
-- Name: ix_fba_shipments_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fba_shipments_shipment_id ON public.fba_shipments USING btree (shipment_id);


--
-- Name: ix_fbm_orders_amazon_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fbm_orders_amazon_order_id ON public.fbm_orders USING btree (amazon_order_id);


--
-- Name: ix_fbm_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fbm_orders_id ON public.fbm_orders USING btree (id);


--
-- Name: ix_fbm_orders_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fbm_orders_items_id ON public.fbm_orders_items USING btree (id);


--
-- Name: ix_fbm_orders_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fbm_orders_items_order_id ON public.fbm_orders_items USING btree (order_id);


--
-- Name: ix_fbm_orders_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fbm_orders_org_id ON public.fbm_orders USING btree (org_id);


--
-- Name: ix_generated_reports_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_generated_reports_client_id ON public.generated_reports USING btree (client_id);


--
-- Name: ix_generated_reports_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_generated_reports_org_id ON public.generated_reports USING btree (org_id);


--
-- Name: ix_inbound_shipments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inbound_shipments_id ON public.inbound_shipments USING btree (id);


--
-- Name: ix_intelligence_alerts_alert_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_alert_type ON public.intelligence_alerts USING btree (alert_type);


--
-- Name: ix_intelligence_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_created_at ON public.intelligence_alerts USING btree (created_at);


--
-- Name: ix_intelligence_alerts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_id ON public.intelligence_alerts USING btree (id);


--
-- Name: ix_intelligence_alerts_is_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_is_dismissed ON public.intelligence_alerts USING btree (is_dismissed);


--
-- Name: ix_intelligence_alerts_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_is_read ON public.intelligence_alerts USING btree (is_read);


--
-- Name: ix_intelligence_alerts_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_org_id ON public.intelligence_alerts USING btree (org_id);


--
-- Name: ix_intelligence_alerts_related_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_related_asin ON public.intelligence_alerts USING btree (related_asin);


--
-- Name: ix_intelligence_alerts_related_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_related_client_id ON public.intelligence_alerts USING btree (related_client_id);


--
-- Name: ix_intelligence_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_intelligence_alerts_severity ON public.intelligence_alerts USING btree (severity);


--
-- Name: ix_inventory_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inventory_items_id ON public.inventory_items USING btree (id);


--
-- Name: ix_invoices_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoices_id ON public.invoices USING btree (id);


--
-- Name: ix_kpi_targets_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_kpi_targets_id ON public.kpi_targets USING btree (id);


--
-- Name: ix_kpi_targets_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_kpi_targets_org_id ON public.kpi_targets USING btree (org_id);


--
-- Name: ix_kpi_targets_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_kpi_targets_username ON public.kpi_targets USING btree (username);


--
-- Name: ix_listing_optimizations_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_listing_optimizations_asin ON public.listing_optimizations USING btree (asin);


--
-- Name: ix_listing_optimizations_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_listing_optimizations_client_id ON public.listing_optimizations USING btree (client_id);


--
-- Name: ix_listing_optimizations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_listing_optimizations_id ON public.listing_optimizations USING btree (id);


--
-- Name: ix_listing_optimizations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_listing_optimizations_org_id ON public.listing_optimizations USING btree (org_id);


--
-- Name: ix_onboarding_checklist_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_onboarding_checklist_client_id ON public.onboarding_checklist USING btree (client_id);


--
-- Name: ix_onboarding_checklist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_onboarding_checklist_id ON public.onboarding_checklist USING btree (id);


--
-- Name: ix_organizations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_organizations_id ON public.organizations USING btree (id);


--
-- Name: ix_pipeline_products_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_asin ON public.pipeline_products USING btree (asin);


--
-- Name: ix_pipeline_products_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_assigned_to ON public.pipeline_products USING btree (assigned_to);


--
-- Name: ix_pipeline_products_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_brand ON public.pipeline_products USING btree (brand);


--
-- Name: ix_pipeline_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_category ON public.pipeline_products USING btree (category);


--
-- Name: ix_pipeline_products_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_client_id ON public.pipeline_products USING btree (client_id);


--
-- Name: ix_pipeline_products_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_created_at ON public.pipeline_products USING btree (created_at);


--
-- Name: ix_pipeline_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_id ON public.pipeline_products USING btree (id);


--
-- Name: ix_pipeline_products_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_org_id ON public.pipeline_products USING btree (org_id);


--
-- Name: ix_pipeline_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pipeline_products_status ON public.pipeline_products USING btree (status);


--
-- Name: ix_pl_brand_assets_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_brand_assets_client_id ON public.pl_brand_assets USING btree (client_id);


--
-- Name: ix_pl_brand_assets_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_brand_assets_id ON public.pl_brand_assets USING btree (id);


--
-- Name: ix_pl_brand_assets_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_brand_assets_org_id ON public.pl_brand_assets USING btree (org_id);


--
-- Name: ix_pl_launch_plans_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_launch_plans_id ON public.pl_launch_plans USING btree (id);


--
-- Name: ix_pl_products_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_products_client_id ON public.pl_products USING btree (client_id);


--
-- Name: ix_pl_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_products_id ON public.pl_products USING btree (id);


--
-- Name: ix_pl_products_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_products_org_id ON public.pl_products USING btree (org_id);


--
-- Name: ix_pl_review_tracker_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_review_tracker_asin ON public.pl_review_tracker USING btree (asin);


--
-- Name: ix_pl_review_tracker_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_review_tracker_client_id ON public.pl_review_tracker USING btree (client_id);


--
-- Name: ix_pl_review_tracker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_review_tracker_id ON public.pl_review_tracker USING btree (id);


--
-- Name: ix_pl_review_tracker_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_review_tracker_org_id ON public.pl_review_tracker USING btree (org_id);


--
-- Name: ix_pl_sourcing_leads_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_sourcing_leads_id ON public.pl_sourcing_leads USING btree (id);


--
-- Name: ix_pl_statements_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pl_statements_id ON public.pl_statements USING btree (id);


--
-- Name: ix_pnl_line_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pnl_line_items_id ON public.pnl_line_items USING btree (id);


--
-- Name: ix_pnl_line_items_pnl_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pnl_line_items_pnl_id ON public.pnl_line_items USING btree (pnl_id);


--
-- Name: ix_po_line_items_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_line_items_asin ON public.po_line_items USING btree (asin);


--
-- Name: ix_po_line_items_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_line_items_brand ON public.po_line_items USING btree (brand);


--
-- Name: ix_po_line_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_line_items_id ON public.po_line_items USING btree (id);


--
-- Name: ix_po_line_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_line_items_po_id ON public.po_line_items USING btree (po_id);


--
-- Name: ix_po_status_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_status_logs_created_at ON public.po_status_logs USING btree (created_at);


--
-- Name: ix_po_status_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_status_logs_id ON public.po_status_logs USING btree (id);


--
-- Name: ix_po_status_logs_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_po_status_logs_po_id ON public.po_status_logs USING btree (po_id);


--
-- Name: ix_ppc_action_plans_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_action_plans_org_id ON public.ppc_action_plans USING btree (org_id);


--
-- Name: ix_ppc_ad_groups_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_ad_groups_campaign_id ON public.ppc_ad_groups USING btree (campaign_id);


--
-- Name: ix_ppc_ad_groups_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_ad_groups_id ON public.ppc_ad_groups USING btree (id);


--
-- Name: ix_ppc_bid_changes_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_bid_changes_plan_id ON public.ppc_bid_changes USING btree (plan_id);


--
-- Name: ix_ppc_budget_pacing_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_budget_pacing_client_id ON public.ppc_budget_pacing USING btree (client_id);


--
-- Name: ix_ppc_budget_pacing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_budget_pacing_id ON public.ppc_budget_pacing USING btree (id);


--
-- Name: ix_ppc_budget_pacing_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_budget_pacing_org_id ON public.ppc_budget_pacing USING btree (org_id);


--
-- Name: ix_ppc_campaigns_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_campaigns_id ON public.ppc_campaigns USING btree (id);


--
-- Name: ix_ppc_campaigns_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_campaigns_org_id ON public.ppc_campaigns USING btree (org_id);


--
-- Name: ix_ppc_daypart_schedules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_daypart_schedules_id ON public.ppc_daypart_schedules USING btree (id);


--
-- Name: ix_ppc_keyword_harvests_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_keyword_harvests_plan_id ON public.ppc_keyword_harvests USING btree (plan_id);


--
-- Name: ix_ppc_keywords_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_keywords_campaign_id ON public.ppc_keywords USING btree (campaign_id);


--
-- Name: ix_ppc_keywords_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_keywords_id ON public.ppc_keywords USING btree (id);


--
-- Name: ix_ppc_negative_keywords_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_negative_keywords_plan_id ON public.ppc_negative_keywords USING btree (plan_id);


--
-- Name: ix_ppc_rules_config_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_rules_config_org_id ON public.ppc_rules_config USING btree (org_id);


--
-- Name: ix_ppc_search_terms_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_search_terms_client_id ON public.ppc_search_terms USING btree (client_id);


--
-- Name: ix_ppc_search_terms_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_search_terms_id ON public.ppc_search_terms USING btree (id);


--
-- Name: ix_ppc_search_terms_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ppc_search_terms_org_id ON public.ppc_search_terms USING btree (org_id);


--
-- Name: ix_product_scores_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_scores_asin ON public.product_scores USING btree (asin);


--
-- Name: ix_product_scores_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_scores_id ON public.product_scores USING btree (id);


--
-- Name: ix_product_scores_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_scores_org_id ON public.product_scores USING btree (org_id);


--
-- Name: ix_product_scores_scored_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_scores_scored_at ON public.product_scores USING btree (scored_at);


--
-- Name: ix_product_status_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_status_logs_created_at ON public.product_status_logs USING btree (created_at);


--
-- Name: ix_product_status_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_status_logs_id ON public.product_status_logs USING btree (id);


--
-- Name: ix_product_status_logs_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_status_logs_product_id ON public.product_status_logs USING btree (product_id);


--
-- Name: ix_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_id ON public.products USING btree (id);


--
-- Name: ix_products_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_org_id ON public.products USING btree (org_id);


--
-- Name: ix_profit_analyses_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profit_analyses_asin ON public.profit_analyses USING btree (asin);


--
-- Name: ix_profit_analyses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profit_analyses_id ON public.profit_analyses USING btree (id);


--
-- Name: ix_profit_analyses_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profit_analyses_org_id ON public.profit_analyses USING btree (org_id);


--
-- Name: ix_purchase_orders_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_client_id ON public.purchase_orders USING btree (client_id);


--
-- Name: ix_purchase_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_created_at ON public.purchase_orders USING btree (created_at);


--
-- Name: ix_purchase_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_id ON public.purchase_orders USING btree (id);


--
-- Name: ix_purchase_orders_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_org_id ON public.purchase_orders USING btree (org_id);


--
-- Name: ix_purchase_orders_po_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_purchase_orders_po_number ON public.purchase_orders USING btree (po_number);


--
-- Name: ix_purchase_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: ix_purchase_orders_supplier_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_supplier_name ON public.purchase_orders USING btree (supplier_name);


--
-- Name: ix_purchase_orders_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_tracking_number ON public.purchase_orders USING btree (tracking_number);


--
-- Name: ix_report_schedules_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_report_schedules_org_id ON public.report_schedules USING btree (org_id);


--
-- Name: ix_report_templates_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_report_templates_org_id ON public.report_templates USING btree (org_id);


--
-- Name: ix_restock_alerts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_restock_alerts_id ON public.restock_alerts USING btree (id);


--
-- Name: ix_scout_results_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scout_results_asin ON public.scout_results USING btree (asin);


--
-- Name: ix_scout_results_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scout_results_id ON public.scout_results USING btree (id);


--
-- Name: ix_scout_results_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scout_results_org_id ON public.scout_results USING btree (org_id);


--
-- Name: ix_sop_executions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sop_executions_id ON public.sop_executions USING btree (id);


--
-- Name: ix_sop_executions_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sop_executions_org_id ON public.sop_executions USING btree (org_id);


--
-- Name: ix_sop_templates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sop_templates_id ON public.sop_templates USING btree (id);


--
-- Name: ix_sop_templates_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sop_templates_org_id ON public.sop_templates USING btree (org_id);


--
-- Name: ix_storage_fee_projections_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_storage_fee_projections_id ON public.storage_fee_projections USING btree (id);


--
-- Name: ix_suppliers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_suppliers_id ON public.suppliers USING btree (id);


--
-- Name: ix_suppliers_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_suppliers_org_id ON public.suppliers USING btree (org_id);


--
-- Name: ix_tasks_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tasks_id ON public.tasks USING btree (id);


--
-- Name: ix_tasks_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tasks_org_id ON public.tasks USING btree (org_id);


--
-- Name: ix_team_capacity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_team_capacity_id ON public.team_capacity USING btree (id);


--
-- Name: ix_team_capacity_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_team_capacity_org_id ON public.team_capacity USING btree (org_id);


--
-- Name: ix_time_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_time_entries_id ON public.time_entries USING btree (id);


--
-- Name: ix_time_entries_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_time_entries_org_id ON public.time_entries USING btree (org_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_org_id ON public.users USING btree (org_id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_weekly_reports_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_weekly_reports_id ON public.weekly_reports USING btree (id);


--
-- Name: ix_weekly_reports_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_weekly_reports_org_id ON public.weekly_reports USING btree (org_id);


--
-- Name: ix_wholesale_deal_scores_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_deal_scores_id ON public.wholesale_deal_scores USING btree (id);


--
-- Name: ix_wholesale_po_line_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_po_line_items_id ON public.wholesale_po_line_items USING btree (id);


--
-- Name: ix_wholesale_products_asin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_products_asin ON public.wholesale_products USING btree (asin);


--
-- Name: ix_wholesale_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_products_id ON public.wholesale_products USING btree (id);


--
-- Name: ix_wholesale_products_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_products_org_id ON public.wholesale_products USING btree (org_id);


--
-- Name: ix_wholesale_purchase_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_purchase_orders_id ON public.wholesale_purchase_orders USING btree (id);


--
-- Name: ix_wholesale_purchase_orders_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_purchase_orders_org_id ON public.wholesale_purchase_orders USING btree (org_id);


--
-- Name: ix_wholesale_purchase_orders_po_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_wholesale_purchase_orders_po_number ON public.wholesale_purchase_orders USING btree (po_number);


--
-- Name: ix_wholesale_suppliers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_suppliers_id ON public.wholesale_suppliers USING btree (id);


--
-- Name: ix_wholesale_suppliers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_suppliers_name ON public.wholesale_suppliers USING btree (name);


--
-- Name: ix_wholesale_suppliers_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wholesale_suppliers_org_id ON public.wholesale_suppliers USING btree (org_id);


--
-- Name: account_health_snapshots account_health_snapshots_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_health_snapshots
    ADD CONSTRAINT account_health_snapshots_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: account_violations account_violations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_violations
    ADD CONSTRAINT account_violations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: activity_logs activity_logs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: automation_logs automation_logs_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.automation_rules(id);


--
-- Name: automation_rules automation_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: brand_approvals brand_approvals_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_approvals
    ADD CONSTRAINT brand_approvals_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: brand_documents brand_documents_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_documents
    ADD CONSTRAINT brand_documents_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.brand_approvals(id);


--
-- Name: brand_timeline brand_timeline_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_timeline
    ADD CONSTRAINT brand_timeline_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.brand_approvals(id);


--
-- Name: buybox_alerts buybox_alerts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_alerts
    ADD CONSTRAINT buybox_alerts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: buybox_alerts buybox_alerts_tracker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_alerts
    ADD CONSTRAINT buybox_alerts_tracker_id_fkey FOREIGN KEY (tracker_id) REFERENCES public.buybox_trackers(id);


--
-- Name: buybox_history buybox_history_tracker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_history
    ADD CONSTRAINT buybox_history_tracker_id_fkey FOREIGN KEY (tracker_id) REFERENCES public.buybox_trackers(id);


--
-- Name: buybox_trackers buybox_trackers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buybox_trackers
    ADD CONSTRAINT buybox_trackers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: cash_flow_projections cash_flow_projections_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_projections
    ADD CONSTRAINT cash_flow_projections_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: cash_flow_projections cash_flow_projections_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_flow_projections
    ADD CONSTRAINT cash_flow_projections_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_messages client_messages_client_portal_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_messages
    ADD CONSTRAINT client_messages_client_portal_user_id_fkey FOREIGN KEY (client_portal_user_id) REFERENCES public.client_portal_users(id);


--
-- Name: client_messages client_messages_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_messages
    ADD CONSTRAINT client_messages_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_notes client_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: client_notes client_notes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client_profiles(id);


--
-- Name: client_notes client_notes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_notes
    ADD CONSTRAINT client_notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_pnl client_pnl_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl
    ADD CONSTRAINT client_pnl_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_pnl client_pnl_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl
    ADD CONSTRAINT client_pnl_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id);


--
-- Name: client_pnl client_pnl_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pnl
    ADD CONSTRAINT client_pnl_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_portal_users client_portal_users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_portal_users
    ADD CONSTRAINT client_portal_users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_portal_users client_portal_users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_portal_users
    ADD CONSTRAINT client_portal_users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_profiles client_profiles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_profiles
    ADD CONSTRAINT client_profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: client_profiles client_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_profiles
    ADD CONSTRAINT client_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: clients clients_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: dwm_approvals dwm_approvals_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_approvals
    ADD CONSTRAINT dwm_approvals_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: dwm_approvals dwm_approvals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_approvals
    ADD CONSTRAINT dwm_approvals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dwm_daily_brands dwm_daily_brands_daily_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_brands
    ADD CONSTRAINT dwm_daily_brands_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.dwm_daily_logs(id) ON DELETE CASCADE;


--
-- Name: dwm_daily_logs dwm_daily_logs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_logs
    ADD CONSTRAINT dwm_daily_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: dwm_daily_logs dwm_daily_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_logs
    ADD CONSTRAINT dwm_daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: dwm_daily_products dwm_daily_products_daily_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dwm_daily_products
    ADD CONSTRAINT dwm_daily_products_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.dwm_daily_logs(id) ON DELETE CASCADE;


--
-- Name: expense_categories expense_categories_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: expense_entries expense_entries_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: expense_entries expense_entries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: expense_entries expense_entries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: expense_entries expense_entries_pl_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_pl_statement_id_fkey FOREIGN KEY (pl_statement_id) REFERENCES public.pl_statements(id);


--
-- Name: fba_shipment_items fba_shipment_items_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipment_items
    ADD CONSTRAINT fba_shipment_items_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.fba_shipments(id);


--
-- Name: fba_shipments fba_shipments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fba_shipments
    ADD CONSTRAINT fba_shipments_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: fbm_orders_items fbm_orders_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders_items
    ADD CONSTRAINT fbm_orders_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.fbm_orders(id);


--
-- Name: fbm_orders fbm_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbm_orders
    ADD CONSTRAINT fbm_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: generated_reports generated_reports_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT generated_reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id);


--
-- Name: intelligence_alerts intelligence_alerts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_alerts
    ADD CONSTRAINT intelligence_alerts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: intelligence_alerts intelligence_alerts_related_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intelligence_alerts
    ADD CONSTRAINT intelligence_alerts_related_client_id_fkey FOREIGN KEY (related_client_id) REFERENCES public.clients(id);


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: invoices invoices_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: invoices invoices_pl_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pl_statement_id_fkey FOREIGN KEY (pl_statement_id) REFERENCES public.pl_statements(id);


--
-- Name: kpi_targets kpi_targets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_targets
    ADD CONSTRAINT kpi_targets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: onboarding_checklist onboarding_checklist_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client_profiles(id);


--
-- Name: onboarding_checklist onboarding_checklist_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: pipeline_products pipeline_products_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_products
    ADD CONSTRAINT pipeline_products_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: pipeline_products pipeline_products_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_products
    ADD CONSTRAINT pipeline_products_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: pipeline_products pipeline_products_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_products
    ADD CONSTRAINT pipeline_products_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: pl_brand_assets pl_brand_assets_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_brand_assets
    ADD CONSTRAINT pl_brand_assets_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pl_products(id);


--
-- Name: pl_launch_plans pl_launch_plans_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_launch_plans
    ADD CONSTRAINT pl_launch_plans_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pl_products(id);


--
-- Name: pl_sourcing_leads pl_sourcing_leads_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_sourcing_leads
    ADD CONSTRAINT pl_sourcing_leads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pl_products(id);


--
-- Name: pl_statements pl_statements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_statements
    ADD CONSTRAINT pl_statements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: pl_statements pl_statements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_statements
    ADD CONSTRAINT pl_statements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pl_statements pl_statements_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_statements
    ADD CONSTRAINT pl_statements_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: pnl_line_items pnl_line_items_pnl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_line_items
    ADD CONSTRAINT pnl_line_items_pnl_id_fkey FOREIGN KEY (pnl_id) REFERENCES public.client_pnl(id);


--
-- Name: po_line_items po_line_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_line_items
    ADD CONSTRAINT po_line_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: po_status_logs po_status_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_status_logs
    ADD CONSTRAINT po_status_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: po_status_logs po_status_logs_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_status_logs
    ADD CONSTRAINT po_status_logs_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: ppc_ad_groups ppc_ad_groups_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_ad_groups
    ADD CONSTRAINT ppc_ad_groups_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ppc_campaigns(id);


--
-- Name: ppc_bid_changes ppc_bid_changes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_bid_changes
    ADD CONSTRAINT ppc_bid_changes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.ppc_action_plans(id);


--
-- Name: ppc_budget_pacing ppc_budget_pacing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_budget_pacing
    ADD CONSTRAINT ppc_budget_pacing_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ppc_campaigns(id);


--
-- Name: ppc_campaigns ppc_campaigns_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_campaigns
    ADD CONSTRAINT ppc_campaigns_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: ppc_daypart_schedules ppc_daypart_schedules_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_daypart_schedules
    ADD CONSTRAINT ppc_daypart_schedules_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ppc_campaigns(id);


--
-- Name: ppc_keyword_harvests ppc_keyword_harvests_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keyword_harvests
    ADD CONSTRAINT ppc_keyword_harvests_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.ppc_action_plans(id);


--
-- Name: ppc_keywords ppc_keywords_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_keywords
    ADD CONSTRAINT ppc_keywords_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ppc_campaigns(id);


--
-- Name: ppc_negative_keywords ppc_negative_keywords_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_negative_keywords
    ADD CONSTRAINT ppc_negative_keywords_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.ppc_action_plans(id);


--
-- Name: ppc_search_terms ppc_search_terms_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppc_search_terms
    ADD CONSTRAINT ppc_search_terms_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.ppc_campaigns(id);


--
-- Name: product_scores product_scores_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_scores
    ADD CONSTRAINT product_scores_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: product_status_logs product_status_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_logs
    ADD CONSTRAINT product_status_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: product_status_logs product_status_logs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_logs
    ADD CONSTRAINT product_status_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pipeline_products(id);


--
-- Name: products products_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: profit_analyses profit_analyses_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_analyses
    ADD CONSTRAINT profit_analyses_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: purchase_orders purchase_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: report_schedules report_schedules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id);


--
-- Name: restock_alerts restock_alerts_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_alerts
    ADD CONSTRAINT restock_alerts_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: scout_results scout_results_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_results
    ADD CONSTRAINT scout_results_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: sop_executions sop_executions_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_executions
    ADD CONSTRAINT sop_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- Name: sop_executions sop_executions_sop_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_executions
    ADD CONSTRAINT sop_executions_sop_template_id_fkey FOREIGN KEY (sop_template_id) REFERENCES public.sop_templates(id);


--
-- Name: sop_executions sop_executions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sop_executions
    ADD CONSTRAINT sop_executions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: storage_fee_projections storage_fee_projections_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_fee_projections
    ADD CONSTRAINT storage_fee_projections_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: suppliers suppliers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: tasks tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: team_capacity team_capacity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_capacity
    ADD CONSTRAINT team_capacity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: time_entries time_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: weekly_reports weekly_reports_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: wholesale_deal_scores wholesale_deal_scores_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_deal_scores
    ADD CONSTRAINT wholesale_deal_scores_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.wholesale_products(id);


--
-- Name: wholesale_po_line_items wholesale_po_line_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_po_line_items
    ADD CONSTRAINT wholesale_po_line_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.wholesale_purchase_orders(id);


--
-- Name: wholesale_po_line_items wholesale_po_line_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_po_line_items
    ADD CONSTRAINT wholesale_po_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.wholesale_products(id);


--
-- Name: wholesale_products wholesale_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_products
    ADD CONSTRAINT wholesale_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.wholesale_suppliers(id);


--
-- Name: wholesale_purchase_orders wholesale_purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wholesale_purchase_orders
    ADD CONSTRAINT wholesale_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.wholesale_suppliers(id);


--
-- PostgreSQL database dump complete
--

\unrestrict EXaf7vyYZCrMQu1dlz2gQts6Uqh2rQn4tVWPc5XHVvxeimkxIHJeaAwwZ5DKcAo

