# DAACS Ceramic Recorder

A guided web application for recording historical ceramic sherds using the DAACS (Digital Archaeological Archive of Comparative Slavery) cataloging standard. Designed for fieldwork and lab analysis in Southern Ontario, with assemblages primarily dating from the **late 19th to mid 20th century**.

## What It Does

The app walks catalogers through each DAACS ceramic recording field in a step-by-step wizard:

1. **Identify** — Enter Artifact ID and Count, then select Material and Ware type. Selecting a ware auto-fills default surface types and shows an identification tip card (date range, paste/glaze characteristics, decoration notes)
2. **Form** — Manufacturing Technique, Vessel Category, Form, Completeness. Selecting a manufacturing technique shows DAACS-based diagnostic evidence and reference guidance.
3. **Surfaces & Colour** — Exterior/Interior surface type and colour, paste colour. Colour pickers automatically show the correct colour chart: *Refined Surface Colors* (Individual Glossy swatches) for white-bodied wares (porcelain, whiteware, bone china, etc.) or *DAACS MCRS* swatches for non-white-bodied wares
4. **Condition** — Evidence of Burning, Post-Manufacturing Modification, Wear
5. **Decoration** — Toggle decorated/undecorated; add multiple decoration rows with Technique, Colour, Stylistic Element (all 544 DAACS elements, searchable), Motif, Genre, and Pattern Name
6. **Base Mark** — Type, colour, reference (optional)
7. **Measurements** — Thickness, Max Size, Weight, Rim/Base dimensions (optional)
8. **Review & Save** — Summary card before committing to the session log

Completed records accumulate in a **session log** at the bottom of the page. The full session can be exported as a **CSV** file at any time.

## Sources

### Primary Source

