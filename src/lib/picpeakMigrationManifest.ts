/**
 * ---
 * file: src/lib/picpeakMigrationManifest.ts
 * project: earthandhoney
 * purpose: AC-15.6 — records the git blob SHA-1 of every migration file
 *          under vendor/picpeak/backend/migrations exactly as it existed at
 *          the pinned upstream commit (see PICPEAK_UPSTREAM.md). Captured at
 *          vendor time directly from the vendored tree, and cross-checked
 *          against the pinned commit's GitHub tree API response so this
 *          manifest is a faithful fingerprint of what upstream actually
 *          shipped, not just of whatever happens to be on disk.
 *
 *          AC-33.5.2.1 adds a second, explicitly distinct lane to this same
 *          list: entries with `origin: 'fork'` fingerprint a migration this
 *          project added on top of the pin, never one upstream shipped.
 *          Upstream's own migrations (no `origin` field — the default and
 *          by far the common case, so the ~130 pre-existing entries below
 *          are untouched) are still fingerprinted exactly as before, and
 *          `verifyMigrationsUnmodified` (picpeakMigrationIntegrity.ts) still
 *          fails an edit to any of them the same way it always has. A
 *          `fork`-origin entry additionally requires a `FORK_CHANGELOG.md`
 *          record naming it — see picpeakMigrationIntegrity.ts and
 *          vendor/README.md for what enforces that.
 * created-by: dev-team
 * related-story: US-15, US-33
 * related-ac: 15.6, 33.5.2.1
 * ---
 */

/**
 * Path is relative to vendor/picpeak/. Hash is the git blob SHA-1
 * (`git hash-object <file>`), which is identical to the blob `sha` GitHub's
 * Trees API reports for the same file at the same commit.
 *
 * `origin` distinguishes the two lanes this manifest fingerprints:
 * - omitted (the default): a pinned-upstream migration, fingerprinted
 *   against the commit GitHub actually shipped at `PICPEAK_PINNED_COMMIT`.
 * - `'fork'`: a migration this project added on top of that pin. Its blob
 *   SHA is still enforced (a fork migration that has already shipped must
 *   not be edited either — Fork Discipline's no-edit rule is not only an
 *   upstream rule), but it is additionally required to be named in
 *   `FORK_CHANGELOG.md`, which upstream entries are not.
 */
export interface MigrationManifestEntry {
  path: string
  blobSha: string
  origin?: 'fork'
}

export const PICPEAK_PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

