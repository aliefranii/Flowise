import { Args } from '@oclif/core'
import { QueryRunner } from 'typeorm'
import * as DataSource from '../DataSource'
import { hashPassword } from '../jubir-rbac/auth/password'
import { validatePassword } from '../jubir-rbac/auth/validation'
import { JubirUser } from '../jubir-rbac/entities'
import logger from '../utils/logger'
import { BaseCommand } from './base'

export default class user extends BaseCommand {
    static args = {
        email: Args.string({
            description: 'Email address to search for in the user database'
        }),
        password: Args.string({
            description: 'New password for that user'
        })
    }

    async run(): Promise<void> {
        const { args } = await this.parse(user)

        let queryRunner: QueryRunner | undefined
        try {
            logger.info('Initializing DataSource')
            const dataSource = await DataSource.getDataSource()
            await dataSource.initialize()

            queryRunner = dataSource.createQueryRunner()
            await queryRunner.connect()

            if (args.email && args.password) {
                logger.info('Running resetPassword')
                await this.resetPassword(queryRunner, args.email, args.password)
            } else {
                logger.info('Running listUserEmails')
                await this.listUserEmails(queryRunner)
            }
        } catch (error) {
            logger.error(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
            await this.gracefullyExit()
        }
    }

    async listUserEmails(queryRunner: QueryRunner) {
        logger.info('Listing all user emails')
        const users = await queryRunner.manager.find(JubirUser, {
            select: ['email']
        })

        const emails = users.map((u) => u.email)
        logger.info(`Email addresses: ${emails.join(', ')}`)
        logger.info(`Email count: ${emails.length}`)
        logger.info('To reset user password, run the following command: pnpm user --email "myEmail" --password "myPassword"')
    }

    async resetPassword(queryRunner: QueryRunner, email: string, password: string) {
        const normalizedEmail = email.toLowerCase().trim()
        logger.info(`Finding user by email: ${normalizedEmail}`)
        const foundUser = await queryRunner.manager.findOne(JubirUser, {
            where: { email: normalizedEmail }
        })
        if (!foundUser) throw new Error(`User not found with email: ${normalizedEmail}`)

        validatePassword(password)

        foundUser.passwordHash = hashPassword(password)
        await queryRunner.manager.save(foundUser)
        logger.info(`Password reset for user: ${normalizedEmail}`)
    }
}
