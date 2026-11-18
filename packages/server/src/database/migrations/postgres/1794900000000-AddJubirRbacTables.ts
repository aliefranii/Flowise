import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddJubirRbacTables1794900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_region" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(100) NOT NULL,
                "code" varchar(50) NOT NULL,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_jubir_region_code" UNIQUE ("code"),
                CONSTRAINT "PK_jubir_region" PRIMARY KEY ("id")
            );
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_organization" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(150) NOT NULL,
                "region_id" uuid NOT NULL,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jubir_organization" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_org_region" FOREIGN KEY ("region_id") REFERENCES "jubir_region"("id") ON DELETE CASCADE
            );
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_store" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(150) NOT NULL,
                "organization_id" uuid NOT NULL,
                "address" text,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jubir_store" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_store_org" FOREIGN KEY ("organization_id") REFERENCES "jubir_organization"("id") ON DELETE CASCADE
            );
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_channel" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "store_id" uuid NOT NULL,
                "platform" varchar(20) NOT NULL DEFAULT 'WEB',
                "webhook_token" varchar(255) NOT NULL,
                "active_chatflow_id" varchar(100),
                "is_active" boolean NOT NULL DEFAULT true,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_jubir_channel_token" UNIQUE ("webhook_token"),
                CONSTRAINT "PK_jubir_channel" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_channel_store" FOREIGN KEY ("store_id") REFERENCES "jubir_store"("id") ON DELETE CASCADE
            );
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(150) NOT NULL,
                "email" varchar(150) NOT NULL,
                "password_hash" varchar(255) NOT NULL,
                "role" varchar(50) NOT NULL DEFAULT 'USER',
                "region_id" uuid,
                "organization_id" uuid,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_jubir_user_email" UNIQUE ("email"),
                CONSTRAINT "PK_jubir_user" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_user_region" FOREIGN KEY ("region_id") REFERENCES "jubir_region"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_jubir_user_org" FOREIGN KEY ("organization_id") REFERENCES "jubir_organization"("id") ON DELETE SET NULL
            );
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_resource_mapping" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "resource_id" varchar(100) NOT NULL,
                "resource_type" varchar(50) NOT NULL,
                "region_id" uuid,
                "organization_id" uuid,
                "store_id" uuid,
                "created_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jubir_resource_mapping" PRIMARY KEY ("id")
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_mapping_res_id" ON "jubir_resource_mapping" ("resource_id");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_mapping_region" ON "jubir_resource_mapping" ("region_id");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_mapping_org" ON "jubir_resource_mapping" ("organization_id");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_resource_mapping";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_user";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_channel";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_store";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_organization";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_region";`)
    }
}
