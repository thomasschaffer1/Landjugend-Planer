-- ============================================================
-- Landjugend Festplaner – Supabase-Datenbank
-- Dieses komplette Skript im Supabase SQL-Editor einfügen
-- und einmal auf "Run" klicken. Fertig.
-- ============================================================

-- ---------- Tabellen ----------

create table if not exists users (
  name text primary key,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  title text not null,
  assigned_to text,
  done boolean not null default false,
  done_by text,
  done_at text,
  notes text default '',
  moved_from text,
  created_at timestamptz default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  done_by text,
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists vehicle_bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  day text not null,
  slot text not null check (slot in ('vormittag', 'nachmittag')),
  booked_by text not null,
  created_at timestamptz default now(),
  unique (vehicle_id, day, slot)  -- verhindert Doppelbuchungen
);

-- ---------- Zugriff (RLS) ----------
-- Die App nutzt bewusst keine Passwörter (Anmeldung nur mit Namen).
-- Deshalb bekommen alle Besucher mit dem öffentlichen "anon"-Schlüssel
-- Lese- und Schreibrechte. Für eine Vereins-App ist das in Ordnung,
-- solange der Link nur intern geteilt wird.

alter table users enable row level security;
alter table tasks enable row level security;
alter table stores enable row level security;
alter table store_items enable row level security;
alter table vehicles enable row level security;
alter table vehicle_bookings enable row level security;

create policy "alle dürfen alles" on users for all using (true) with check (true);
create policy "alle dürfen alles" on tasks for all using (true) with check (true);
create policy "alle dürfen alles" on stores for all using (true) with check (true);
create policy "alle dürfen alles" on store_items for all using (true) with check (true);
create policy "alle dürfen alles" on vehicles for all using (true) with check (true);
create policy "alle dürfen alles" on vehicle_bookings for all using (true) with check (true);

-- ---------- Live-Abgleich (Realtime) ----------

alter publication supabase_realtime add table users;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table stores;
alter publication supabase_realtime add table store_items;
alter publication supabase_realtime add table vehicles;
alter publication supabase_realtime add table vehicle_bookings;

-- ---------- Startdaten: Fahrzeuge ----------

insert into vehicles (name) values
  ('Weißer Bus'),
  ('Pickup'),
  ('Pritsche');

-- ---------- Startdaten: Geschäfte ----------

insert into stores (name) values
  ('Transgourmet'),
  ('Baumarkt'),
  ('Supermarkt');

-- ---------- Startdaten: alle To-dos der Festwoche ----------

insert into tasks (day, title, assigned_to) values
  -- Montag
  ('Montag', 'Absperrgitter und Mülltonnen abholen', 'Thomas'),
  ('Montag', 'Hof waschen', null),
  ('Montag', 'Fertig ausräumen', null),
  ('Montag', 'Spinnenweben entfernen', null),
  ('Montag', 'Arbeitskorb anliefern', 'Thomas'),
  ('Montag', 'Anlieferung Getränke', null),
  ('Montag', 'Getränke Mengen kontrollieren', null),
  ('Montag', 'AKM anmelden', null),
  ('Montag', 'Bilderrahmen bauen', null),
  ('Montag', 'Glühbirnen kontrollieren und bei Bedarf nachbestellen', null),
  -- Dienstag
  ('Dienstag', 'Galerie in der Halle abhaken', null),
  ('Dienstag', 'Bars einteilen und ausstecken', null),
  ('Dienstag', 'Verbrauchsmaterialien kontrollieren und Einkaufsliste schreiben', null),
  ('Dienstag', 'Absperrgitter aufstellen', null),
  ('Dienstag', 'Transparente aufhängen', null),
  ('Dienstag', 'Verlosungen und Schätzspiele erstellen', null),
  ('Dienstag', 'Sponsoren durchbesprechen mit Johanna', null),
  ('Dienstag', 'Preislisten zusammenstellen und drucken', null),
  ('Dienstag', 'Weinbar aufbauen', null),
  ('Dienstag', 'Hauptbar aufbauen', null),
  ('Dienstag', 'Küche/Essen aufbauen', null),
  ('Dienstag', 'Beleuchtung Bars aufbauen', null),
  ('Dienstag', 'Preisschilder und Programm schreiben', null),
  ('Dienstag', 'Eingangsboden abholen', null),
  -- Mittwoch
  ('Mittwoch', 'Bars fertig aufbauen', null),
  ('Mittwoch', 'Wasser vorbereiten', null),
  ('Mittwoch', 'Ankunft WC-Wagen', null),
  ('Mittwoch', 'Abwasser/Klowagen anschließen', null),
  ('Mittwoch', 'Transparente abholen', null),
  ('Mittwoch', 'Barschilder malen', null),
  ('Mittwoch', 'Preisschilder und Programm drucken', null),
  -- Donnerstag
  ('Donnerstag', 'Transgourmet-Abholung', null),
  ('Donnerstag', 'Bühne aufbauen', null),
  ('Donnerstag', 'Strom herstellen', null),
  ('Donnerstag', 'Letzte Sponsoren abfahren', null),
  ('Donnerstag', 'Kühlanhänger abholen', null),
  ('Donnerstag', 'Getränke einkühlen', null),
  ('Donnerstag', 'Orderman aufbauen und einschulen', null),
  ('Donnerstag', 'Biertische bei den Arbeitsplätzen aufstellen', null),
  ('Donnerstag', 'Preisschilder aufhängen', null),
  ('Donnerstag', 'Durchlaufkühler einstellen', null),
  ('Donnerstag', 'Snacks besorgen (Transgourmet)', null),
  -- Freitag
  ('Freitag', 'Dekoration aufbauen', null),
  ('Freitag', 'Biertische und Schirme aufstellen', null),
  ('Freitag', 'Biertische durchnummerieren', null),
  ('Freitag', 'Alles sauber zusammenkehren', null),
  ('Freitag', 'Müllsäcke aufhängen', null),
  ('Freitag', 'Bier verkosten', null),
  ('Freitag', 'Einschulung Barchefs', null),
  -- Samstag
  ('Samstag', '8 Uhr – Treffpunkt Vorstand', null),
  ('Samstag', '9 Uhr – Treffpunkt Mitglieder', null),
  ('Samstag', 'Einteilung Fest', null),
  ('Samstag', 'Vorbesprechung Fest', null);

-- ---------- Bekannte Namen ----------

insert into users (name) values ('Thomas'), ('Johanna')
on conflict (name) do nothing;
