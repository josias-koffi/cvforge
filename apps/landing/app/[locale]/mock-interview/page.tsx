import { featureMetadata, featureRoute } from "@/lib/feature-route"

// Served at /en/mock-interview and, through a rewrite in next.config, at its French slug.
export const generateMetadata = featureMetadata("interview")

export default featureRoute("interview")
