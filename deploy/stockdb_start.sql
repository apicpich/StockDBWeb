--
-- PostgreSQL database dump
--

-- Dumped from database version 13.1
-- Dumped by pg_dump version 16.4

-- Started on 2024-09-16 19:51:44

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 200 (class 1259 OID 50297)
-- Name: APInvoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."APInvoice" (
    "StInvID" text NOT NULL,
    "StInvDate" timestamp with time zone NOT NULL,
    "StInvDepart" text NOT NULL,
    "StInvRef" text,
    "StInvMemo" text,
    "StInvUpdate" boolean NOT NULL,
    "StInvDateUpdate" timestamp with time zone,
    "StInvStatus" integer,
    "StKeyUser" text NOT NULL,
    "StInvApprove" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."APInvoice" OWNER TO postgres;

--
-- TOC entry 201 (class 1259 OID 50304)
-- Name: APInvoiceDetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."APInvoiceDetail" (
    "DtDID" bigint NOT NULL,
    "DtLotID" integer NOT NULL,
    "DtInvID" text NOT NULL,
    "DtDrugID" text NOT NULL,
    "DtAmount" real NOT NULL,
    "DtPack" integer DEFAULT 1 NOT NULL,
    "DtPrice" numeric(15,6) DEFAULT 0 NOT NULL,
    "DtLot" text,
    "DtExp" date,
    "DtTNID" integer DEFAULT 0 NOT NULL,
    "DtRemark" text
);


ALTER TABLE public."APInvoiceDetail" OWNER TO postgres;

--
-- TOC entry 202 (class 1259 OID 50313)
-- Name: RQInvoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RQInvoice" (
    "StInvID" text NOT NULL,
    "StInvDate" timestamp with time zone NOT NULL,
    "StInvDepart" text NOT NULL,
    "StInvRef" text,
    "StInvMemo" text,
    "StInvUpdate" boolean NOT NULL,
    "StInvDateUpdate" timestamp with time zone,
    "StInvStatus" integer,
    "StKeyUser" text NOT NULL,
    "StKeyApprove" text
);


ALTER TABLE public."RQInvoice" OWNER TO postgres;

--
-- TOC entry 203 (class 1259 OID 50319)
-- Name: RQInvoiceDetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RQInvoiceDetail" (
    "DtDID" bigint NOT NULL,
    "DtInvID" text NOT NULL,
    "DtDrugID" text NOT NULL,
    "DtRQAmount" real NOT NULL,
    "DtAmount" real NOT NULL,
    "DtPack" integer DEFAULT 1 NOT NULL,
    "DtPrice" numeric(15,6) DEFAULT 0 NOT NULL,
    "DtMonthBefore" real DEFAULT 0 NOT NULL,
    "DtStockNow" real DEFAULT 0 NOT NULL,
    "DtMonth" real DEFAULT 0 NOT NULL,
    "DtRemark" text
);


ALTER TABLE public."RQInvoiceDetail" OWNER TO postgres;

--
-- TOC entry 204 (class 1259 OID 50330)
-- Name: depart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.depart (
    depart_id text NOT NULL,
    depart_name text NOT NULL,
    depart_address text,
    depart_remark text,
    depart_line_token text,
    depart_time_in timestamp with time zone,
    depart_type smallint DEFAULT 0 NOT NULL,
    depart_autosave boolean DEFAULT false NOT NULL
);


ALTER TABLE public.depart OWNER TO postgres;

--
-- TOC entry 205 (class 1259 OID 50338)
-- Name: drugcat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drugcat (
    drug_id text NOT NULL,
    cat_id text
);


ALTER TABLE public.drugcat OWNER TO postgres;

--
-- TOC entry 206 (class 1259 OID 50344)
-- Name: myuser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.myuser (
    user_name text NOT NULL,
    first_name text NOT NULL,
    last_name text,
    role integer DEFAULT 99 NOT NULL,
    depart text NOT NULL,
    pass text NOT NULL
);


ALTER TABLE public.myuser OWNER TO postgres;

--
-- TOC entry 207 (class 1259 OID 50351)
-- Name: status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status (
    status_id integer NOT NULL,
    status_name text NOT NULL
);


ALTER TABLE public.status OWNER TO postgres;

--
-- TOC entry 3068 (class 0 OID 50297)
-- Dependencies: 200
-- Data for Name: APInvoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."APInvoice" ("StInvID", "StInvDate", "StInvDepart", "StInvRef", "StInvMemo", "StInvUpdate", "StInvDateUpdate", "StInvStatus", "StKeyUser", "StInvApprove") FROM stdin;
\.


