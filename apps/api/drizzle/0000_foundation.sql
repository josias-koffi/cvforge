CREATE TABLE "data_imports" (
	"name" text PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
