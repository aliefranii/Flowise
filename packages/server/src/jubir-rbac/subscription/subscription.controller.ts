import { Request, Response } from 'express'
import Stripe from 'stripe'
import { getDataSource } from '../../DataSource'
import { JubirOrganization } from '../entities'
import { isSubscriptionActive } from '../middlewares/jubirSubscription'

export async function getSubscription(req: Request, res: Response) {
    const org = await getDataSource()
        .getRepository(JubirOrganization)
        .findOne({ where: { id: req.jubirUser!.organizationId! } })
    if (!org) return res.status(404).json({ message: 'Organisasi tidak ditemukan' })
    return res.json({
        subscriptionId: org.subscriptionId,
        plan: org.subscriptionPlan,
        status: org.subscriptionStatus,
        expiresAt: org.subscriptionExpiresAt,
        active: isSubscriptionActive(org)
    })
}

export async function createCheckoutSession(req: Request, res: Response) {
    const priceId = req.body.priceId
    if (!priceId || typeof priceId !== 'string') return res.status(400).json({ message: 'priceId wajib diisi' })

    const orgRepo = getDataSource().getRepository(JubirOrganization)
    const org = await orgRepo.findOne({ where: { id: req.jubirUser!.organizationId! } })
    if (!org) return res.status(404).json({ message: 'Organisasi tidak ditemukan' })
    if (isSubscriptionActive(org)) return res.status(409).json({ message: 'Langganan sudah aktif' })

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeKey) return res.status(500).json({ message: 'Stripe belum dikonfigurasi' })

    const stripe = new Stripe(stripeKey, {})
    const customer = await stripe.customers.create({
        email: req.jubirUser!.email,
        metadata: { jubirOrganizationId: org.id }
    })

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: process.env.JUBIR_SUBSCRIPTION_SUCCESS_URL?.trim() || '/subscription?status=success',
        cancel_url: process.env.JUBIR_SUBSCRIPTION_CANCEL_URL?.trim() || '/subscription?status=cancel',
        client_reference_id: org.id,
        metadata: { jubirOrganizationId: org.id }
    })

    return res.json({ checkoutUrl: session.url })
}

export async function stripeWebhook(req: Request, res: Response) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    const signature = req.headers['stripe-signature']
    if (!secret || !signature) return res.status(400).json({ message: 'Webhook tidak valid' })

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeKey) return res.status(500).json({ message: 'Stripe belum dikonfigurasi' })

    const stripe = new Stripe(stripeKey, {})
    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, secret)
    } catch (error: any) {
        return res.status(400).json({ message: `Webhook signature tidak valid: ${error.message}` })
    }

    const orgRepo = getDataSource().getRepository(JubirOrganization)

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.jubirOrganizationId
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (organizationId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const item = subscription.items.data[0]
            const plan = typeof item?.price.product === 'string' ? item.price.product : item?.price.product?.id
            const expiresAt = new Date((subscription as { current_period_end?: number }).current_period_end! * 1000)
            await orgRepo.update(
                { id: organizationId },
                {
                    subscriptionId,
                    subscriptionPlan: plan,
                    subscriptionStatus: subscription.status.toUpperCase(),
                    subscriptionExpiresAt: expiresAt
                }
            )
        }
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription
        await orgRepo.update({ subscriptionId: subscription.id }, { subscriptionStatus: subscription.status.toUpperCase() })
    }

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription
        const expiresAt = new Date((subscription as { current_period_end?: number }).current_period_end! * 1000)
        await orgRepo.update(
            { subscriptionId: subscription.id },
            {
                subscriptionStatus: subscription.status.toUpperCase(),
                subscriptionExpiresAt: expiresAt
            }
        )
    }

    return res.json({ received: true })
}
