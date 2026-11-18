import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddJubirWorkspaceSessionAuth1794900000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_workspace" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "name" varchar(150) NOT NULL,
                "description" text,
                "store_id" uuid,
                "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jubir_workspace" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_workspace_org" FOREIGN KEY ("organization_id") REFERENCES "jubir_organization"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_jubir_workspace_store" FOREIGN KEY ("store_id") REFERENCES "jubir_store"("id") ON DELETE SET NULL
            );
        `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_workspace_org" ON "jubir_workspace" ("organization_id");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_workspace_store" ON "jubir_workspace" ("store_id");`)

        await queryRunner.query(`ALTER TABLE "jubir_user" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;`)
        await queryRunner.query(
            `ALTER TABLE "jubir_user" ADD CONSTRAINT "FK_jubir_user_workspace" FOREIGN KEY ("workspace_id") REFERENCES "jubir_workspace"("id") ON DELETE SET NULL;`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_user_workspace" ON "jubir_user" ("workspace_id");`)

        await queryRunner.query(`ALTER TABLE "jubir_organization" ADD COLUMN IF NOT EXISTS "subscription_id" varchar(255);`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" ADD COLUMN IF NOT EXISTS "subscription_plan" varchar(50);`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" ADD COLUMN IF NOT EXISTS "subscription_status" varchar(50);`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" ADD COLUMN IF NOT EXISTS "subscription_expires_at" timestamp;`)

        await queryRunner.query(`ALTER TABLE "jubir_resource_mapping" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_mapping_workspace" ON "jubir_resource_mapping" ("workspace_id");`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jubir_session" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "refresh_token_hash" varchar(255) NOT NULL,
                "user_agent" varchar(255),
                "ip_address" varchar(100),
                "expires_at" timestamp NOT NULL,
                "revoked_at" timestamp,
                "created_date" timestamp NOT NULL DEFAULT now(),
                "updated_date" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jubir_session" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jubir_session_user" FOREIGN KEY ("user_id") REFERENCES "jubir_user"("id") ON DELETE CASCADE
            );
        `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_session_user" ON "jubir_session" ("user_id");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jubir_session_token" ON "jubir_session" ("refresh_token_hash");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_session";`)
        await queryRunner.query(`ALTER TABLE "jubir_resource_mapping" DROP COLUMN IF EXISTS "workspace_id";`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" DROP COLUMN IF EXISTS "subscription_expires_at";`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" DROP COLUMN IF EXISTS "subscription_status";`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" DROP COLUMN IF EXISTS "subscription_plan";`)
        await queryRunner.query(`ALTER TABLE "jubir_organization" DROP COLUMN IF EXISTS "subscription_id";`)
        await queryRunner.query(`ALTER TABLE "jubir_user" DROP COLUMN IF EXISTS "workspace_id";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "jubir_workspace";`)
    }
}
