import { featureMetadata, featureRoute } from "@/lib/feature-route"

// Served at /en/daily-job-offers and, through a rewrite in next.config, at its French slug.
export const generateMetadata = featureMetadata("daily_offers")

export default featureRoute("daily_offers")
