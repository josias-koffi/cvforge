import { featureMetadata, featureRoute } from "@/lib/feature-route"

// Served at /en/companies-hiring and, through a rewrite in next.config, at its French slug.
export const generateMetadata = featureMetadata("companies_market")

export default featureRoute("companies_market")