export const PICPEAK_MIGRATION_MANIFEST: MigrationManifestEntry[] = [
  { path: 'backend/migrations/041_add_logo_customization_settings.js', blobSha: '09358b3e882d1729879f2dfa9206d56a5dfa9d5c' },
  { path: 'backend/migrations/README.md', blobSha: '3adfceb6df83374405cb717a35410bb7d9f0f55e' },
  { path: 'backend/migrations/core/001_init.js', blobSha: '654d2e096f43636b4556d7d282199279d7494bc6' },
  { path: 'backend/migrations/core/029_add_backup_service_tables.js', blobSha: 'fcba79db8aef653506679468b6e606d443489a11' },
  { path: 'backend/migrations/core/030_add_database_backup_tables.js', blobSha: 'b5faf065af4268b65f3cce930284051d1f6175df' },
  { path: 'backend/migrations/core/031_add_backup_manifest_columns.js', blobSha: '0d32c193f10a2a0661ba0e9a891bcf864cd4dedd' },
  { path: 'backend/migrations/core/032_add_restore_runs_table.js', blobSha: '0b4ce256dc4e4cc520904d0a783f5df4000df092' },
  { path: 'backend/migrations/core/033_add_gallery_feedback.js', blobSha: 'e6c692e32ac2e8a7db2d5f4b6d579896415baa26' },
  { path: 'backend/migrations/core/034_add_version_to_backups.js', blobSha: 'a6fe91bc90765027438018a7b153c32cefecc9a0' },
  { path: 'backend/migrations/core/035_enhance_backup_system.js', blobSha: 'dc4ca07404fa6a1348bb12c4b4885fd399a7dda8' },
  { path: 'backend/migrations/core/036_fix_missing_columns.js', blobSha: '14ec0bca74423125ec39dd3c80e9556c336d59ad' },
  { path: 'backend/migrations/core/037_add_download_controls.js', blobSha: '5e16f219b700bcc21b03a22d7a866f4ba30784d8' },
  { path: 'backend/migrations/core/038_add_enhanced_image_protection.js', blobSha: '92ca9aec91fa6775287619d2f90cbc62670f1dd1' },
  { path: 'backend/migrations/core/039_add_security_logging.js', blobSha: 'd5095dcfc7cbbeb732ed155f01733e7781d4465f' },
  { path: 'backend/migrations/core/040_add_thumbnail_settings.js', blobSha: 'e9dcd70fffc596a527d26875eb7b294fc7a5734f' },
  { path: 'backend/migrations/core/041_add_external_media.js', blobSha: 'eaab0bff495022af24fd91ab49a0dadb884e587d' },
  { path: 'backend/migrations/core/042_backfill_event_upload_columns.js', blobSha: '47b3375d316905efc6f2aa47104df07513e7c428' },
  { path: 'backend/migrations/core/043_add_public_site_settings.js', blobSha: 'ff684e46782775ce62bb6d8ba45e4228199f148b' },
  { path: 'backend/migrations/core/044_add_event_password_toggle.js', blobSha: '2d26d5746edcde809f033ba46b52ef2914a2a6c4' },
  { path: 'backend/migrations/core/045_add_max_files_per_upload_setting.js', blobSha: 'f0d64c78f76ee7661e8c3c6128d567c399a2a7bb' },
  { path: 'backend/migrations/core/046_add_customer_contact_fields.js', blobSha: 'a2ad0f3f43704ab9144417849b35433fd9bb7d3c' },
  { path: 'backend/migrations/core/047_add_tls_reject_unauthorized.js', blobSha: '0cf86af139398429471437345b43db3ca897df40' },
  { path: 'backend/migrations/core/048_add_video_support.js', blobSha: 'a8a92e0739c3aba169a20121eb540da2db335d3d' },
  { path: 'backend/migrations/core/049_add_slug_redirects.js', blobSha: 'a83c6866094e33a5b9f28531c22bd676d4c826c1' },
  { path: 'backend/migrations/core/050_add_optional_event_fields_settings.js', blobSha: '3d1a1ffc9f38e47584d3a074259085e666e750f1' },
  { path: 'backend/migrations/core/051_add_photo_filter_indexes.js', blobSha: '6459db3fbd9ef0398546f766909ef92d2792fced' },
  { path: 'backend/migrations/core/052_add_css_templates.js', blobSha: '5006a4bdd2092fa6ed6f6968f22647a4ff0a637c' },
  { path: 'backend/migrations/core/053_add_liquid_glass_templates.js', blobSha: 'af19bdd0d1f0cd81afd02ac77fd5495fa747d4be' },
  { path: 'backend/migrations/core/054_add_roles_table.js', blobSha: '28026ed013a684b4ff6e4932d8dedefc9cc864be' },
  { path: 'backend/migrations/core/055_add_permissions_table.js', blobSha: 'c936773476c9be47ead7e8625962c9b42c2ac88d' },
  { path: 'backend/migrations/core/056_add_role_permissions_table.js', blobSha: '8288558f30a1db3b3aab2b945565eca2955ff012' },
  { path: 'backend/migrations/core/057_add_role_to_admin_users.js', blobSha: 'c418c186a1af46a7e964654f93c3ef03611124d4' },
  { path: 'backend/migrations/core/058_add_admin_invitations_table.js', blobSha: '9b97c7bdaefb7ed5efe995f9781055929375ede5' },
  { path: 'backend/migrations/core/059_add_admin_email_templates.js', blobSha: '6f2034f1468771a874fa3fb5ce223813e2a74517' },
  { path: 'backend/migrations/core/060_add_events_created_by.js', blobSha: '43f8431d1f6ac4d3c27a6746db229b6c62de5c05' },
  { path: 'backend/migrations/core/061_add_event_types_table.js', blobSha: '088198938b910acbcbff3bac2295d06078fa41f0' },
  { path: 'backend/migrations/core/061_add_optional_date_expiration_settings.js', blobSha: 'b1d236a470e5638cd9d8968258a8fc632c7b3e37' },
  { path: 'backend/migrations/core/061_add_watermark_path.js', blobSha: '454a208887c0ed1618eaa693df74a6ee0e2bb872' },
  { path: 'backend/migrations/core/062_add_hero_logo_settings.js', blobSha: '1c8f651ed9d78c65804da41e84bb0c83febc0d5d' },
  { path: 'backend/migrations/core/062_add_original_filename.js', blobSha: '2025a19a6aee3f864d0078af3ca2b6382c1a78bb' },
  { path: 'backend/migrations/core/063_add_event_custom_logo.js', blobSha: '5714d64388b295751240d08de66a849da39e7661' },
  { path: 'backend/migrations/core/064_backfill_photo_dimensions.js', blobSha: '4d97f3f1a5e0d736337c1a266407505576dec98c' },
  { path: 'backend/migrations/core/065_add_header_style.js', blobSha: '334ef70b76638fd56fa6ca96f9654f5cebef5b98' },
  { path: 'backend/migrations/core/066_add_hero_anchor_and_category_hero.js', blobSha: '57ededa84134011b54f90064dfa6671ccf79f406' },
  { path: 'backend/migrations/core/067_expand_hero_image_anchor.js', blobSha: 'ef496949ba95c314bbba61edac6599c5c32fd54f' },
  { path: 'backend/migrations/core/068_add_seo_robots_settings.js', blobSha: '7cd59048134265b4abe4929d9670be83808146de' },
  { path: 'backend/migrations/core/069_add_hero_path.js', blobSha: '1c3732e4fa5dda0b95a934ee98959efe5c70f0ea' },
  { path: 'backend/migrations/core/070_add_update_notification_settings.js', blobSha: 'db9d3a5a78d37431b1369c3d99ae491811a67277' },
  { path: 'backend/migrations/core/071_add_captured_at.js', blobSha: '3187af6b5562a7070acaed7a22d402d0495d5310' },
  { path: 'backend/migrations/core/072_add_max_upload_batch_size.js', blobSha: 'abd381d98581a529da83a0ab7f104b22578f0a08' },
  { path: 'backend/migrations/core/073_make_event_emails_nullable.js', blobSha: '248b68891d0f4a26e09a963a26e8bd5e9657195f' },
  { path: 'backend/migrations/core/074_add_photo_cap.js', blobSha: 'd992fe66a1db69506f1c0eb272978d6c0c6ad145' },
  { path: 'backend/migrations/core/074_photo_visibility_client_access.js', blobSha: 'b4c42f1e82acc95a3dbe449f8cf0f88076cc6930' },
  { path: 'backend/migrations/core/075_email_template_translations.js', blobSha: '0c30d92676602f82ef24bcc3023753ff7c6132a0' },
  { path: 'backend/migrations/core/076_add_is_draft_column.js', blobSha: 'a758165220a050f274006adb3a9aa288f309e560' },
  { path: 'backend/migrations/core/077_add_default_photo_sort.js', blobSha: 'c6468903d5e934848cc35c121567c9d994340722' },
  { path: 'backend/migrations/core/078_add_guest_identity.js', blobSha: 'ef01f93db7b2d62f1c3131724c915f01eafaf164' },
  { path: 'backend/migrations/core/079_add_download_zip_cache.js', blobSha: '4c9b4b49417d010fbcaeeac75a7a8aef75d98ec4' },
  { path: 'backend/migrations/core/080_add_customer_phone.js', blobSha: 'db2c765e0ef290bbc24de1c9a879cc2bf7f0dd18' },
  { path: 'backend/migrations/core/081_add_api_tokens.js', blobSha: '000dbfb98729402b020b9fec7616999b14a7538c' },
  { path: 'backend/migrations/core/082_add_webhooks.js', blobSha: '8e63f289533e399afd815d18a248f672bd6fb30c' },
  { path: 'backend/migrations/core/083_add_presigned_and_webhook_extras.js', blobSha: 'af8cb6ec5d962b9b39ac41ed8eeec131cbc21871' },
  { path: 'backend/migrations/core/084_fix_hero_logo_position.js', blobSha: 'd687ee64a8822263f2faf69dd025e94ffc605488' },
  { path: 'backend/migrations/core/085_async_photo_processing.js', blobSha: '55d2d75ffc8648e82b03eafecdb7c8afa30d29ee' },
  { path: 'backend/migrations/core/086_migrate_non_grid_standard_to_banner.js', blobSha: '2d3340b6ec087d73c0637c9b1ae730e28785b8d0' },
  { path: 'backend/migrations/core/087_add_update_notification_test_template.js', blobSha: 'da337b455f50e5cc0a89d05cf9a75350c9e27902' },
  { path: 'backend/migrations/core/088_add_feature_flags.js', blobSha: '9f70c672288fe58370b6ec1642cd1c115a2999cc' },
  { path: 'backend/migrations/core/089_footer_overhaul.js', blobSha: 'd3e6b17c2018efb45280ba643d9ce268b6e6427d' },
  { path: 'backend/migrations/core/090_add_customer_accounts.js', blobSha: '7fa5e3e8ed90d1ec322fbcd4dd65379ecac60447' },
  { path: 'backend/migrations/core/091_add_customer_invitation_prefill.js', blobSha: 'd5b62d61ef45c89a4d370956c57d34733528dbe6' },
  { path: 'backend/migrations/core/092_customer_features_branding_resets.js', blobSha: '2f4133f6e5436d3bd80469a032d09d2e2470f079' },
  { path: 'backend/migrations/core/093_customer_feature_default_visible.js', blobSha: '72169a55b9cd7137eaa60f659d5d0cf4fd8e4015' },
  { path: 'backend/migrations/core/094_customer_invitation_email_themed_button.js', blobSha: '8894e16b14399a2a4f2582a2b6e8a075cef853a8' },
  { path: 'backend/migrations/core/095_add_customer_portal_flag.js', blobSha: 'd36c97adaab066206d0ba8b5a5a831f0557bc33a' },
  { path: 'backend/migrations/core/096_backfill_photo_dimensions_v2.js', blobSha: 'dd2fd0eb6b2b503f2475f87679ebe546d2a1554b' },
  { path: 'backend/migrations/core/097_add_clients_feature_flag.js', blobSha: '86e384d47e924baa4b135ecc93aa9e0045491542' },
  { path: 'backend/migrations/core/098_add_email_template_category.js', blobSha: 'a3e44a0cde5166c58058f8889234b1d76bcdc2e2' },
  { path: 'backend/migrations/core/099_seed_missing_email_template_translations.js', blobSha: '38c935749be9623b7675d7e8d0d7e24868c3f304' },
  { path: 'backend/migrations/core/100_backfill_email_template_subcategory.js', blobSha: 'bc8e7b564dcc41230fdf074dcd010a947071c379' },
  { path: 'backend/migrations/core/101_add_customer_gallery_assigned_template.js', blobSha: '557c400b12745783f60050da8a97dff75791a5bd' },
  { path: 'backend/migrations/core/102_add_og_image_share_enabled.js', blobSha: '48bf2a715d518ed7d864c661757ef6411f5ee89d' },
  { path: 'backend/migrations/core/103_add_promo_alignment_setting.js', blobSha: '143341ff84a93e776e9128edd9c7f267b971477f' },
  { path: 'backend/migrations/core/104_add_lightbox_preview_tier.js', blobSha: '92114345acdd862327906bc43f20e2705f8cdc62' },
  { path: 'backend/migrations/core/105_fix_backup_runs_indexes.js', blobSha: '7d3d6e907b9bc504f7c8472ebe26ae4b4d1289eb' },
  { path: 'backend/migrations/core/106_seed_es_email_template_translations.js', blobSha: '06db0e7807ce8750e2c309f9cbdc8cca6d8c6881' },
  { path: 'backend/migrations/core/107_crm_consolidated.js', blobSha: '88b4801c499128d7bb3444db5d2cc9c8709ecba7' },
  { path: 'backend/migrations/core/108_seed_sl_email_template_translations.js', blobSha: '50c61683115e406bc1aa27195a93cc2a78a552d9' },
  { path: 'backend/migrations/core/109_add_backup_paths.js', blobSha: '544f0151e2045cab9ca38a98da2a83ee0f628b4f' },
  { path: 'backend/migrations/core/110_normalize_country_code_fl_to_li.js', blobSha: '26cba940bf4d4f89ed6863428ab499be787c9478' },
  { path: 'backend/migrations/core/111_backfill_imported_invoice_dates.js', blobSha: '470680678be355f79503e3c8b67dc0c6ea53daa1' },
  { path: 'backend/migrations/core/112_add_customer_skonto_disabled.js', blobSha: '8998254700481d22dff183bb194ef9960ccf8ed5' },
  { path: 'backend/migrations/core/113_add_default_hourly_rate.js', blobSha: '4b9a3c018a806e55ba4b5c1f17ee8f1ca6f4524d' },
  { path: 'backend/migrations/core/114_add_business_hours_to_profile.js', blobSha: '7fcd816722a8536c55d444d02e07b4a28ff64b98' },
  { path: 'backend/migrations/core/115_add_quote_decline_reason.js', blobSha: '9915b0a3dfde30212bbcfc9cb6eaefdcd5078d7d' },
  { path: 'backend/migrations/core/116_backfill_imported_paid_amount.js', blobSha: '07677019431f654837d4027f8541a1753a82a034' },
  { path: 'backend/migrations/core/117_add_projects.js', blobSha: '98417e27d83a4714a05bb447b146aca8e8e0d5b7' },
  { path: 'backend/migrations/core/118_add_project_id_to_hour_entries.js', blobSha: '457faea8ce8c58f0331ef17176fa430a4c34a167' },
  { path: 'backend/migrations/core/119_add_rendered_html_to_email_queue.js', blobSha: '73309d16d0c61c193e1e6d7a7d1151f6275eaee4' },
  // --- fork-added migrations (origin: 'fork') — never upstream's, each one
  // named in FORK_CHANGELOG.md; see picpeakMigrationIntegrity.ts for the
  // lane's enforcement. ---
  {
    path: 'backend/migrations/core/120_add_inquiry_notification_email_template.js',
    blobSha: '0009cdf5f3d958ab6c20f8134ef030bdd7859de3',
    origin: 'fork',
  },
  {
    path: 'backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js',
    blobSha: '7afd845ecc9a5969a40a67fbdf5d89af3c8452f4',
    origin: 'fork',
  },
  { path: 'backend/migrations/helpers.js', blobSha: 'a2227cd7d89075e89d1067d98af376681b19a673' },
  { path: 'backend/migrations/legacy/004_add_categories_and_cms.js', blobSha: 'a67f9526099c1f99b957c3563193edee3458b842' },
  { path: 'backend/migrations/legacy/006_add_photo_counter_to_categories.js', blobSha: '4f4a46a6671ac1cac2b4977d2602a907a958ffa0' },
  { path: 'backend/migrations/legacy/007_add_read_at_to_activity_logs.js', blobSha: 'd4333bd33a0a9042fa8122ad1bb1c6faa3f00b3c' },
  { path: 'backend/migrations/legacy/008_add_language_support_to_email_templates.js', blobSha: 'd26045041f497ddca9ead3ff82a2827798f70c0c' },
  { path: 'backend/migrations/legacy/009_update_german_email_templates.js', blobSha: '9c31403c1ed7e8342a652c154fbb8357b45ea436' },
  { path: 'backend/migrations/legacy/010_add_missing_email_templates.js', blobSha: 'c67727ffacd6523218c74aa1b6f6b933e7a450ed' },
  { path: 'backend/migrations/legacy/011_add_user_upload_settings.js', blobSha: 'a796fa716944219d1db85ec35986d439e7400b52' },
  { path: 'backend/migrations/legacy/012_add_hero_photo_id.js', blobSha: '608d75d2b34a3735884a764af8586c5a611f2bd5' },
  { path: 'backend/migrations/legacy/013_fix_email_links_and_date_format.js', blobSha: 'fa12478225269fdbd69090c8b62f65b1f6f4f350' },
  { path: 'backend/migrations/legacy/014_add_default_welcome_message.js', blobSha: 'c45543750eac42f3de4028d2b5a18911ea037798' },
  { path: 'backend/migrations/legacy/014_add_host_name_to_events_duplicate.js', blobSha: '220105bde980d6a03607f1438dc591047ec3e88d' },
  { path: 'backend/migrations/legacy/015_add_login_attempts_table.js', blobSha: '8e0fc7f71696ca7d0d8e0ffc985c383dd601aaf6' },
  { path: 'backend/migrations/legacy/016_add_auth_security_columns.js', blobSha: '118530b90a016480a8333278d2b8d2104571a8e2' },
  { path: 'backend/migrations/legacy/017_add_token_revocation_tables.js', blobSha: '4789fa57830a6aa3842043d3419e374c25000131' },
  { path: 'backend/migrations/legacy/018_add_created_at_to_email_queue.js', blobSha: 'c870c8b532c6c32a926e601b2d360929476b4aad' },
  { path: 'backend/migrations/legacy/019_fix_email_templates_columns.js', blobSha: 'bee9f9d2cc6b0d2c1c7241f225bdd896d630854f' },
  { path: 'backend/migrations/legacy/020_ensure_default_email_templates.js', blobSha: 'e11a0a6e77888a867d5213f27d090b29d0ac9248' },
  { path: 'backend/migrations/legacy/021_add_default_cms_pages.js', blobSha: '29c17fba9a8ce1e54ef01a50b61fa7befa444312' },
  { path: 'backend/migrations/legacy/022_fix_json_columns.js', blobSha: '752b02caedfaa4233f88bcd22bd45d5facfa0f22' },
  { path: 'backend/migrations/legacy/023_ensure_postgres_compatibility.js', blobSha: '40e30377c7c01cd126489a7a0175b67790984d60' },
  { path: 'backend/migrations/legacy/024_fix_boolean_compatibility.js', blobSha: 'd31147a3acb33c05d5481bb372cf5787157b6b15' },
  { path: 'backend/migrations/legacy/025_fix_email_queue_updated_at.js', blobSha: 'eab064ff6ef1693f5fc290250a1407543bc154b6' },
  { path: 'backend/migrations/legacy/026_fix_german_email_templates.js', blobSha: '51276a6a0cee9d006e1c43708c8d37d941f157b4' },
  { path: 'backend/migrations/legacy/027_add_language_preferences.js', blobSha: '7640e38863cefa2d5439cb60abca833b693474f8' },
  { path: 'backend/migrations/legacy/027_add_rate_limit_settings_duplicate.js', blobSha: 'f26621ad6fe3bc26ab5dee58ee88131ed7aa7b60' },
  { path: 'backend/migrations/legacy/028_update_english_templates_to_match_german.js', blobSha: '432824d8575db48f4db8cefc35e0dcb424ba9488' },
  { path: 'backend/migrations/run-migrations-safe.js', blobSha: 'eeeca33507adcbea8d93fe430af4a626a951f693' },
  { path: 'backend/migrations/run-migrations.js', blobSha: '86c9114f59ea269566ada2ca9008e117cc0a0a34' },
]

