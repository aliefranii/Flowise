import { MigrationInterface, QueryRunner } from 'typeorm'

export class BackfillJubirResourceMapping1794900000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "jubir_resource_mapping" a
            USING "jubir_resource_mapping" b
            WHERE a."ctid" < b."ctid"
              AND a."resource_type" = b."resource_type"
              AND a."resource_id" = b."resource_id";
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_jubir_mapping_type_res_id"
            ON "jubir_resource_mapping" ("resource_type", "resource_id");
        `)

        await queryRunner.query(`
            INSERT INTO "jubir_resource_mapping" ("resource_id", "resource_type", "region_id", "organization_id", "workspace_id", "store_id")
            SELECT cf."id"::varchar(100), 'CHATFLOW', o."region_id", w."organization_id", w."id", w."store_id"
            FROM "chat_flow" cf
            LEFT JOIN "jubir_workspace" w ON w."id"::text = cf."workspaceId"
            LEFT JOIN "jubir_organization" o ON o."id" = w."organization_id"
            ON CONFLICT ("resource_type", "resource_id") DO NOTHING;
        `)

        await queryRunner.query(`
            INSERT INTO "jubir_resource_mapping" ("resource_id", "resource_type", "region_id", "organization_id", "workspace_id", "store_id")
            SELECT c."id"::varchar(100), 'CREDENTIAL', o."region_id", w."organization_id", w."id", w."store_id"
            FROM "credential" c
            LEFT JOIN "jubir_workspace" w ON w."id"::text = c."workspaceId"
            LEFT JOIN "jubir_organization" o ON o."id" = w."organization_id"
            ON CONFLICT ("resource_type", "resource_id") DO NOTHING;
        `)

        await queryRunner.query(`
            INSERT INTO "jubir_resource_mapping" ("resource_id", "resource_type", "region_id", "organization_id", "workspace_id", "store_id")
            SELECT ds."id"::varchar(100), 'DOCUMENT_STORE', o."region_id", w."organization_id", w."id", w."store_id"
            FROM "document_store" ds
            LEFT JOIN "jubir_workspace" w ON w."id"::text = ds."workspaceId"
            LEFT JOIN "jubir_organization" o ON o."id" = w."organization_id"
            ON CONFLICT ("resource_type", "resource_id") DO NOTHING;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_jubir_mapping_type_res_id";`)
    }
}