--
-- TOC entry 3069 (class 0 OID 50304)
-- Dependencies: 201
-- Data for Name: APInvoiceDetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."APInvoiceDetail" ("DtDID", "DtLotID", "DtInvID", "DtDrugID", "DtAmount", "DtPack", "DtPrice", "DtLot", "DtExp", "DtTNID", "DtRemark") FROM stdin;
\.


--
-- TOC entry 3070 (class 0 OID 50313)
-- Dependencies: 202
-- Data for Name: RQInvoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RQInvoice" ("StInvID", "StInvDate", "StInvDepart", "StInvRef", "StInvMemo", "StInvUpdate", "StInvDateUpdate", "StInvStatus", "StKeyUser", "StKeyApprove") FROM stdin;
\.


--
-- TOC entry 3071 (class 0 OID 50319)
-- Dependencies: 203
-- Data for Name: RQInvoiceDetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RQInvoiceDetail" ("DtDID", "DtInvID", "DtDrugID", "DtRQAmount", "DtAmount", "DtPack", "DtPrice", "DtMonthBefore", "DtStockNow", "DtMonth", "DtRemark") FROM stdin;
\.


--
-- TOC entry 3072 (class 0 OID 50330)
-- Dependencies: 204
-- Data for Name: depart; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.depart (depart_id, depart_name, depart_address, depart_remark, depart_line_token, depart_time_in, depart_type, depart_autosave) FROM stdin;
center	คลังเวชภัณฑ์ รพช.	\N	\N	\N	\N	0	f
\.


--
-- TOC entry 3073 (class 0 OID 50338)
-- Dependencies: 205
-- Data for Name: drugcat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drugcat (drug_id, cat_id) FROM stdin;
\.


--
-- TOC entry 3074 (class 0 OID 50344)
-- Dependencies: 206
-- Data for Name: myuser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.myuser (user_name, first_name, last_name, role, depart, pass) FROM stdin;
admin	Admin	\N	0	center	$2a$12$sD/vFFo3WB59c7UuMSvQB.QER3GEGuwO1YDDbxR1wFJGNVpTsj42y
\.


--
-- TOC entry 3075 (class 0 OID 50351)
-- Dependencies: 207
-- Data for Name: status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status (status_id, status_name) FROM stdin;
1	ขอเบิกทั่วไป
\.


--
-- TOC entry 2905 (class 2606 OID 50358)
-- Name: APInvoiceDetail APInvoiceDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."APInvoiceDetail"
    ADD CONSTRAINT "APInvoiceDetail_pkey" PRIMARY KEY ("DtDID");


--
-- TOC entry 2897 (class 2606 OID 50360)
-- Name: APInvoice APInvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."APInvoice"
    ADD CONSTRAINT "APInvoice_pkey" PRIMARY KEY ("StInvID");


--
-- TOC entry 2917 (class 2606 OID 50362)
-- Name: RQInvoiceDetail RQInvoiceDetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RQInvoiceDetail"
    ADD CONSTRAINT "RQInvoiceDetail_pkey" PRIMARY KEY ("DtDID");


--
-- TOC entry 2909 (class 2606 OID 50364)
-- Name: RQInvoice RQInvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RQInvoice"
    ADD CONSTRAINT "RQInvoice_pkey" PRIMARY KEY ("StInvID");


--
-- TOC entry 2922 (class 2606 OID 50366)
-- Name: depart depart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.depart
    ADD CONSTRAINT depart_pkey PRIMARY KEY (depart_id);


--
-- TOC entry 2925 (class 2606 OID 50368)
-- Name: drugcat drugcat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drugcat
    ADD CONSTRAINT drugcat_pkey PRIMARY KEY (drug_id);


--
-- TOC entry 2928 (class 2606 OID 50370)
-- Name: myuser myuser_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.myuser
    ADD CONSTRAINT myuser_pkey PRIMARY KEY (user_name);


--
-- TOC entry 2930 (class 2606 OID 50372)
-- Name: status status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status
    ADD CONSTRAINT status_pkey PRIMARY KEY (status_id);


--
-- TOC entry 2906 (class 1259 OID 50373)
-- Name: ap_drugid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ap_drugid_idx ON public."APInvoiceDetail" USING btree ("DtDrugID");


--
-- TOC entry 2898 (class 1259 OID 50374)
-- Name: ap_invdate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ap_invdate_idx ON public."APInvoice" USING btree ("StInvDate");


--
-- TOC entry 2899 (class 1259 OID 50375)
-- Name: ap_invref_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ap_invref_idx ON public."APInvoice" USING btree ("StInvRef");


--
-- TOC entry 2900 (class 1259 OID 50376)
-- Name: ap_update_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ap_update_date_idx ON public."APInvoice" USING btree ("StInvDateUpdate");


