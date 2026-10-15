-- ==============================================================================

-- SEED SCRIPT: COMPLETE ITEMS MASTER (from items.xlsx)

-- Target Table: public.items

-- ==============================================================================


INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-1', 'Transport', '996511', 'Transportation', 6, 6, 12, 12, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-2', 'RDF', '3825', 'Refuse Derived Fuel', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-3', 'PLYWOOD WASTE', '4707', 'PLYWOOD WASTE', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-4', 'SHREDDED RDF', '3825', 'SHREDDED RDF', 9, 0, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-5', 'PLASTIC WASTE', '3925', 'PLASTIC WASTE', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-6', 'Shredder Blade', '84749000', 'Metal Blade', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-7', 'AGRO WASTE', '1213', 'Agricultural waste from farms', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-8', 'EPR Credit Cat 2', '998599', 'EPR Credit (Category 2)', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-9', 'MSW', '3825', 'Municipal Solid Waste', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-10', 'PAPER WASTE', '4707', 'Paper Waste', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-11', 'METAL WASTE', '7204', 'Metal Scrap Waste', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-12', 'PLASTIC WASTE (5%)', '3925', 'Plastic waste (Concessional 5% GST rate)', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-13', 'SOIL ANALYSIS', '998346', 'Laboratory testing and soil chemical analysis', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-14', 'LEACHATE ANALYSIS', '998346', 'Laboratory testing and leachate chemical analysis', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-15', 'Analysis of Legacy MSW', '998346', 'Physical Characterisation and Heavy Metals testing for Legacy MSW', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-16', 'Analysis of segregated RDF', '998346', 'Physical Characterization, Moisture, Ash, Net Calorific Value for RDF', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-17', '90 KW VFD Drives', '85044090', '90 KW Variable Frequency Drive electrical speed controller', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-18', 'MLP', '38251000', 'Multi-Layered Plastic waste material', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-19', 'Odour Control Chemical', '7381600', 'Specialized plant bio-chemical for waste odour suppression', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-20', 'EPR credit', '998346', 'Extended Producer Responsibility certificate credits', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-21', 'Blades for Shredder Model TD912, MOC : Hardox 500', '84749000', 'Heavy duty shredder blades Hardox 500 alloy steel for Model TD912', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-22', 'Non Woven Geotextile Fabric', '560290', 'Non Woven Geotextile Fabric sheet for landfill & civil filtration', 6, 6, 12, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-23', 'Black HDPE Poly Sheet', '39201099', 'Black High Density Polyethylene containment sheet', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-24', 'Installation of Geomembrane', '995419', 'Laying, jointing and installation service for Geomembrane liners', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-25', 'Consultancy Service', '998399', 'Technical environmental consultancy and invoice uploading', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-26', 'Over Band Magnetic Separator', '85051190', 'Industrial suspension magnetic separator for conveyor scrap separation', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-27', 'Safety Jacket with 2 logo 120 GSM', '6210', 'High-visibility safety jackets 120 GSM (Green/Orange)', 2.5, 2.5, 5, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-28', 'Safety Helmet with Rechant logo', '6506', 'Industrial safety helmets with logo branding (White/Yellow)', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-29', 'Twin Shaft Shredder', '8477800000', 'Heavy industrial twin shaft shredder machine for solid waste', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-30', 'Veneer Chipper Machine Cutting Fly Knife', '84659100', 'High speed alloy cutting fly knife blade for veneer chipper', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-31', 'Maintenance of Shredder Blades', '123456', 'Resharpening, hardfacing and maintenance service of shredder blades', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-32', 'Installation of Geotextile', '995419', 'Site laying, anchoring and installation work for Geotextile fabric', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    'ITM-33', 'Installation of Clay Liner', '995419', 'Compacted clay barrier liner installation and grading work', 9, 9, 18, 0, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();
