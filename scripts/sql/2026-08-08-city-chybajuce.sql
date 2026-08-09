-- Päť obcí, ktoré v `offerra.city` chýbali.
--
-- Našlo sa to až porovnaním s Registrom adries MV SR: RA ich pozná ako
-- platné obce, náš číselník (pôvodne z Wikidata SPARQL) nie. Wikidata ich
-- modeluje tak, že ich pôvodný dotaz nezachytil — Bojnice a Dudince sú
-- vedené ako mesto/kúpeľné mesto, Mužla a Veľké Kapušany majú maďarské
-- náveste. Bez tohto doplnenia sa v nich nedá založiť inzerát VÔBEC
-- a prišli by sme aj o 149 ulíc, ktoré na ne visia.
--
-- Súradnice a počet obyvateľov: Wikidata (P625 / P1082) — ten istý zdroj
-- ako zvyšok číselníka. QID je v komentári, nech sa dá spätne overiť.

insert into offerra.city (name, district, region, population, lat, lon) values
  ('Bojnice',        'okres Prievidza',       'Trenčiansky kraj',     5049, 48.782222, 18.586111), -- Q788753
  ('Dudince',        'okres Krupina',         'Banskobystrický kraj', 1377, 48.168611, 18.880000), -- Q531445
  ('Sklené Teplice', 'okres Žiar nad Hronom', 'Banskobystrický kraj',  373, 48.528000, 18.863000), -- Q23120
  ('Mužla',          'okres Nové Zámky',      'Nitriansky kraj',      1884, 47.792222, 18.597778), -- Q973985
  ('Veľké Kapušany', 'okres Michalovce',      'Košický kraj',         9004, 48.550000, 22.083333)  -- Q842022
on conflict do nothing;

-- Vojenské obvody Javorina, Lešť a Valaškovce sú v RA tiež, ale zámerne
-- ich NEDOPĹŇAME — nemajú trvalých obyvateľov ani ulice a v ponuke obcí
-- by len zavadzali.