--
-- TOC entry 2901 (class 1259 OID 50377)
-- Name: ap_update_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ap_update_idx ON public."APInvoice" USING btree ("StInvUpdate") WHERE ("StInvUpdate" = false);


--
-- TOC entry 2923 (class 1259 OID 50378)
-- Name: cat_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cat_id_idx ON public.drugcat USING btree (cat_id);


--
-- TOC entry 2920 (class 1259 OID 50379)
-- Name: depart_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX depart_name_idx ON public.depart USING btree (depart_name);


--
-- TOC entry 2902 (class 1259 OID 50380)
-- Name: fki_ap-statud_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_ap-statud_fk" ON public."APInvoice" USING btree ("StInvStatus");


--
-- TOC entry 2903 (class 1259 OID 50381)
-- Name: fki_ap_invdepart_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_ap_invdepart_fk ON public."APInvoice" USING btree ("StInvDepart");


--
-- TOC entry 2907 (class 1259 OID 50382)
-- Name: fki_ap_invid_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_ap_invid_fk ON public."APInvoiceDetail" USING btree ("DtInvID");


--
-- TOC entry 2926 (class 1259 OID 50383)
-- Name: fki_depart_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_depart_fk ON public.myuser USING btree (depart);


--
-- TOC entry 2910 (class 1259 OID 50384)
-- Name: fki_rq-statud_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_rq-statud_fk" ON public."RQInvoice" USING btree ("StInvStatus");


--
-- TOC entry 2911 (class 1259 OID 50385)
-- Name: fki_rq_invdepart_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_rq_invdepart_fk ON public."RQInvoice" USING btree ("StInvDepart");


--
-- TOC entry 2918 (class 1259 OID 50386)
-- Name: fki_rq_invid_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_rq_invid_fk ON public."RQInvoiceDetail" USING btree ("DtInvID");


--
-- TOC entry 2919 (class 1259 OID 50387)
-- Name: rq_drugid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rq_drugid_idx ON public."RQInvoiceDetail" USING btree ("DtDrugID");


--
-- TOC entry 2912 (class 1259 OID 50388)
-- Name: rq_invdate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rq_invdate_idx ON public."RQInvoice" USING btree ("StInvDate");


--
-- TOC entry 2913 (class 1259 OID 50389)
-- Name: rq_invref_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rq_invref_idx ON public."RQInvoice" USING btree ("StInvRef");


--
-- TOC entry 2914 (class 1259 OID 50390)
-- Name: rq_update_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rq_update_date_idx ON public."RQInvoice" USING btree ("StInvDateUpdate");


--
-- TOC entry 2915 (class 1259 OID 50391)
-- Name: rq_update_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rq_update_idx ON public."RQInvoice" USING btree ("StInvUpdate") WHERE ("StInvUpdate" = false);


--
-- TOC entry 2931 (class 2606 OID 50392)
-- Name: APInvoice ap-statud_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."APInvoice"
    ADD CONSTRAINT "ap-statud_fk" FOREIGN KEY ("StInvStatus") REFERENCES public.status(status_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 2932 (class 2606 OID 50397)
-- Name: APInvoice ap_invdepart_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."APInvoice"
    ADD CONSTRAINT ap_invdepart_fk FOREIGN KEY ("StInvDepart") REFERENCES public.depart(depart_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 2933 (class 2606 OID 50402)
-- Name: APInvoiceDetail ap_invid_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."APInvoiceDetail"
    ADD CONSTRAINT ap_invid_fk FOREIGN KEY ("DtInvID") REFERENCES public."APInvoice"("StInvID") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2937 (class 2606 OID 50407)
-- Name: myuser depart_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.myuser
    ADD CONSTRAINT depart_fk FOREIGN KEY (depart) REFERENCES public.depart(depart_id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;


--
-- TOC entry 2934 (class 2606 OID 50412)
-- Name: RQInvoice rq-statud_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RQInvoice"
    ADD CONSTRAINT "rq-statud_fk" FOREIGN KEY ("StInvStatus") REFERENCES public.status(status_id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;


--
-- TOC entry 2935 (class 2606 OID 50417)
-- Name: RQInvoice rq_invdepart_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RQInvoice"
    ADD CONSTRAINT rq_invdepart_fk FOREIGN KEY ("StInvDepart") REFERENCES public.depart(depart_id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;


--
-- TOC entry 2936 (class 2606 OID 50422)
-- Name: RQInvoiceDetail rq_invid_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RQInvoiceDetail"
    ADD CONSTRAINT rq_invid_fk FOREIGN KEY ("DtInvID") REFERENCES public."RQInvoice"("StInvID") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- TOC entry 3081 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2024-09-16 19:51:45

--
-- PostgreSQL database dump complete
--