**DAACS — Digital Archaeological Archive of Comparative Slavery**  
[daacs.org](https://www.daacs.org/)

All field names, authority terms, colour systems, and recording protocols are drawn directly from:
- [DAACS Ceramics Cataloging Manual (October 2018)](https://www.daacs.org/about-the-database/daacs-cataloging-manual/)
- [DAACS Ceramic Table — authority terms for all fields](https://www.daacs.org/about-the-database/database-structure/ceramic-table/)
- [DAACS Color Data](https://www.daacs.org/about-the-database/daacs-color-data/)

### Identification Support

**Maryland Archaeological Conservation Laboratory — Diagnostic Artifacts in Maryland**  
[apps.jefpat.maryland.gov/diagnostic](https://apps.jefpat.maryland.gov/diagnostic/HistoricCeramics/HistoricCeramics.aspx)

Ware identification tips (defining attributes, date ranges, paste and glaze descriptions) are drawn from this reference for the following wares: Whiteware, Ironstone/White Granite, Bone China, Creamware, Pearlware, Chinese Hard-Paste Porcelain, Soft-Paste Porcelain, American Stoneware, White Salt Glaze, Delftware, and others.

**Saint Mary's University — Archaeology Lab Ceramics Database**  
[smu.ca/anthropology/lab-ceramics-database.html](https://www.smu.ca/anthropology/lab-ceramics-database.html)

Provides supplementary reference context for ceramic types commonly found on 18th–19th century archaeological sites in Atlantic Canada and the Northeast.

**Something Old Something Chic — The Secret Language of Ceramic Glazes Explained**<br>
[somethingoldsomethingchic.com/blogs/news/ceramic-glazes-explained](https://somethingoldsomethingchic.com/blogs/news/ceramic-glazes-explained)

Provides supplementary visual and descriptive guidance for the dynamic surface-treatment helper, including salt glaze, tin glaze, lustre, matte surfaces, and crazing.

## Technical Notes

- Static site — no server required. Hosted on GitHub Pages.
- Munsell → sRGB conversion uses [munsell.js](https://github.com/privet-kitty/munsell.js) (MPL-2.0) via [esm.sh](https://esm.sh)
- Records can be synchronized to the shared Supabase database after team members sign in by email; CSV export remains available.
- CSV export format matches DAACS field naming conventions

## Supabase Setup

The application uses the Supabase project URL and publishable key configured in [js/supabase.js](js/supabase.js). The publishable key is intentionally browser-visible; Row Level Security (RLS) must remain enabled to protect the database. Never use a `service_role` key in this app.

1. In **Authentication → Providers**, enable Email authentication.
2. In **Authentication → URL Configuration**, set the deployed GitHub Pages URL as the Site URL and add both the deployed URL and local development URL as redirect URLs. Password-recovery links return to this app, which displays the new-password form.
3. In **SQL Editor**, create the table and policies below. These permit signed-in team members to read and add records, while anonymous requests are denied.

```sql
create table public.ceramic_records (
	id uuid primary key,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	created_by uuid not null default auth.uid(),
	modified_by uuid,
	artifact_id text not null,
	count integer not null default 1,
	material text, ware text, manu_tech text, vessel_cat text, form text,
	completeness text, ext_surface text, ext_color text, int_surface text,
	int_color text, paste_color text, oxidized text, burning text,
	wear_location text, wear_pattern text, post_mfg_mod text, decorated text,
	decorations jsonb not null default '[]'::jsonb,
	base_mark text, base_mark_color text, base_mark_ref text,
	thickness numeric, max_size numeric, weight numeric, mended_weight numeric,
	rim_length numeric, rim_diam numeric, mended_rim_diam numeric,
	base_length numeric, base_diam numeric, mended_base_diam numeric,
	notes text
);

alter table public.ceramic_records enable row level security;

create policy "Authenticated users can read ceramic records"
on public.ceramic_records for select to authenticated using (true);

create policy "Authenticated users can add ceramic records"
on public.ceramic_records for insert to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can edit ceramic records"
on public.ceramic_records for update to authenticated
using (true)
with check (true);
```

### Audit Fields Migration

For an existing table, run this migration in **SQL Editor**. It adds `modified_by` and makes Supabase, rather than the browser, record the authenticated user and timestamp whenever a record is created or changed.

```sql
alter table public.ceramic_records
	add column if not exists modified_by uuid;

create or replace function public.set_ceramic_record_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
	if tg_op = 'INSERT' then
		new.created_at := coalesce(new.created_at, now());
		new.created_by := coalesce(new.created_by, auth.uid());
	end if;
	new.updated_at := now();
	new.modified_by := auth.uid();
	return new;
end;
$$;

drop trigger if exists ceramic_record_audit_fields on public.ceramic_records;
create trigger ceramic_record_audit_fields
before insert or update on public.ceramic_records
for each row execute function public.set_ceramic_record_audit_fields();
```

The app displays these audit values in Review & Save once they have been returned by Supabase, and includes them in CSV exports. `created_by` and `modified_by` are Supabase user IDs; use **Authentication → Users** to match an ID to an account email.

Use **Sign in** in the application header with a Supabase email and password. Create team accounts in **Authentication → Users** and disable public sign-ups in **Authentication → Providers → Email**. After sign-in, the session restores automatically and the shared records load into the session log. A record saved while signed out remains in the browser log and can still be exported as CSV.

Signed-out users see only their current local browser-session records. Signed-in users see the shared Supabase records and can select **Edit** to reopen a record in the full wizard. Saving edits updates the existing record instead of creating a duplicate; **Cancel Edit** discards the working copy. The update policy above permits all authenticated users to edit shared records. If using the `ceramic_access` allowlist, replace each `true` in that policy with `public.can_access_ceramics('edit')`.

When a user follows a Supabase password-recovery email link, the app detects the recovery session and opens a **Set a new password** form. The password is sent only to Supabase's authentication service; it is not stored in the app.

## Scope

Ware types and identification tips are prioritized for assemblages from **Southern Ontario, late 1800s – mid 1900s**:
most commonly Whiteware, Ironstone/White Granite, Bone China, and American Stoneware.
All 64 DAACS ware types are available in the full dropdown.
