import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// space_id is required by the application: every write goes through a Scope, and
// migration 0009 backfilled the rows written before that. It is deliberately not
// NOT NULL in SQLite -- adding the constraint means rebuilding the table, and D1
// enforces foreign keys through the DROP, which cascades child rows away.

// Not an auth table: Cloudflare Access owns identity. This only remembers the
// email behind an owner id so members can be shown by name instead of a UUID.
export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  email: text("email"),
  updatedAt: text("updated_at").notNull(),
});

export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull().unique(),
  viewerInviteCode: text("viewer_invite_code").notNull().unique(),
  editorInviteCode: text("editor_invite_code").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const spaceMembers = sqliteTable(
  "space_members",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    joinedAt: text("joined_at").notNull(),
  },
  (table) => [uniqueIndex("space_members_space_owner_idx").on(table.spaceId, table.ownerId)],
);

export const mediaObjects = sqliteTable(
  "media_objects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    spaceId: text("space_id").notNull(),
    kind: text("kind", { enum: ["image", "sticker", "thumbnail"] }).notNull(),
    r2Key: text("r2_key").notNull().unique(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("media_objects_owner_id_idx").on(table.ownerId),
    index("media_objects_space_id_idx").on(table.spaceId),
  ],
);

export const stickers = sqliteTable(
  "stickers",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    spaceId: text("space_id").notNull(),
    mediaObjectId: text("media_object_id")
      .notNull()
      .references(() => mediaObjects.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("stickers_owner_id_idx").on(table.ownerId),
    index("stickers_space_id_idx").on(table.spaceId),
  ],
);

export const diaryEntries = sqliteTable(
  "diary_entries",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    spaceId: text("space_id").notNull(),
    entryDate: text("entry_date").notNull(),
    documentJson: text("document_json", { mode: "json" }).notNull(),
    previewSnippet: text("preview_snippet"),
    previewThumbnailMediaObjectId: text("preview_thumbnail_media_object_id").references(
      () => mediaObjects.id,
    ),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("diary_entries_space_date_idx").on(table.spaceId, table.entryDate)],
);
