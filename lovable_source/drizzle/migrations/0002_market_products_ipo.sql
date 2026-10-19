ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products ADD CONSTRAINT products_category_check CHECK (category = ANY (ARRAY['aktie','anleihe','festgeld','flexgeld','ipo']));

INSERT INTO public.products (category,name,issuer,isin,ticker,currency,market_price,buy_price,sell_price,market_price_source,conditions) VALUES
('aktie','SAP SE','SAP','DE0007164600','SAP.DE','EUR',185.98,185.98,185.98,'live','Kurs live, verzögert'),
('aktie','Siemens AG','Siemens','DE0007236101','SIE.DE','EUR',275.40,275.40,275.40,'live','Kurs live, verzögert'),
('aktie','Allianz SE','Allianz','DE0008404005','ALV.DE','EUR',416.20,416.20,416.20,'live','Kurs live, verzögert'),
('aktie','Deutsche Bank AG','Deutsche Bank','DE0005140008','DBK.DE','EUR',31.78,31.78,31.78,'live','Kurs live, verzögert'),
('aktie','Infineon Technologies AG','Infineon','DE0006231004','IFX.DE','EUR',59.28,59.28,59.28,'live','Kurs live, verzögert'),
('aktie','Rheinmetall AG','Rheinmetall','DE0007030033','RHM.DE','EUR',958.30,958.30,958.30,'live','Kurs live, verzögert'),
('aktie','NVIDIA Corporation','NVIDIA','US67066G1040','NVDA','EUR',172.00,172.00,172.00,'live','Kurs live in EUR umgerechnet'),
('aktie','Apple Inc.','Apple','US0378331005','AAPL','EUR',251.00,251.00,251.00,'live','Kurs live in EUR umgerechnet'),
('aktie','Microsoft Corporation','Microsoft','US5949181045','MSFT','EUR',387.00,387.00,387.00,'live','Kurs live in EUR umgerechnet'),
('aktie','Alphabet Inc.','Alphabet','US02079K3059','GOOGL','EUR',259.00,259.00,259.00,'live','Kurs live in EUR umgerechnet'),
('aktie','Amazon.com, Inc.','Amazon','US0231351067','AMZN','EUR',188.00,188.00,188.00,'live','Kurs live in EUR umgerechnet');

INSERT INTO public.products (category,name,issuer,currency,market_price,buy_price,sell_price,nominal_value,coupon_rate,maturity_date,conditions) VALUES
('anleihe','Bundesanleihe 2,50 % 2035','Bundesrepublik Deutschland','EUR',985.00,987.00,983.00,1000,2.50,'2035-02-15','Preis je 1.000 € Nennwert'),
('anleihe','Siemens Finance 3,00 % 2031','Siemens','EUR',1002.00,1004.00,1000.00,1000,3.00,'2031-09-08','Preis je 1.000 € Nennwert'),
('anleihe','BMW Finance 3,25 % 2030','BMW','EUR',1008.00,1010.00,1006.00,1000,3.25,'2030-11-22','Preis je 1.000 € Nennwert'),
('anleihe','Deutsche Telekom 3,50 % 2033','Deutsche Telekom','EUR',1012.00,1014.00,1010.00,1000,3.50,'2033-06-30','Preis je 1.000 € Nennwert'),
('anleihe','Allianz 4,25 % 2034','Allianz','EUR',1025.00,1027.00,1023.00,1000,4.25,'2034-07-05','Preis je 1.000 € Nennwert');

INSERT INTO public.products (category,name,issuer,currency,min_amount,conditions) VALUES
('ipo','Stripe – vorbörsliche Zeichnung','Stripe','EUR',10000,'Zeichnungsanfrage; Zuteilung und Preis legt Ihr Berater fest.'),
('ipo','Revolut – vorbörsliche Zeichnung','Revolut','EUR',10000,'Zeichnungsanfrage; Zuteilung und Preis legt Ihr Berater fest.'),
('ipo','Databricks – vorbörsliche Zeichnung','Databricks','EUR',10000,'Zeichnungsanfrage; Zuteilung und Preis legt Ihr Berater fest.'),
('ipo','Canva – vorbörsliche Zeichnung','Canva','EUR',10000,'Zeichnungsanfrage; Zuteilung und Preis legt Ihr Berater fest.');